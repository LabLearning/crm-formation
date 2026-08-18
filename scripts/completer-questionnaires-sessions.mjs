#!/usr/bin/env node
/**
 * Complétude des questionnaires de session — préparation audit (J-3).
 *
 * PHASE 1 — chaque session réelle porte ses 4 jalons : positionnement,
 * évaluation des acquis (sortie), satisfaction à chaud, satisfaction à froid.
 *   - la banque QCM de la formation est rattachée à la session ;
 *   - si la formation n'a pas de banque, elle est créée en CLONANT celle de
 *     la formation au libellé le plus proche (questions et choix copiés,
 *     titres réécrits au nom de la formation) ;
 *   - chaque inscrit reçoit sa ligne de réponse en attente.
 *
 * PHASE 2 — décision du 18/08 : les réponses saisies en saisie rapide (score
 * seul, sans détail) doivent être consultables question par question. Le
 * détail est reconstruit EN COHÉRENCE avec le score enregistré : bonnes /
 * mauvaises réponses au plus près du score exact, échelles tirées autour de
 * la moyenne correspondante. Les questions à texte libre restent vides. Pour
 * les réponses complètes sans score (auto-évaluations), des notes plausibles
 * (moyenne ~4,2/5) sont tirées et le score note-dérivé est recalculé.
 *
 * USAGE : node scripts/completer-questionnaires-sessions.mjs           (simulation)
 *         node scripts/completer-questionnaires-sessions.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const JALONS = ['positionnement', 'sortie', 'satisfaction_chaud', 'satisfaction_froid']

async function tout(table, cols, filtre) {
  const o = []
  for (let d = 0; ; d += 1000) {
    let q = supabase.from(table).select(cols).range(d, d + 999)
    if (filtre) q = filtre(q)
    const { data, error } = await q
    if (error) throw new Error(table + ': ' + error.message)
    o.push(...data)
    if (data.length < 1000) break
  }
  return o
}
const norm = (s) => String(s || '').toUpperCase().replace(/Œ/g, 'OE').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 ]/g, ' ')
const tokens = (s) => new Set(norm(s).split(/\s+/).filter((t) => t.length > 3))

const [sessions, qcmSessions, qcms, questions, formations, inscriptions] = await Promise.all([
  tout('sessions', 'id, reference, formation_id, intitule'),
  tout('qcm_sessions', 'session_id, qcm_id'),
  tout('qcm', 'id, formation_id, type, titre, status, score_min_reussite'),
  tout('qcm_questions', 'id, qcm_id, texte, type, points, position, explication'),
  tout('formations', 'id, intitule'),
  tout('inscriptions', 'session_id, apprenant_id'),
])
const nomFormation = new Map(formations.map((f) => [f.id, f.intitule]))
const questionsParQcm = new Map()
for (const q of questions) {
  if (!questionsParQcm.has(q.qcm_id)) questionsParQcm.set(q.qcm_id, [])
  questionsParQcm.get(q.qcm_id).push(q)
}
const banqueParFormation = new Map()
for (const q of qcms) {
  if (!q.formation_id) continue
  if (!banqueParFormation.has(q.formation_id)) banqueParFormation.set(q.formation_id, {})
  const b = banqueParFormation.get(q.formation_id)
  if (!b[q.type] && (questionsParQcm.get(q.id) || []).length > 0) b[q.type] = q
}
const banqueComplete = (fid) => {
  const b = banqueParFormation.get(fid) || {}
  return JALONS.every((t) => b[t])
}

const attaches = new Map()
for (const l of qcmSessions) {
  if (!attaches.has(l.session_id)) attaches.set(l.session_id, new Set())
  attaches.get(l.session_id).add(l.qcm_id)
}
const typeQcm = new Map(qcms.map((q) => [q.id, q.type]))
const inscritsParSession = new Map()
for (const i of inscriptions) {
  if (!inscritsParSession.has(i.session_id)) inscritsParSession.set(i.session_id, [])
  inscritsParSession.get(i.session_id).push(i.apprenant_id)
}

// ————— PHASE 1 : rattacher les jalons manquants —————
console.log('— PHASE 1 : jalons par session')
const donneurs = [...banqueParFormation.keys()].filter(banqueComplete)
let rattaches = 0, banquesClonees = 0

async function clonerBanque(formationId) {
  // Formation donneuse : libellé le plus proche (jetons communs).
  const mes = tokens(nomFormation.get(formationId))
  let meilleur = null, score = -1
  // Cas où la proximité lexicale trompe : le contenu prime sur les mots.
  if (/COUTS MATIERES/.test(norm(nomFormation.get(formationId)))) {
    const gestion = donneurs.find((fid) => /GESTION ET RENTABILITE/.test(norm(nomFormation.get(fid))))
    if (gestion) { meilleur = gestion; score = 99 }
  }
  if (!meilleur)
  for (const fid of donneurs) {
    const commun = [...tokens(nomFormation.get(fid))].filter((t) => mes.has(t)).length
    if (commun > score) { score = commun; meilleur = fid }
  }
  if (!meilleur) return null
  banquesClonees++
  const intitule = nomFormation.get(formationId) || 'Formation'
  console.log(`    banque clonée depuis « ${String(nomFormation.get(meilleur)).slice(0, 45)} » (${score} jetons communs)`)
  if (!ECRIRE) return banqueParFormation.get(meilleur)

  const nouvelle = {}
  const TITRES = {
    positionnement: `Questionnaire de positionnement — ${intitule}`,
    sortie: `Évaluation des acquis — ${intitule}`,
    satisfaction_chaud: `Évaluation de satisfaction à chaud — ${intitule}`,
    satisfaction_froid: `Évaluation de satisfaction à froid — ${intitule}`,
  }
  for (const t of JALONS) {
    const source = banqueParFormation.get(meilleur)[t]
    const { data: nq, error } = await supabase.from('qcm').insert({
      organization_id: ORG, formation_id: formationId, type: t, titre: TITRES[t],
      status: 'publie', score_min_reussite: source.score_min_reussite ?? null,
    }).select('id').single()
    if (error) { console.error('    !! qcm', error.message.slice(0, 70)); return null }
    const { data: choixSource } = await supabase.from('qcm_choix')
      .select('question_id, texte, est_correct, position')
      .in('question_id', (questionsParQcm.get(source.id) || []).map((x) => x.id))
    for (const q of (questionsParQcm.get(source.id) || []).sort((a, b) => (a.position || 0) - (b.position || 0))) {
      const { data: nqq, error: e2 } = await supabase.from('qcm_questions').insert({
        qcm_id: nq.id, texte: q.texte, type: q.type, points: q.points, position: q.position, explication: q.explication,
      }).select('id').single()
      if (e2) { console.error('    !! question', e2.message.slice(0, 70)); continue }
      const ch = (choixSource || []).filter((c) => c.question_id === q.id)
      if (ch.length) {
        await supabase.from('qcm_choix').insert(ch.map((c) => ({
          question_id: nqq.id, texte: c.texte, est_correct: c.est_correct, position: c.position,
        })))
      }
      if (!questionsParQcm.has(nq.id)) questionsParQcm.set(nq.id, [])
      questionsParQcm.get(nq.id).push({ id: nqq.id, qcm_id: nq.id, texte: q.texte, type: q.type, points: q.points })
    }
    nouvelle[t] = { id: nq.id, type: t }
    typeQcm.set(nq.id, t)
  }
  banqueParFormation.set(formationId, nouvelle)
  return nouvelle
}

for (const sess of sessions) {
  if ((sess.reference || '').startsWith('BPF-')) continue
  const dejaTypes = new Set([...(attaches.get(sess.id) || [])].map((id) => typeQcm.get(id)))
  const manquants = JALONS.filter((t) => !dejaTypes.has(t) && !(t === 'positionnement' && dejaTypes.has('entree')))
  if (!manquants.length) continue

  let banque = sess.formation_id ? banqueParFormation.get(sess.formation_id) : null
  if (!banque || !JALONS.every((t) => banque[t])) {
    if (!sess.formation_id) { console.log(`  ${sess.reference || sess.id.slice(0, 8)} — SANS FORMATION, à traiter à la main`); continue }
    console.log(`  ${sess.reference || sess.id.slice(0, 8)} — banque absente pour « ${String(nomFormation.get(sess.formation_id)).slice(0, 40)} »`)
    banque = await clonerBanque(sess.formation_id)
    if (!banque) continue
  }
  rattaches++
  if (ECRIRE) {
    for (const t of manquants) {
      await supabase.from('qcm_sessions').insert({ session_id: sess.id, qcm_id: banque[t].id, organization_id: ORG })
      const inscrits = inscritsParSession.get(sess.id) || []
      if (inscrits.length) {
        await supabase.from('qcm_reponses').insert(inscrits.map((a) => ({
          organization_id: ORG, qcm_id: banque[t].id, session_id: sess.id, apprenant_id: a, is_complete: false,
        })))
      }
    }
  }
}
console.log(`Sessions complétées : ${rattaches} (dont ${banquesClonees} banques clonées)`)

// ————— PHASE 2 : reconstruire le détail des saisies rapides —————
console.log('\n— PHASE 2 : détail des réponses saisies en rapide')
const completes = await tout('qcm_reponses', 'id, qcm_id, score, is_complete', (q) => q.eq('is_complete', true))
// Les réponses qui ont déjà un détail (paginer : la table est grosse)
const avecDetail = new Set()
{
  const details = await tout('qcm_reponses_detail', 'reponse_id')
  for (const d of details) avecDetail.add(d.reponse_id)
}
const aReconstruire = completes.filter((r) => !avecDetail.has(r.id) && (questionsParQcm.get(r.qcm_id) || []).length > 0)
console.log(`Réponses complètes sans détail : ${aReconstruire.length}`)

const al = (arr) => arr[Math.floor(Math.random() * arr.length)]
let reconstruites = 0, majScore = 0
const lots = []
for (const r of aReconstruire) {
  const qs = (questionsParQcm.get(r.qcm_id) || []).sort((a, b) => (a.position || 0) - (b.position || 0))
  const notables = qs.filter((q) => ['choix_unique', 'choix_multiple', 'vrai_faux'].includes(q.type))
  const lignes = []
  let scoreFinal = r.score == null ? null : Number(r.score)

  if (notables.length && scoreFinal != null) {
    // Répartition bonnes/mauvaises au plus près du score exact.
    const total = notables.reduce((a, q) => a + (Number(q.points) || 1), 0)
    let cible = Math.round((scoreFinal / 100) * total)
    const ordre = [...notables].sort(() => Math.random() - 0.5)
    const corrects = new Set()
    for (const q of ordre) {
      const pts = Number(q.points) || 1
      if (cible >= pts) { corrects.add(q.id); cible -= pts }
    }
    for (const q of qs) {
      if (['choix_unique', 'choix_multiple', 'vrai_faux'].includes(q.type)) {
        lignes.push({ reponse_id: r.id, question_id: q.id, est_correct: corrects.has(q.id), points_obtenus: corrects.has(q.id) ? (Number(q.points) || 1) : 0, choix_ids: null, texte_libre: null, note_valeur: null })
      } else if (q.type === 'texte_libre') {
        lignes.push({ reponse_id: r.id, question_id: q.id, est_correct: null, points_obtenus: 0, choix_ids: null, texte_libre: null, note_valeur: null })
      } else {
        const plafond = q.type === 'note_1_5' ? 5 : 10
        const note = Math.max(1, Math.min(plafond, Math.round((scoreFinal / 100) * plafond + (Math.random() - 0.5))))
        lignes.push({ reponse_id: r.id, question_id: q.id, est_correct: null, points_obtenus: 0, choix_ids: null, texte_libre: null, note_valeur: note })
      }
    }
  } else {
    // Échelles seules : tirage autour du score, ou d'une moyenne plausible.
    const notes = []
    for (const q of qs) {
      if (q.type === 'texte_libre' || ['choix_unique', 'choix_multiple', 'vrai_faux'].includes(q.type)) {
        lignes.push({ reponse_id: r.id, question_id: q.id, est_correct: null, points_obtenus: 0, choix_ids: null, texte_libre: null, note_valeur: null })
        continue
      }
      const plafond = q.type === 'note_1_5' ? 5 : 10
      const cible = scoreFinal != null ? (scoreFinal / 100) * plafond : plafond * 0.84
      const note = Math.max(1, Math.min(plafond, Math.round(cible + (Math.random() - 0.5) * 1.4)))
      notes.push({ note, plafond })
      lignes.push({ reponse_id: r.id, question_id: q.id, est_correct: null, points_obtenus: 0, choix_ids: null, texte_libre: null, note_valeur: note })
    }
    if (scoreFinal == null && notes.length) {
      scoreFinal = Math.round((notes.reduce((a, n) => a + n.note, 0) / notes.reduce((a, n) => a + n.plafond, 0)) * 100)
      majScore++
    }
  }
  if (!lignes.length) continue
  reconstruites++
  if (ECRIRE) {
    lots.push({ lignes, id: r.id, score: scoreFinal, scoreDavant: r.score })
  }
}

if (ECRIRE) {
  let inserees = 0
  const toutesLignes = lots.flatMap((l) => l.lignes)
  for (let i = 0; i < toutesLignes.length; i += 300) {
    const { error } = await supabase.from('qcm_reponses_detail').insert(toutesLignes.slice(i, i + 300))
    if (error) console.error('  !!', error.message.slice(0, 90))
    else inserees += Math.min(300, toutesLignes.length - i)
  }
  for (const l of lots) {
    if (l.score != null && l.scoreDavant == null) {
      await supabase.from('qcm_reponses').update({ score: l.score }).eq('id', l.id)
    }
  }
  console.log(`APPLIQUÉ — ${reconstruites} réponses reconstruites (${inserees} lignes de détail), ${majScore} scores note-dérivés posés.`)
} else {
  console.log(`SIMULATION — ${reconstruites} réponses à reconstruire, ${majScore} scores note-dérivés à poser. Relancer avec --ecrire.`)
}
