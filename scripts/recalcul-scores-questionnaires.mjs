#!/usr/bin/env node
/**
 * Recalcul des scores de questionnaires faussés par les questions non notables.
 *
 * POURQUOI : le calcul du portail comptait TOUTES les questions au
 * dénominateur, y compris texte libre et échelles 1-5. Un questionnaire de
 * positionnement (auto-évaluation, aucune bonne réponse) complété en ligne
 * affichait donc 0 % — faux et anxiogène devant l'auditrice.
 *
 * COMMENT : pour chaque réponse complétée AVEC détail (donc réellement saisie
 * en ligne, pas un report papier), le score est recalculé sur les seules
 * questions notables (choix avec bonne réponse définie). S'il n'y a rien à
 * noter, le score devient null — l'écran affiche « Réalisé » sans pourcentage.
 * Les reports papier (sans détail) ne sont jamais touchés.
 *
 * USAGE : node scripts/recalcul-scores-questionnaires.mjs           (simulation)
 *         node scripts/recalcul-scores-questionnaires.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function tout(table, cols, filtre) {
  const lignes = []
  for (let de = 0; ; de += 1000) {
    let q = supabase.from(table).select(cols).range(de, de + 999)
    if (filtre) q = filtre(q)
    const { data, error } = await q
    if (error) throw new Error(table + ': ' + error.message)
    lignes.push(...data)
    if (data.length < 1000) break
  }
  return lignes
}

const [reponses, questions] = await Promise.all([
  tout('qcm_reponses', 'id, qcm_id, score, is_reussi, qcm:qcm_id(type, titre, score_min_reussite)', (q) => q.eq('is_complete', true)),
  tout('qcm_questions', 'id, qcm_id, type, points, choix:qcm_choix(est_correct)'),
])

const questionsParQcm = new Map()
for (const q of questions) {
  if (!questionsParQcm.has(q.qcm_id)) questionsParQcm.set(q.qcm_id, [])
  questionsParQcm.get(q.qcm_id).push(q)
}
const notable = (q) => ['choix_unique', 'choix_multiple', 'vrai_faux'].includes(q.type)
  && (q.choix || []).some((c) => c.est_correct === true)

let corriges = 0
const parType = {}
for (const r of reponses) {
  const qs = questionsParQcm.get(r.qcm_id) || []
  const notables = qs.filter(notable)
  const totalPoints = notables.reduce((a, q) => a + (Number(q.points) || 1), 0)
  const { data: det } = await supabase.from('qcm_reponses_detail')
    .select('question_id, points_obtenus, note_valeur').eq('reponse_id', r.id)
  if (!(det || []).length) continue // report papier : le score saisi fait foi

  // Même règle que lib/qcm-notation : pourcentage sur les questions notables ;
  // sinon moyenne des échelles ramenée sur 100 ; sinon null — jamais un faux 0.
  let nouveauScore
  if (totalPoints > 0) {
    const idsNotables = new Set(notables.map((q) => q.id))
    const earned = (det || []).filter((d) => idsNotables.has(d.question_id))
      .reduce((a, d) => a + (Number(d.points_obtenus) || 0), 0)
    nouveauScore = Math.round((earned / totalPoints) * 100)
  } else {
    const typeParQuestion = new Map(qs.map((q) => [q.id, q.type]))
    let cumul = 0, max = 0
    for (const d of det || []) {
      if (d.note_valeur == null) continue
      cumul += Number(d.note_valeur)
      max += typeParQuestion.get(d.question_id) === 'note_1_5' ? 5 : 10
    }
    nouveauScore = max > 0 ? Math.round((cumul / max) * 100) : null
  }

  const actuel = r.score == null ? null : Number(r.score)
  if (actuel === nouveauScore) continue
  corriges++
  const type = r.qcm?.type || '?'
  parType[type] = (parType[type] || 0) + 1
  console.log(`  ${String(r.qcm?.titre || '').slice(0, 50).padEnd(52)} ${actuel ?? 'null'} -> ${nouveauScore ?? 'null'}`)
  if (ECRIRE) {
    const scoreMin = r.qcm?.score_min_reussite != null ? Number(r.qcm.score_min_reussite) : null
    const { error } = await supabase.from('qcm_reponses').update({
      score: nouveauScore,
      is_reussi: scoreMin !== null && nouveauScore !== null ? nouveauScore >= scoreMin : null,
    }).eq('id', r.id)
    if (error) console.error(`  !! ${r.id}: ${error.message}`)
  }
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${corriges} scores recalculés`, JSON.stringify(parType))
if (!ECRIRE && corriges) console.log('Relancer avec --ecrire pour appliquer.')
