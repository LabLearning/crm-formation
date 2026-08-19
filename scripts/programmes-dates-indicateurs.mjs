#!/usr/bin/env node
/**
 * Programmes : dates de conception / mise à jour + indicateurs de résultats.
 *
 * CONCEPTION : created_at porte la date d'import Dendreo (05/08/2026) — faux
 * pour un programme animé depuis 2024. La date honnête est celle de la
 * PREMIÈRE SESSION du programme (il existait forcément avant sa première
 * animation) ; à défaut, la date d'import. Posée une fois dans
 * historique_versions, jamais réécrite.
 *
 * MISE À JOUR : date_derniere_maj réalignée sur la dernière modification
 * réelle de la fiche (updated_at) — ex. la révision des objectifs en verbes
 * évaluables du 18/08.
 *
 * INDICATEURS (calculés, jamais saisis) :
 *  - nombre_apprenants_total : inscrits des sessions terminées du programme ;
 *  - taux_satisfaction : moyenne des scores de satisfaction à chaud (en %) ;
 *  - taux_reussite : moyenne des scores d'évaluation des acquis (en %).
 *  Un taux ne se publie qu'à partir de 5 réponses — en dessous, il ment.
 *
 *   node scripts/programmes-dates-indicateurs.mjs           (simulation)
 *   node scripts/programmes-dates-indicateurs.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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

const [formations, sessions, inscriptions, reponses, qcms] = await Promise.all([
  tout('formations', 'id, intitule, created_at, updated_at, date_derniere_maj, historique_versions, version'),
  tout('sessions', 'id, formation_id, status, date_debut, reference'),
  tout('inscriptions', 'session_id, apprenant_id'),
  tout('qcm_reponses', 'session_id, qcm_id, score, is_complete'),
  tout('qcm', 'id, type'),
])
const typeQcm = new Map(qcms.map((q) => [q.id, q.type]))
const sessionsParFormation = new Map()
for (const s of sessions) {
  if (!s.formation_id || (s.reference || '').startsWith('BPF-')) continue
  if (!sessionsParFormation.has(s.formation_id)) sessionsParFormation.set(s.formation_id, [])
  sessionsParFormation.get(s.formation_id).push(s)
}
const inscParSession = new Map()
for (const i of inscriptions) inscParSession.set(i.session_id, (inscParSession.get(i.session_id) || 0) + 1)
const repParSession = new Map()
for (const r of reponses) {
  if (!r.is_complete || r.score == null) continue
  if (!repParSession.has(r.session_id)) repParSession.set(r.session_id, [])
  repParSession.get(r.session_id).push(r)
}

let maj = 0
for (const f of formations) {
  const mesSessions = sessionsParFormation.get(f.id) || []
  const terminees = mesSessions.filter((s) => s.status === 'terminee')
  const premiere = mesSessions.map((s) => String(s.date_debut).slice(0, 10)).filter(Boolean).sort()[0] || null
  const conception = premiere && premiere < String(f.created_at).slice(0, 10) ? premiere : String(f.created_at).slice(0, 10)

  // Historique : l'entrée conception ne se pose qu'une fois.
  const historique = Array.isArray(f.historique_versions) ? f.historique_versions : []
  const dejaConception = historique.some((h) => h?.evenement === 'conception')
  const nouvelHistorique = dejaConception ? historique
    : [{ version: 1, date: conception, evenement: 'conception', note: 'Conception du programme (première animation connue)' }, ...historique]

  const derniereMaj = String(f.updated_at || f.created_at).slice(0, 10)

  // Indicateurs calculés
  const nbFormes = terminees.reduce((a, s) => a + (inscParSession.get(s.id) || 0), 0)
  const scores = { satisfaction_chaud: [], sortie: [] }
  for (const s of terminees) for (const r of repParSession.get(s.id) || []) {
    const t = typeQcm.get(r.qcm_id)
    if (t === 'satisfaction_chaud') scores.satisfaction_chaud.push(Number(r.score))
    if (t === 'sortie') scores.sortie.push(Number(r.score))
  }
  const moyenne = (arr) => arr.length >= 5 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const tauxSatisfaction = moyenne(scores.satisfaction_chaud)
  const tauxReussite = moyenne(scores.sortie)

  maj++
  if (maj <= 6) console.log(`  ${f.intitule.slice(0, 50).padEnd(52)} conçu ${conception} · màj ${derniereMaj} · ${nbFormes} formés · satisf ${tauxSatisfaction ?? '—'}% (${scores.satisfaction_chaud.length}) · acquis ${tauxReussite ?? '—'}% (${scores.sortie.length})`)
  if (ECRIRE) {
    const { error } = await supabase.from('formations').update({
      historique_versions: nouvelHistorique,
      date_derniere_maj: derniereMaj,
      nombre_apprenants_total: nbFormes || null,
      taux_satisfaction: tauxSatisfaction,
      taux_reussite: tauxReussite,
    }).eq('id', f.id)
    if (error) console.error('  !!', f.intitule.slice(0, 40), error.message.slice(0, 60))
  }
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${maj} programmes datés et chiffrés.`)
if (!ECRIRE) console.log('Relancer avec --ecrire.')
