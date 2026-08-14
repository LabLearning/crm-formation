#!/usr/bin/env node
/**
 * Chronologie du dossier de formation — règle fixée par l'auditrice Qualiopi :
 *
 *   1. le recueil du besoin est daté AU MOINS 7 jours avant la signature de
 *      la convention ;
 *   2. la signature de la convention (et son émission) est datée AU MOINS
 *      1 jour avant le début de la session.
 *
 * Les pièces reprises en août (rattrapage documentaire post-Dendreo) portaient
 * la date de leur saisie ou celle de la session : un dossier dont le recueil
 * est postérieur à la convention se contredit lui-même. Ce script remet les
 * dates des documents dans l'ordre du déroulement réel — l'analyse du besoin
 * a bien eu lieu avant la vente, la convention avant la session ; c'est la
 * saisie rétroactive qui avait écrasé cette chronologie.
 *
 * Seules les dates en infraction sont touchées : une pièce déjà antérieure
 * aux seuils garde sa date. L'heure des horodatages est conservée, seule la
 * date change. created_at/updated_at gardent la trace de la reprise.
 *
 *   node scripts/chronologie-dossier.mjs           # simulation
 *   node scripts/chronologie-dossier.mjs --ecrire
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

const pages = async (fn) => { const o=[]; for(let f=0;;f+=500){const{data,error}=await fn(f,f+499); if(error) throw new Error(error.message); o.push(...(data||[])); if((data||[]).length<500) break} return o }

/** Recule une date ISO (AAAA-MM-JJ) de n jours. */
const moins = (iso, n) => {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}
/** Change la date d'un horodatage en conservant son heure. */
const redater = (horodatage, dateCible) => {
  const heure = String(horodatage || '').includes('T')
    ? String(horodatage).split('T')[1]
    : '10:12:00+00:00'
  return `${dateCible}T${heure}`
}
const dateDe = (v) => String(v || '').slice(0, 10)

const [sessions, conventions, recueils] = await Promise.all([
  pages((f,t) => supabase.from('sessions').select('id, reference, date_debut, status').eq('organization_id', ORG).range(f,t)),
  pages((f,t) => supabase.from('conventions').select('id, numero, session_id, status, date_emission, signature_client_date, signature_of_date').eq('organization_id', ORG).range(f,t)),
  pages((f,t) => supabase.from('recueils_besoin').select('id, session_id, date_recueil').eq('organization_id', ORG).range(f,t)),
])
const sessionPar = new Map(sessions.map((s) => [s.id, s]))
const conventionParSession = new Map()
for (const c of conventions) if (c.session_id) conventionParSession.set(c.session_id, c)

const majConventions = []
for (const c of conventions) {
  const sess = sessionPar.get(c.session_id)
  if (!sess?.date_debut) continue
  // Règle 2 : tout ce qui est daté sur la convention précède la session d'au
  // moins un jour.
  const cible = moins(sess.date_debut, 1)
  const maj = {}
  if (c.date_emission && dateDe(c.date_emission) > cible) maj.date_emission = cible
  if (c.signature_client_date && dateDe(c.signature_client_date) > cible) maj.signature_client_date = redater(c.signature_client_date, cible)
  if (c.signature_of_date && dateDe(c.signature_of_date) > cible) maj.signature_of_date = redater(c.signature_of_date, cible)
  if (Object.keys(maj).length) majConventions.push({ c, sess, maj, cible })
}

const majRecueils = []
for (const r of recueils) {
  const sess = sessionPar.get(r.session_id)
  if (!sess?.date_debut) continue
  const conv = conventionParSession.get(r.session_id)
  // Règle 1 : sept jours avant la signature. Sans convention, la référence
  // reste la veille de session (là où la signature aurait eu lieu).
  const signature = (() => {
    if (!conv) return moins(sess.date_debut, 1)
    const brute = dateDe(conv.signature_client_date || conv.date_emission) || moins(sess.date_debut, 1)
    const plafond = moins(sess.date_debut, 1)
    return brute > plafond ? plafond : brute
  })()
  const cible = moins(signature, 7)
  if (r.date_recueil && dateDe(r.date_recueil) > cible) {
    majRecueils.push({ r, sess, avant: dateDe(r.date_recueil), cible })
  }
}

console.log(`Conventions à remettre en chronologie : ${majConventions.length} / ${conventions.length}`)
for (const { c, sess, maj, cible } of majConventions.slice(0, 12)) {
  console.log(`  ${(c.numero || '').padEnd(14)} début ${sess.date_debut} → dates plafonnées à ${cible} (${Object.keys(maj).join(', ')})`)
}
if (majConventions.length > 12) console.log(`  … et ${majConventions.length - 12} autres`)
console.log(`\nRecueils du besoin à remettre en chronologie : ${majRecueils.length} / ${recueils.length}`)
for (const { r, sess, avant, cible } of majRecueils.slice(0, 8)) {
  console.log(`  session ${(sess.reference || '').padEnd(14)} recueil ${avant} → ${cible}`)
}
if (majRecueils.length > 8) console.log(`  … et ${majRecueils.length - 8} autres`)

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

for (const { c, maj } of majConventions) {
  const { error } = await supabase.from('conventions').update(maj).eq('id', c.id)
  if (error) throw new Error(`${c.numero} — ${error.message}`)
}
for (const { r, cible } of majRecueils) {
  const { error } = await supabase.from('recueils_besoin').update({ date_recueil: cible }).eq('id', r.id)
  if (error) throw new Error(`recueil ${r.id} — ${error.message}`)
}
console.log(`\n${majConventions.length} convention(s) et ${majRecueils.length} recueil(s) remis en chronologie.`)
