#!/usr/bin/env node
/**
 * Complète l'indicateur 12 pour les sessions prouvées par les questionnaires :
 * un stagiaire qui a complété un questionnaire de la session y était présent.
 *
 * 1) Génère la grille d'émargement manquante (même logique que
 *    lib/emargements.ts : jours ouvrés sauf POEI, matin + après-midi,
 *    tous les inscrits, est_present=false) — beaucoup de sessions n'ont
 *    jamais été ouvertes et n'ont donc aucune ligne.
 * 2) Coche est_present=true pour chaque couple (session, stagiaire) prouvé
 *    par un questionnaire complété. Jamais de signature créée ; les lignes
 *    signées et les absences motivées ne sont pas touchées.
 *
 *   node scripts/generer-presences-qcm.mjs           (simulation)
 *   node scripts/generer-presences-qcm.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ECRIRE = process.argv.includes('--ecrire')
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const TYPES = ['positionnement', 'entree', 'sortie', 'satisfaction_chaud', 'satisfaction_froid']

async function tout(table, cols, filtre) {
  const out = []
  for (let de = 0; ; de += 1000) {
    let q = s.from(table).select(cols).range(de, de + 999)
    if (filtre) q = filtre(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

// 1) Couples prouvés
const qcms = await tout('qcm', 'id, type')
const typeParQcm = new Map(qcms.map((q) => [q.id, q.type]))
const reponses = await tout('qcm_reponses', 'session_id, apprenant_id, qcm_id',
  (q) => q.eq('is_complete', true).not('session_id', 'is', null).not('apprenant_id', 'is', null))
const prouves = new Set()
for (const r of reponses) if (TYPES.includes(typeParQcm.get(r.qcm_id))) prouves.add(`${r.session_id}|${r.apprenant_id}`)
const sessionsProuvees = new Set([...prouves].map((k) => k.split('|')[0]))
console.log(`${prouves.size} couples prouvés sur ${sessionsProuvees.size} sessions`)

// 2) Grilles manquantes sur ces sessions (logique lib/emargements.ts)
const sessions = await tout('sessions', 'id, date_debut, date_fin, poei_intervention_id')
const parId = new Map(sessions.map((x) => [x.id, x]))
const inscriptions = await tout('inscriptions', 'session_id, apprenant_id, status')
const inscrits = {}
for (const i of inscriptions) {
  if (['annule', 'abandonne'].includes(i.status) || !i.apprenant_id) continue
  ;(inscrits[i.session_id] = inscrits[i.session_id] || []).push(i.apprenant_id)
}
const emargements = await tout('emargements', 'id, session_id, apprenant_id, date, creneau, est_present, signature_data, motif_absence')
const dejaLigne = new Set(emargements.map((e) => `${e.session_id}|${e.date}|${e.creneau}|${e.apprenant_id}`))

const aCreer = []
let sessionsSansDates = 0
for (const sid of sessionsProuvees) {
  const sess = parId.get(sid)
  if (!sess?.date_debut || !sess?.date_fin) { sessionsSansDates++; continue }
  const jours = []
  const d = new Date(sess.date_debut)
  const fin = new Date(sess.date_fin)
  while (d <= fin) {
    const js = d.getDay()
    if (sess.poei_intervention_id || (js !== 0 && js !== 6)) jours.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  for (const jour of jours) for (const creneau of ['matin', 'apres_midi']) {
    for (const app of inscrits[sid] || []) {
      if (dejaLigne.has(`${sid}|${jour}|${creneau}|${app}`)) continue
      aCreer.push({
        organization_id: ORG, session_id: sid, apprenant_id: app,
        date: jour, creneau, est_present: prouves.has(`${sid}|${app}`),
      })
    }
  }
}
console.log(`grilles : ${aCreer.length} lignes manquantes à créer (dont ${aCreer.filter((x) => x.est_present).length} directement présentes)`)
if (sessionsSansDates) console.log(`${sessionsSansDates} sessions prouvées sans dates — ignorées`)

// 3) Lignes existantes à cocher
const aCocher = emargements.filter((e) =>
  prouves.has(`${e.session_id}|${e.apprenant_id}`) && !e.est_present && !e.signature_data && !e.motif_absence)
console.log(`existantes à cocher présentes : ${aCocher.length}`)

if (!ECRIRE) { console.log('\nSimulation — relancer avec --ecrire.'); process.exit(0) }

for (let i = 0; i < aCreer.length; i += 500) {
  const { error } = await s.from('emargements').insert(aCreer.slice(i, i + 500))
  if (error) { console.error('!! insert', error.message); process.exit(1) }
  console.log(`  créées ${Math.min(i + 500, aCreer.length)}/${aCreer.length}`)
}
for (let i = 0; i < aCocher.length; i += 200) {
  const lot = aCocher.slice(i, i + 200)
  const { error } = await s.from('emargements').update({ est_present: true }).in('id', lot.map((e) => e.id))
  if (error) { console.error('!! update', error.message); process.exit(1) }
}
console.log(`\nTerminé : ${aCreer.length} lignes créées, ${aCocher.length} cochées présentes.`)
