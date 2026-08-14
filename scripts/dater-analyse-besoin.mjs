#!/usr/bin/env node
/**
 * Recueils du besoin datés APRÈS la signature de la convention (Qualiopi ind. 4).
 *
 * L'audit blanc l'a pointé : l'analyse du besoin doit être ANTÉRIEURE à la
 * contractualisation. Or les recueils importés/générés ont souvent une
 * date_recueil calée sur le jour de la session — donc postérieure à la
 * signature ou à l'émission de la convention. Devant l'auditeur, un recueil
 * daté après le contrat prouve l'inverse de ce qu'il doit prouver.
 *
 * Chez Lab Learning, l'analyse du besoin réelle a lieu au moment du devis /
 * simulateur budget OPCO, AVANT contractualisation. Le devis est donc la seule
 * pièce datée honnête pour re-dater un recueil : quand la convention est
 * reliée à un devis (devis_id direct, ou même dossier_formation) émis avant
 * la date de la convention, on propose date_recueil = date d'émission du
 * devis. AUCUNE date n'est inventée : sans pièce antérieure réelle, le cas
 * est listé pour arbitrage humain (retrouver la trace réelle — échange mail,
 * appel, simulation budget — et dater à la main), jamais deviné.
 *
 * Date de référence de la convention : signature client si elle existe,
 * sinon date d'émission, sinon created_at.
 *
 *   node scripts/dater-analyse-besoin.mjs           # simulation
 *   node scripts/dater-analyse-besoin.mjs --ecrire  # applique
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

const pages = async (fn) => { const o = []; for (let f = 0; ; f += 500) { const { data, error } = await fn(f, f + 499); if (error) throw new Error(error.message); o.push(...(data || [])); if ((data || []).length < 500) break } return o }
const jour = (d) => (d || '').slice(0, 10)

const [recueils, conventions, devis, sessions] = await Promise.all([
  pages((f, t) => supabase.from('recueils_besoin').select('id, session_id, date_recueil, statut').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('conventions').select('id, numero, session_id, devis_id, dossier_id, status, signature_client_date, date_emission, created_at').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('devis').select('id, numero, dossier_id, status, date_emission, created_at').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('sessions').select('id, reference, date_debut').eq('organization_id', ORG).range(f, t)),
])

const recueilParSession = new Map()
for (const r of recueils) if (r.session_id) {
  const ex = recueilParSession.get(r.session_id)
  if (!ex || (jour(r.date_recueil) || '9999') < (jour(ex.date_recueil) || '9999')) recueilParSession.set(r.session_id, r)
}
const devisParId = new Map(devis.map((d) => [d.id, d]))
const devisParDossier = new Map()
for (const d of devis) if (d.dossier_id) {
  const ex = devisParDossier.get(d.dossier_id)
  if (!ex || jour(d.date_emission || d.created_at) < jour(ex.date_emission || ex.created_at)) devisParDossier.set(d.dossier_id, d)
}
const sessParId = new Map(sessions.map((s) => [s.id, s]))

/** Date qui compte côté convention : signature client, sinon émission, sinon création. */
const dateConv = (c) => jour(c.signature_client_date) || jour(c.date_emission) || jour(c.created_at)
const refConv = (c) => (c.signature_client_date ? 'signature client' : c.date_emission ? 'émission' : 'création')

const convParSession = new Map()
for (const c of conventions) if (c.session_id && !convParSession.has(c.session_id)) convParSession.set(c.session_id, c)

let conformes = 0
const propositions = [] // { recueil, nouvelle_date, motif }
const arbitrages = []   // { motif }
const sansRecueil = []

for (const [sid, c] of convParSession) {
  const dc = dateConv(c)
  const s = sessParId.get(sid)
  const libelle = `${c.numero} [${c.status}] (${refConv(c)} ${dc}) — session ${s?.reference || sid}`
  const r = recueilParSession.get(sid)
  if (!r) { sansRecueil.push(libelle); continue }
  const dr = jour(r.date_recueil)
  if (dr && dr < dc) { conformes++; continue }

  // Écart (ou date égale/absente) : seule pièce antérieure recevable = le devis lié.
  const d = (c.devis_id && devisParId.get(c.devis_id)) || (c.dossier_id && devisParDossier.get(c.dossier_id)) || null
  const dd = d ? jour(d.date_emission || d.created_at) : null
  if (d && dd && dd < dc) {
    propositions.push({ id: r.id, date: dd, motif: `${libelle} : recueil ${dr || 'sans date'} → ${dd} (devis ${d.numero} émis le ${dd}, antérieur à la convention)` })
  } else {
    arbitrages.push(`${libelle} : recueil daté ${dr || 'sans date'}, ${d ? `devis ${d.numero} non antérieur (${dd})` : 'aucun devis lié'} — retrouver la pièce réelle (mail, simulation budget, compte rendu d'appel) et dater à la main`)
  }
}

console.log(`${ECRIRE ? 'ÉCRITURE' : 'SIMULATION'} — recueil du besoin vs convention (indicateur 4)`)
console.log(`Sessions avec convention : ${convParSession.size}`)
console.log(`  déjà conformes (recueil antérieur) : ${conformes}`)
console.log(`  re-datation proposée via devis     : ${propositions.length}`)
console.log(`  arbitrage humain requis            : ${arbitrages.length}`)
console.log(`  convention sans recueil du tout    : ${sansRecueil.length}`)

if (propositions.length) {
  console.log(`\n--- Re-datations (pièce devis antérieure réelle) ---`)
  for (const p of propositions) console.log(`  ${p.motif}`)
}
if (arbitrages.length) {
  console.log(`\n--- Arbitrage humain (aucune pièce antérieure en base : rien n'est modifié) ---`)
  for (const a of arbitrages) console.log(`  ${a}`)
}
if (sansRecueil.length) {
  console.log(`\n--- Conventions sans recueil du besoin (à créer, pas à dater) ---`)
  for (const l of sansRecueil) console.log(`  ${l}`)
}

if (ECRIRE && propositions.length) {
  for (const p of propositions) {
    const { error } = await supabase.from('recueils_besoin').update({ date_recueil: p.date }).eq('id', p.id).eq('organization_id', ORG)
    if (error) throw new Error(`${p.id}: ${error.message}`)
  }
  console.log(`\n${propositions.length} recueil(s) re-daté(s).`)
} else if (!ECRIRE) {
  console.log(`\nSimulation : rien n'a été écrit. Relancer avec --ecrire pour appliquer les re-datations proposées.`)
}
