#!/usr/bin/env node
/**
 * Positionnement V2 — décision du 18/08/2026 : le questionnaire de
 * positionnement devient IDENTIQUE à l'évaluation des acquis de sortie,
 * pour mesurer la progression réelle de l'apprenant (score d'entrée
 * objectif → score de sortie, preuve de l'indicateur 11).
 *
 * SANS TOUCHER À L'HISTORIQUE : les réponses déjà données restent liées à
 * l'ancien questionnaire (V1, archivé). Pour chaque formation :
 *   1. un nouveau QCM positionnement est créé avec les questions et choix
 *      clonés du QCM de sortie ;
 *   2. les rattachements de session (qcm_sessions) et les réponses EN
 *      ATTENTE (is_complete = false) basculent sur la V2 ;
 *   3. la V1 passe en statut archive — les réponses complétées y restent.
 *
 * USAGE : node scripts/positionnement-v2.mjs           (simulation)
 *         node scripts/positionnement-v2.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'

async function tout(table, cols) {
  const o = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(d, d + 999)
    if (error) throw new Error(table + ': ' + error.message)
    o.push(...data)
    if (data.length < 1000) break
  }
  return o
}

const [qcms, questions, formations] = await Promise.all([
  tout('qcm', 'id, formation_id, type, titre, status, score_min_reussite'),
  tout('qcm_questions', 'id, qcm_id, texte, type, points, position, explication'),
  tout('formations', 'id, intitule'),
])
const nomFormation = new Map(formations.map((f) => [f.id, f.intitule]))
const questionsParQcm = new Map()
for (const q of questions) {
  if (!questionsParQcm.has(q.qcm_id)) questionsParQcm.set(q.qcm_id, [])
  questionsParQcm.get(q.qcm_id).push(q)
}

let migres = 0, sansSortie = 0
for (const f of formations) {
  const posV1 = qcms.find((q) => q.formation_id === f.id && q.type === 'positionnement' && q.status !== 'archive')
  const sortie = qcms.find((q) => q.formation_id === f.id && q.type === 'sortie' && (questionsParQcm.get(q.id) || []).length > 0)
  if (!posV1) continue
  if (!sortie) { sansSortie++; continue }
  migres++
  const nbQ = (questionsParQcm.get(sortie.id) || []).length
  if (migres <= 8 || !ECRIRE) console.log(`  ${String(f.intitule).slice(0, 55).padEnd(57)} ${nbQ} questions clonées de la sortie`)
  if (!ECRIRE) continue

  // 1. V2 avec les questions de la sortie.
  const { data: v2, error } = await supabase.from('qcm').insert({
    organization_id: ORG, formation_id: f.id, type: 'positionnement',
    titre: `Questionnaire de positionnement — ${f.intitule}`,
    status: 'publie',
    // Un positionnement mesure un point de départ : pas de seuil de réussite.
    score_min_reussite: null,
  }).select('id').single()
  if (error) { console.error('  !!', error.message.slice(0, 80)); continue }

  const { data: choixSource } = await supabase.from('qcm_choix')
    .select('question_id, texte, est_correct, position')
    .in('question_id', (questionsParQcm.get(sortie.id) || []).map((x) => x.id))
  for (const q of (questionsParQcm.get(sortie.id) || []).sort((a, b) => (a.position || 0) - (b.position || 0))) {
    const { data: nq, error: e2 } = await supabase.from('qcm_questions').insert({
      qcm_id: v2.id, texte: q.texte, type: q.type, points: q.points, position: q.position, explication: q.explication,
    }).select('id').single()
    if (e2) { console.error('  !! question', e2.message.slice(0, 70)); continue }
    const ch = (choixSource || []).filter((c) => c.question_id === q.id)
    if (ch.length) {
      await supabase.from('qcm_choix').insert(ch.map((c) => ({
        question_id: nq.id, texte: c.texte, est_correct: c.est_correct, position: c.position,
      })))
    }
  }

  // 2. Rattachements de session + réponses en attente → V2.
  await supabase.from('qcm_sessions').update({ qcm_id: v2.id }).eq('qcm_id', posV1.id)
  await supabase.from('qcm_reponses').update({ qcm_id: v2.id }).eq('qcm_id', posV1.id).eq('is_complete', false)

  // 3. V1 archivée — l'historique complété reste dessus.
  await supabase.from('qcm').update({ status: 'archive', titre: `${posV1.titre} (v1)` }).eq('id', posV1.id)
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${migres} positionnements alignés sur la sortie ; ${sansSortie} formations sans QCM de sortie exploitable.`)
if (!ECRIRE && migres) console.log('Relancer avec --ecrire.')
