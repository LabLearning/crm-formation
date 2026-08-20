#!/usr/bin/env node
/**
 * Un stagiaire qui a complété un questionnaire (positionnement, évaluation,
 * satisfaction) était présent à sa session : on coche est_present sur ses
 * émargements au lieu de le faire à la main (500+ clics).
 *
 * On ne touche JAMAIS :
 *  - aux lignes déjà présentes ou signées (la signature reste la preuve reine)
 *  - aux absences motivées (motif_absence renseigné)
 *
 * Simulation par défaut :
 *   node scripts/marquer-presents-qcm.mjs
 *   node scripts/marquer-presents-qcm.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ECRIRE = process.argv.includes('--ecrire')
const TYPES = ['positionnement', 'entree', 'sortie', 'satisfaction_chaud', 'satisfaction_froid']

// Pagination : PostgREST plafonne à 1000 lignes par select.
async function tout(table, colonnes, filtre) {
  const lignes = []
  for (let de = 0; ; de += 1000) {
    let q = s.from(table).select(colonnes).range(de, de + 999)
    if (filtre) q = filtre(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    lignes.push(...(data || []))
    if (!data || data.length < 1000) return lignes
  }
}

// 1) Couples (session, apprenant) prouvés par un questionnaire complété
const qcms = await tout('qcm', 'id, type')
const typesParQcm = new Map(qcms.map((q) => [q.id, q.type]))
const reponses = await tout('qcm_reponses', 'session_id, apprenant_id, qcm_id',
  (q) => q.eq('is_complete', true).not('session_id', 'is', null).not('apprenant_id', 'is', null))
const prouves = new Set()
for (const r of reponses) {
  if (TYPES.includes(typesParQcm.get(r.qcm_id))) prouves.add(`${r.session_id}|${r.apprenant_id}`)
}
console.log(`${prouves.size} couples session/apprenant prouvés par un questionnaire complété`)

// 2) Émargements de ces couples encore non présents, non signés, sans motif d'absence
const emargements = await tout('emargements', 'id, session_id, apprenant_id, date, creneau, est_present, signature_data, motif_absence',
  (q) => q.or('est_present.is.null,est_present.eq.false'))
const cibles = emargements.filter((e) =>
  prouves.has(`${e.session_id}|${e.apprenant_id}`) && !e.signature_data && !e.motif_absence)
console.log(`${cibles.length} émargements à passer en présent (sur ${emargements.length} non présents)`)

const parSession = {}
for (const e of cibles) parSession[e.session_id] = (parSession[e.session_id] || 0) + 1
console.log(`répartis sur ${Object.keys(parSession).length} sessions`)

if (!ECRIRE) { console.log('\nSimulation — relancer avec --ecrire pour appliquer.'); process.exit(0) }

let faits = 0
for (let i = 0; i < cibles.length; i += 200) {
  const lot = cibles.slice(i, i + 200)
  const { error } = await s.from('emargements').update({ est_present: true }).in('id', lot.map((e) => e.id))
  if (error) { console.error('!!', error.message); process.exit(1) }
  faits += lot.length
  console.log(`  ${faits}/${cibles.length}`)
}
console.log(`\nTerminé : ${faits} émargements passés en présent.`)
