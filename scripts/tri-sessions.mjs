#!/usr/bin/env node
/**
 * Recensement complet des sessions : le vrai listing.
 *
 * Entre l'import Dendreo, les lignes BPF techniques, les tests et la vie du
 * CRM, le compteur « 513 sessions » ne dit plus ce qui est réel. Ce script
 * classe chaque session et relève ce qui cloche : statut contredit par les
 * dates, coquilles vides, doublons, champs manquants.
 *
 * Diagnostic seul — les corrections proposées s'appliquent avec --ecrire,
 * et se limitent aux évidences : une session finie depuis plus de 7 jours,
 * avec des stagiaires inscrits, encore « planifiée » ou « confirmée », est
 * de fait terminée.
 *
 *   node scripts/tri-sessions.mjs           # simulation
 *   node scripts/tri-sessions.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')
const AUJ = new Date().toISOString().slice(0, 10)
const IL_Y_A_7J = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) })()

const pages = async (fn) => { const o=[]; for(let f=0;;f+=500){const{data,error}=await fn(f,f+499); if(error) throw new Error(error.message); o.push(...(data||[])); if((data||[]).length<500) break} return o }

const [sessions, inscriptions] = await Promise.all([
  pages((f,t) => supabase.from('sessions')
    .select('id, reference, intitule, status, date_debut, date_fin, client_id, formation_id, formateur_id, poei_intervention_id, dendreo_id, created_at, client:client_id(raison_sociale), formation:formation_id(intitule)')
    .eq('organization_id', ORG).range(f,t)),
  pages((f,t) => supabase.from('inscriptions').select('session_id, status').range(f,t)),
])

const inscrits = new Map()
for (const i of inscriptions) {
  if (['annule', 'abandonne'].includes(i.status)) continue
  inscrits.set(i.session_id, (inscrits.get(i.session_id) || 0) + 1)
}

// ── Classement ──────────────────────────────────────────────────────────────
const classes = {
  bpf: [],            // lignes techniques BPF, hors activité réelle
  annulees: [],
  poei: [],           // sessions d'intervention POEI
  terminees: [],
  en_cours: [],
  a_venir: [],
  finies_mal_statuees: [],   // dates passées mais statut planifiée/confirmée
  coquilles: [],      // aucune date OU aucun stagiaire ET aucun client
  sans_client: [],
  sans_formation: [],
  futur_sans_inscrit: [],
}

for (const s of sessions) {
  const ref = String(s.reference || '')
  const n = inscrits.get(s.id) || 0
  if (ref.startsWith('BPF-')) { classes.bpf.push(s); continue }
  if (s.status === 'annulee') { classes.annulees.push(s); continue }
  if (s.poei_intervention_id) { classes.poei.push(s); continue }

  const fin = s.date_fin || s.date_debut
  if (!s.date_debut || (n === 0 && !s.client_id)) { classes.coquilles.push({ ...s, n }); continue }

  if (!s.client_id) classes.sans_client.push(s)
  if (!s.formation_id) classes.sans_formation.push(s)

  if (s.status === 'terminee') classes.terminees.push(s)
  else if (fin < AUJ) classes.finies_mal_statuees.push({ ...s, n })
  else if (s.date_debut <= AUJ) classes.en_cours.push(s)
  else { classes.a_venir.push(s); if (n === 0) classes.futur_sans_inscrit.push(s) }
}

// ── Doublons : même client, même formation, mêmes dates ─────────────────────
const parCle = new Map()
for (const s of sessions) {
  if (String(s.reference || '').startsWith('BPF-') || s.status === 'annulee') continue
  if (!s.client_id || !s.date_debut) continue
  const k = `${s.client_id}|${s.formation_id}|${s.date_debut}|${s.date_fin || ''}`
  if (!parCle.has(k)) parCle.set(k, [])
  parCle.get(k).push(s)
}
const doublons = [...parCle.values()].filter((v) => v.length > 1)

// ── Rapport ─────────────────────────────────────────────────────────────────
console.log(`SESSIONS : ${sessions.length} lignes en base\n`)
console.log('── Hors activité réelle ──')
console.log(`  lignes techniques BPF        : ${classes.bpf.length}`)
console.log(`  annulées                     : ${classes.annulees.length}`)
console.log(`  coquilles (ni date ni client): ${classes.coquilles.length}`)
console.log('\n── Activité réelle ──')
console.log(`  terminées (statut correct)   : ${classes.terminees.length}`)
console.log(`  finies mais mal statuées     : ${classes.finies_mal_statuees.length}`)
console.log(`  en cours                     : ${classes.en_cours.length}`)
console.log(`  à venir                      : ${classes.a_venir.length} (dont ${classes.futur_sans_inscrit.length} sans inscrit)`)
console.log(`  sessions POEI (interventions): ${classes.poei.length}`)
console.log('\n── Anomalies de données ──')
console.log(`  sans client                  : ${classes.sans_client.length}`)
console.log(`  sans formation               : ${classes.sans_formation.length}`)
console.log(`  doublons exacts (client+formation+dates) : ${doublons.length} groupe(s), ${doublons.reduce((a,v)=>a+v.length-1,0)} ligne(s) en trop`)

if (classes.finies_mal_statuees.length) {
  console.log('\n── Finies mais mal statuées ──')
  for (const s of classes.finies_mal_statuees) {
    console.log(`  ${(s.reference || '(sans ref)').padEnd(16)} [${s.status}] ${s.date_debut}→${s.date_fin || s.date_debut}  ${String(s.client?.raison_sociale || '—').slice(0, 24).padEnd(25)} ${s.n} inscrit(s)`)
  }
}
if (classes.coquilles.length) {
  console.log('\n── Coquilles ──')
  for (const s of classes.coquilles.slice(0, 15)) {
    console.log(`  ${(s.reference || '(sans ref)').padEnd(16)} [${s.status}] dates=${s.date_debut || '—'} client=${s.client?.raison_sociale || '—'} inscrits=${s.n} «${String(s.intitule || s.formation?.intitule || '').slice(0, 34)}»`)
  }
}
if (doublons.length) {
  console.log('\n── Doublons ──')
  for (const g of doublons.slice(0, 10)) {
    console.log(`  ${g.map((s) => `${s.reference || s.id.slice(0, 8)}[${s.status}]`).join(' = ')} — ${String(g[0].client?.raison_sociale || '').slice(0, 24)} ${g[0].date_debut}`)
  }
}
if (classes.futur_sans_inscrit.length) {
  console.log('\n── À venir sans inscrit ──')
  for (const s of classes.futur_sans_inscrit.slice(0, 10)) {
    console.log(`  ${(s.reference || '(sans ref)').padEnd(16)} ${s.date_debut}  ${String(s.client?.raison_sociale || '—').slice(0, 30)}`)
  }
}

// ── Correction évidente : finie depuis 7 jours + des inscrits → terminée ────
const aTerminer = classes.finies_mal_statuees.filter((s) => (s.date_fin || s.date_debut) < IL_Y_A_7J && s.n > 0)
console.log(`\nCorrection proposée : ${aTerminer.length} session(s) finie(s) depuis plus de 7 jours, avec inscrits → statut « terminée »`)

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}
for (const s of aTerminer) {
  const { error } = await supabase.from('sessions').update({ status: 'terminee' }).eq('id', s.id)
  if (error) throw new Error(`${s.reference} — ${error.message}`)
}
console.log(`${aTerminer.length} session(s) passée(s) en terminée.`)
