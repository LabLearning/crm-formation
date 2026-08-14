#!/usr/bin/env node
/**
 * Marquage des convocations sur les sessions passées.
 *
 * Sous Dendreo, la convocation partait pour chaque session — c'est une ligne
 * de son circuit d'emails — mais la bascule n'a pas rapporté ce jalon :
 * 480 sessions passées n'ont pas de convocations_sent_at, et le tableau de
 * bord les affiche « convocation non envoyée » à tort.
 *
 * On pose le marqueur à la veille du début de session, 08:00 — l'heure du
 * cron, puisque c'est un envoi automatisé qui est ainsi consigné. Seules les
 * sessions déjà commencées sont reprises : celles à venir passent par le vrai
 * cron, qui envoie de vrais emails. updated_at garde la trace de la reprise.
 *
 *   node scripts/marquage-convocations.mjs           # simulation
 *   node scripts/marquage-convocations.mjs --ecrire
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
const AUJ = new Date().toISOString().split('T')[0]

const pages = async (fn) => { const o=[]; for(let f=0;;f+=500){const{data,error}=await fn(f,f+499); if(error) throw new Error(error.message); o.push(...(data||[])); if((data||[]).length<500) break} return o }

const sessions = (await pages((f,t) => supabase.from('sessions')
  .select('id, reference, date_debut, status')
  .eq('organization_id', ORG)
  .is('convocations_sent_at', null)
  .not('date_debut', 'is', null)
  .lte('date_debut', AUJ)
  .neq('status', 'annulee')
  .range(f,t)))
  .filter((s) => !String(s.reference || '').startsWith('BPF-'))

console.log(`Sessions passées sans marquage de convocation : ${sessions.length}`)

if (!ECRIRE) {
  for (const s of sessions.slice(0, 8)) console.log(`  ${s.reference || '(sans ref)'} — début ${s.date_debut} → convocation ${s.date_debut} - 1 jour`)
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

let n = 0
for (const s of sessions) {
  const veille = new Date(s.date_debut + 'T08:00:00Z')
  veille.setUTCDate(veille.getUTCDate() - 1)
  const { error } = await supabase.from('sessions')
    .update({ convocations_sent_at: veille.toISOString() }).eq('id', s.id)
  if (error) throw new Error(`${s.reference} — ${error.message}`)
  n++
}
console.log(`${n} session(s) marquée(s).`)
