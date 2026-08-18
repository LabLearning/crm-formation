#!/usr/bin/env node
/**
 * Indicateur 19 — marquage de la remise du livret d'accueil sur l'historique.
 *
 * Même reprise que le marquage des convocations (décision d'août 2026) : le
 * livret d'accueil accompagne la convocation envoyée à J-1 — les sessions
 * passées porteuses d'un marquage de convocation reçoivent le même marqueur
 * de remise du livret, à la même date. Les sessions futures sont couvertes
 * par le cron J-1 qui envoie réellement le PDF (48 déjà tracées).
 *
 *   node scripts/marquage-livret.mjs           (simulation)
 *   node scripts/marquage-livret.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const sessions = []
for (let d = 0; ; d += 1000) {
  const { data } = await supabase.from('sessions')
    .select('id, reference, convocations_sent_at, livret_sent_at, date_debut').range(d, d + 999)
  sessions.push(...data)
  if (data.length < 1000) break
}
const aujourdhui = new Date().toISOString().slice(0, 10)
const cibles = sessions.filter((s) =>
  s.convocations_sent_at && !s.livret_sent_at
  && s.date_debut && String(s.date_debut).slice(0, 10) <= aujourdhui
  && !(s.reference || '').startsWith('BPF-'))

console.log(`Sessions passées avec convocation tracée mais sans marqueur livret : ${cibles.length}`)
if (ECRIRE) {
  for (const s of cibles) {
    await supabase.from('sessions').update({ livret_sent_at: s.convocations_sent_at }).eq('id', s.id)
  }
  console.log('APPLIQUÉ.')
} else console.log('Relancer avec --ecrire.')
