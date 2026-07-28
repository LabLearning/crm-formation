#!/usr/bin/env node
/**
 * Crée, pour CHAQUE formation, la batterie de questionnaires Qualiopi manquants :
 *   - positionnement (Ind.17) : auto-évaluation dérivée des objectifs
 *   - entree (diagnostic)      : copie du QCM d'acquis (pré-test = post-test)
 *   - satisfaction_chaud (30)  : modèle standard
 *   - satisfaction_froid (31)  : modèle standard
 * ('sortie' existe déjà.) Idempotent : saute une formation+type déjà présent.
 *
 *   node migration/create-qualiopi-qcm.mjs            → DRY-RUN
 *   node migration/create-qualiopi-qcm.mjs --apply    → écrit
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const DRY = !process.argv.includes('--apply')
const SBASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const H = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }

async function sb(method, path, body) {
  const r = await fetch(`${SBASE}/rest/v1${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${(await r.text()).slice(0, 200)}`)
  return r.json()
}
async function getAll(path) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SBASE}/rest/v1${path}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`${path} → ${r.status}`)
    const b = await r.json(); rows.push(...b)
    if (b.length < 1000) break
  }
  return rows
}

// q() : question sans choix (échelles / texte) ; type par défaut note_1_5
const q = (texte, type = 'note_1_5', section = null) => ({ texte, type, section })

const SATISFACTION_CHAUD = [
  q('Votre satisfaction globale concernant cette formation', 'note_1_5', 'Satisfaction globale'),
  q('La qualité et la pertinence du contenu', 'note_1_5', 'Contenu'),
  q("L'atteinte des objectifs annoncés", 'note_1_5', 'Contenu'),
  q('La clarté des explications et la pédagogie du formateur', 'note_1_5', 'Animation'),
  q('La qualité des supports et des moyens pédagogiques', 'note_1_5', 'Moyens'),
  q("L'organisation matérielle (convocation, horaires, salle/plateforme)", 'note_1_5', 'Organisation'),
  q('L’adéquation de la durée de la formation', 'note_1_5', 'Organisation'),
  q('Recommanderiez-vous cette formation à un collègue ?', 'nps', 'Recommandation'),
  q('Les points forts de cette formation', 'texte_libre', 'Commentaires'),
  q('Les points à améliorer et vos suggestions', 'texte_libre', 'Commentaires'),
]

const SATISFACTION_FROID = [
  q('Avec le recul, mettez-vous en pratique les acquis dans votre activité ?', 'note_1_5', 'Mise en pratique'),
  q("L'impact de la formation sur vos compétences professionnelles", 'note_1_5', 'Impact'),
  q('La formation répond-elle toujours à vos besoins ?', 'note_1_5', 'Impact'),
  q('Votre satisfaction globale, avec le recul', 'note_1_5', 'Satisfaction'),
  q('Recommanderiez-vous toujours cette formation ?', 'nps', 'Recommandation'),
  q('Quels acquis avez-vous concrètement mis en œuvre ?', 'texte_libre', 'Commentaires'),
  q('Vos besoins de formation complémentaires', 'texte_libre', 'Commentaires'),
]

function positionnementQuestions(objectifs) {
  const out = [
    q('Quelles sont vos attentes principales vis-à-vis de cette formation ?', 'texte_libre', 'Attentes'),
    q('Votre niveau global actuel sur le thème de la formation', 'note_1_5', 'Auto-évaluation'),
  ]
  const objs = Array.isArray(objectifs) ? objectifs.filter(Boolean).slice(0, 8) : []
  for (const o of objs) {
    out.push(q(`Avant la formation, évaluez votre maîtrise : ${String(o).slice(0, 200)}`, 'note_1_5', 'Auto-évaluation'))
  }
  out.push(q('Avez-vous des besoins ou contraintes particuliers à signaler (dont accessibilité / situation de handicap) ?', 'texte_libre', 'Besoins spécifiques'))
  return out
}

const formations = await getAll(`/formations?organization_id=eq.${ORG}&is_active=eq.true&select=id,intitule,objectifs_pedagogiques`)
const allQcm = await getAll(`/qcm?organization_id=eq.${ORG}&formation_id=not.is.null&select=id,formation_id,type`)
const haveType = new Set(allQcm.map((x) => `${x.formation_id}:${x.type}`))
const sortieByForm = new Map()
for (const x of allQcm) if (x.type === 'sortie') sortieByForm.set(x.formation_id, x.id)

const stats = { positionnement: 0, entree: 0, satisfaction_chaud: 0, satisfaction_froid: 0, questions: 0, skip: 0 }

async function insertQcm(meta, questions) {
  const [qcm] = await sb('POST', '/qcm', [meta])
  let pos = 0
  for (const qq of questions) {
    await sb('POST', '/qcm_questions', [{
      qcm_id: qcm.id, texte: qq.texte, type: qq.type,
      points: 0, is_required: qq.type !== 'texte_libre', position: pos++, section: qq.section || null,
    }])
    stats.questions++
  }
  return qcm.id
}

for (const f of formations) {
  const base = { organization_id: ORG, formation_id: f.id, status: 'publie', questions_aleatoires: false, afficher_resultats: true }

  // POSITIONNEMENT
  if (!haveType.has(`${f.id}:positionnement`)) {
    if (!DRY) await insertQcm(
      { ...base, type: 'positionnement', titre: `Questionnaire de positionnement — ${f.intitule}`,
        description: "Auto-évaluation du niveau et des attentes avant l'entrée en formation (Qualiopi Ind.17).", duree_minutes: 10 },
      positionnementQuestions(f.objectifs_pedagogiques))
    stats.positionnement++
  } else stats.skip++

  // SATISFACTION CHAUD
  if (!haveType.has(`${f.id}:satisfaction_chaud`)) {
    if (!DRY) await insertQcm(
      { ...base, type: 'satisfaction_chaud', titre: `Évaluation de satisfaction à chaud — ${f.intitule}`,
        description: 'Recueil de la satisfaction à l’issue de la formation (Qualiopi Ind.30).', duree_minutes: 5 },
      SATISFACTION_CHAUD)
    stats.satisfaction_chaud++
  } else stats.skip++

  // SATISFACTION FROID
  if (!haveType.has(`${f.id}:satisfaction_froid`)) {
    if (!DRY) await insertQcm(
      { ...base, type: 'satisfaction_froid', titre: `Évaluation de satisfaction à froid — ${f.intitule}`,
        description: 'Mesure de l’impact à distance de la formation (Qualiopi Ind.31).', duree_minutes: 5 },
      SATISFACTION_FROID)
    stats.satisfaction_froid++
  } else stats.skip++

  // ENTREE (diagnostic) = copie du QCM d'acquis (sortie)
  if (!haveType.has(`${f.id}:entree`)) {
    const sortieId = sortieByForm.get(f.id)
    if (sortieId) {
      if (!DRY) {
        const srcQ = await sb('GET', `/qcm_questions?qcm_id=eq.${sortieId}&select=texte,type,explication,points,is_required,position,section,qcm_choix(texte,est_correct,position)&order=position`)
        const [qcm] = await sb('POST', '/qcm', [{
          ...base, type: 'entree', titre: `Évaluation diagnostique (entrée) — ${f.intitule}`,
          description: 'Positionnement des connaissances en début de formation, comparable à l’évaluation des acquis (pré-test).',
          duree_minutes: 20, score_min_reussite: 60 }])
        for (const sq of srcQ) {
          const [nq] = await sb('POST', '/qcm_questions', [{
            qcm_id: qcm.id, texte: sq.texte, type: sq.type, explication: sq.explication,
            points: sq.points, is_required: sq.is_required, position: sq.position, section: sq.section }])
          const choix = (sq.qcm_choix || []).map((c) => ({ question_id: nq.id, texte: c.texte, est_correct: c.est_correct, position: c.position }))
          if (choix.length) await sb('POST', '/qcm_choix', choix)
          stats.questions++
        }
      }
      stats.entree++
    }
  } else stats.skip++
}

console.log(JSON.stringify(stats, null, 2))
if (DRY) console.log('DRY-RUN — rien écrit. Ajouter --apply.')
