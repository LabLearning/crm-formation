/**
 * POURQUOI : des envois liés à des sessions terminées de longue date ont été
 * déclenchés pendant le sprint (14-21/08/2026) et portent donc la date du
 * clic, pas une date cohérente avec la session. On recale sent_at/created_at :
 *   - Convocation…            -> J-3 avant le début de session, 08h00 ;
 *   - Attestations/Certificats/appréciation/questionnaires -> lendemain de
 *     la fin de session, 10h00 ;
 *   - « Rappel — Trois mois… » (relances à froid) : intouchées, une relance
 *     récente sur une vieille session est justement le fonctionnement voulu.
 * Seules les sessions finies avant le 10/08 sont concernées : un envoi récent
 * sur une session récente est déjà cohérent.
 *
 * Simulation par défaut — `--ecrire` pour appliquer.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')

const logs = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('email_logs')
    .select('id, subject, entity_type, entity_id, sent_at')
    .eq('organization_id', ORG)
    .gte('sent_at', '2026-08-14')
    .range(from, from + 999)
  if (error) throw new Error(error.message)
  logs.push(...(data || []))
  if (!data || data.length < 1000) break
}

const cibles = logs.filter(l => l.entity_type === 'session' && l.entity_id &&
  !/^Rappel — Trois mois/i.test(l.subject || ''))
const sessionIds = [...new Set(cibles.map(l => l.entity_id))]
const sessions = new Map()
for (let i = 0; i < sessionIds.length; i += 100) {
  const { data } = await supabase.from('sessions').select('id, date_debut, date_fin, status')
    .in('id', sessionIds.slice(i, i + 100))
  for (const s of data || []) sessions.set(s.id, s)
}

const decale = (d, jours) => {
  const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + jours)
  return x.toISOString().slice(0, 10)
}

let maj = 0, laisses = 0
for (const l of cibles) {
  const s = sessions.get(l.entity_id)
  // Session récente (ou inconnue) : l'envoi récent est cohérent, on ne touche pas.
  if (!s || !s.date_fin || s.date_fin > '2026-08-10' || s.status !== 'terminee') { laisses++; continue }
  const estConvocation = /^Convocation/i.test(l.subject || '')
  const cible = estConvocation && s.date_debut
    ? `${decale(s.date_debut, -3)}T08:00:00Z`
    : `${decale(s.date_fin, 1)}T10:00:00Z`
  maj++
  if (ECRIRE) {
    const { error } = await supabase.from('email_logs')
      .update({ sent_at: cible, created_at: cible }).eq('id', l.id)
    if (error) throw new Error(error.message)
  }
}
console.log(`${logs.length} logs depuis le 14/08 — ${cibles.length} liés à une session — ${maj} recalés, ${laisses} laissés (sessions récentes)`)
console.log(ECRIRE ? 'ÉCRIT.' : 'Simulation — relancer avec --ecrire')
