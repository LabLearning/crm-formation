#!/usr/bin/env node
/**
 * Croisement CRM ↔ liste réelle des sessions (matrice OPCO/POEI de sales@).
 *
 * POURQUOI : la matrice de référence compte 356 sessions réelles (AKTO,
 * Opcommerce, OPCO EP, POEI — 2025/2026) là où le CRM en compte 513. Ce
 * script rapproche chaque ligne de la matrice d'une session CRM et classe
 * les écarts des deux côtés, pour dire d'où viennent les sessions en trop.
 *
 * RAPPROCHEMENT, du plus sûr au moins sûr :
 *   1. n° de dossier OPCO (sessions.numero_dossier_opco ou reference)
 *   2. client normalisé + date de début exacte
 *   3. client normalisé + début à ±3 jours
 * Rien n'est modifié en base : c'est un état des lieux.
 *
 * USAGE : node scripts/croisement-sessions.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const MATRICE = JSON.parse(readFileSync(process.argv[2] || '/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad/matrice.json', 'utf8'))

async function tout(table, cols) {
  const lignes = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(de, de + 999)
    if (error) throw new Error(table + ': ' + error.message)
    lignes.push(...data)
    if (data.length < 1000) break
  }
  return lignes
}

const [sessions, clients, inscriptions] = await Promise.all([
  tout('sessions', 'id, reference, status, date_debut, date_fin, client_id, numero_dossier_opco, formation:formation_id(intitule), intitule, dendreo_id, created_at'),
  tout('clients', 'id, raison_sociale, nom_commercial'),
  tout('inscriptions', 'session_id'),
])
const parClient = new Map(clients.map((c) => [c.id, c]))
const inscritsParSession = new Map()
for (const i of inscriptions) inscritsParSession.set(i.session_id, (inscritsParSession.get(i.session_id) || 0) + 1)

const normDossier = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const normNom = (s) => String(s || '').toUpperCase()
  .replace(/Œ/g, 'OE').replace(/Æ/g, 'AE')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(SARL|SAS|SASU|EURL|SA|SNC)\b/g, '')
  .replace(/[^A-Z0-9]/g, '')
const jour = (s) => {
  if (!s) return null
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return String(s).slice(0, 10)
}

// Index CRM
const parDossier = new Map()
for (const s of sessions) {
  for (const cle of [normDossier(s.numero_dossier_opco), normDossier(s.reference)]) {
    if (cle && !parDossier.has(cle)) parDossier.set(cle, s)
  }
}
const nomSession = (s) => {
  const c = parClient.get(s.client_id)
  return normNom(c?.nom_commercial || c?.raison_sociale || '')
}

const rattachees = new Map() // session_id -> ligne matrice
const nonTrouvees = []

for (const m of MATRICE) {
  const cle = normDossier(m.dossier)
  let s = parDossier.get(cle) || null
  let mode = s ? 'dossier' : null
  // Si la session trouvée par n° de dossier est déjà prise par une autre
  // ligne (deux dossiers pour un même couple client/date), on retombe sur la
  // recherche par nom parmi les sessions encore libres.
  if (s && rattachees.has(s.id)) { s = null; mode = null }
  if (!s) {
    const nom = normNom(m.client)
    const debut = jour(m.debut)
    const memes = sessions.filter((x) => !rattachees.has(x.id) && nomSession(x) && nom
      && (nomSession(x).includes(nom) || nom.includes(nomSession(x))))
    s = memes.find((x) => jour(x.date_debut) === debut) || null
    mode = s ? 'client+date' : null
    if (!s && debut) {
      const t = new Date(debut).getTime()
      s = memes.find((x) => x.date_debut && Math.abs(new Date(x.date_debut).getTime() - t) <= 3 * 86400e3) || null
      mode = s ? 'client±3j' : null
    }
  }
  if (s && !rattachees.has(s.id)) rattachees.set(s.id, { m, mode })
  else if (s) nonTrouvees.push({ ...m, note: 'session CRM déjà prise par une autre ligne' })
  else nonTrouvees.push(m)
}

console.log(`Matrice : ${MATRICE.length} lignes | CRM : ${sessions.length} sessions`)
console.log(`Rattachées : ${rattachees.size} (${[...rattachees.values()].filter((x) => x.mode === 'dossier').length} par n° dossier, ${[...rattachees.values()].filter((x) => x.mode === 'client+date').length} par client+date, ${[...rattachees.values()].filter((x) => x.mode === 'client±3j').length} à ±3j)`)

console.log(`\n--- Lignes de la matrice SANS session CRM : ${nonTrouvees.length}`)
for (const m of nonTrouvees) console.log(`  #${m.n} ${String(m.financeur).padEnd(12)} ${String(m.dossier).padEnd(14)} ${String(m.client).slice(0, 28).padEnd(30)} ${m.debut || ''} ${m.note || ''}`)

const extras = sessions.filter((s) => !rattachees.has(s.id))
console.log(`\n--- Sessions CRM HORS matrice : ${extras.length}`)
const familles = {}
for (const s of extras) {
  const ref = s.reference || '(sans ref)'
  const fam = ref.startsWith('BPF-') ? 'BPF-*'
    : ref.startsWith('ADF_') ? 'ADF_* (import Dendreo)'
    : ref.startsWith('SES-') ? 'SES-*'
    : ref.startsWith('POEI-') ? 'POEI-*'
    : /^\d{2}AFE/.test(ref) ? 'xxAFE* '
    : /^\d{4}AF/.test(ref) ? 'nnnnAF*'
    : ref === '(sans ref)' ? '(sans ref)'
    : 'autre'
  if (!familles[fam]) familles[fam] = []
  familles[fam].push(s)
}
for (const [fam, liste] of Object.entries(familles).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  [${fam}] ${liste.length} sessions`)
  for (const s of liste.slice(0, 15)) {
    const c = parClient.get(s.client_id)
    console.log(`    ${String(s.reference || s.id.slice(0, 8)).padEnd(16)} ${String(s.status).padEnd(10)} ${s.date_debut || '—'} ${String(c?.nom_commercial || c?.raison_sociale || 'sans client').slice(0, 26).padEnd(28)} ${inscritsParSession.get(s.id) || 0} insc.  ${String(s.formation?.intitule || s.intitule || '').slice(0, 38)}`)
  }
  if (liste.length > 15) console.log(`    … et ${liste.length - 15} autres`)
}

// --- Doublons probables : même client + même date de début, plusieurs sessions.
// Si l'une est rattachée à la matrice et l'autre pas, la seconde est
// vraisemblablement le jumeau créé en double (import Dendreo + saisie manuelle).
console.log('\n--- Grappes même client + même date (doublons probables)')
const grappes = new Map()
for (const s of sessions) {
  if (!s.client_id || !s.date_debut) continue
  const cle = s.client_id + '|' + String(s.date_debut).slice(0, 10)
  if (!grappes.has(cle)) grappes.set(cle, [])
  grappes.get(cle).push(s)
}
let nbGrappes = 0
let extrasJumeaux = 0
for (const [, liste] of grappes) {
  if (liste.length < 2) continue
  nbGrappes++
  const aExtra = liste.some((s) => !rattachees.has(s.id))
  if (aExtra) extrasJumeaux += liste.filter((s) => !rattachees.has(s.id)).length
  if (nbGrappes <= 25) {
    const c = parClient.get(liste[0].client_id)
    console.log(`  ${String(c?.nom_commercial || c?.raison_sociale || '?').slice(0, 26).padEnd(28)} ${String(liste[0].date_debut).slice(0, 10)}`)
    for (const s of liste) {
      console.log(`      ${String(s.reference || s.id.slice(0, 8)).padEnd(16)} ${rattachees.has(s.id) ? '[matrice]' : '[EXTRA]  '} ${String(s.status).padEnd(10)} ${inscritsParSession.get(s.id) || 0} insc.  ${String(s.formation?.intitule || s.intitule || '').slice(0, 40)}`)
    }
  }
}
console.log(`\nGrappes multi-sessions : ${nbGrappes} | sessions EXTRA dans une grappe : ${extrasJumeaux}`)

// --- Règle de vérité (décision du 18/08/2026) : les sessions réelles sont
// celles de la matrice (dossiers OPCO + POEI finis) et du BPF. Les sessions
// TERMINÉES hors de ces deux ensembles sont présumées invalides (bruit
// d'import, doublons). Les sessions en cours / planifiées / confirmées hors
// matrice restent : elles n'ont juste pas encore leur dossier clos.
console.log('\n=== CLASSEMENT FINAL (règle matrice + BPF) ===')
const garder = []
const enActivite = []
const purger = []
for (const s of sessions) {
  if (rattachees.has(s.id) || String(s.reference || '').startsWith('BPF-')) garder.push(s)
  else if (s.status !== 'terminee') enActivite.push(s)
  else purger.push(s)
}
console.log(`À garder (matrice + BPF) : ${garder.length}`)
console.log(`En activité hors matrice (en cours / planifiées — dossiers pas encore clos) : ${enActivite.length}`)
console.log(`TERMINÉES hors matrice et hors BPF — présumées invalides : ${purger.length}`)
let avecInscrits = 0
for (const s of purger) if ((inscritsParSession.get(s.id) || 0) > 0) avecInscrits++
console.log(`  dont avec inscriptions : ${avecInscrits} | sans aucune inscription : ${purger.length - avecInscrits}`)
console.log('\n  Liste des présumées invalides :')
for (const s of purger.sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)))) {
  const c = parClient.get(s.client_id)
  console.log(`    ${String(s.reference || s.id.slice(0, 8)).padEnd(16)} ${String(s.date_debut).slice(0, 10)} ${String(c?.nom_commercial || c?.raison_sociale || 'sans client').slice(0, 26).padEnd(28)} ${inscritsParSession.get(s.id) || 0} insc.  ${String(s.formation?.intitule || s.intitule || '').slice(0, 40)}`)
}


import { writeFileSync } from 'fs'
const exporter = []
for (const s of sessions) {
  const c = parClient.get(s.client_id)
  const r = rattachees.get(s.id)
  exporter.push({
    ref: s.reference || s.id.slice(0, 8),
    statut: s.status,
    debut: s.date_debut ? String(s.date_debut).slice(0, 10) : null,
    client: c?.nom_commercial || c?.raison_sociale || null,
    formation: s.formation?.intitule || s.intitule || null,
    inscrits: inscritsParSession.get(s.id) || 0,
    classement: r ? 'matrice' : String(s.reference || '').startsWith('BPF-') ? 'bpf' : s.status !== 'terminee' ? 'en_activite' : 'presume_invalide',
    dossier: r?.m?.dossier || s.numero_dossier_opco || null,
    financeur: r?.m?.financeur || null,
  })
}
const manquantes = nonTrouvees.filter((m) => !m.note)
writeFileSync('/private/tmp/claude-501/-Users-brahimouchrif-Projects-crm-lablearning/04d3a660-0bb5-4829-a5e1-685cc8491e7f/scratchpad/classement.json', JSON.stringify({ sessions: exporter, manquantes }, null, 1))
console.log('\nExport classement.json écrit —', exporter.length, 'sessions,', manquantes.length, 'manquantes')
