import { readFileSync, writeFileSync } from 'fs'
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('='); if (i > 0 && !l.startsWith('#')) process.env[l.slice(0, i).trim()] ||= l.slice(i + 1).trim()
}
async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: s } = await sb.from('sessions').select('id, reference').eq('reference', 'POEI-2026-452').single()
  const { participantsFeuille } = await import('../lib/emargement-participants')
  const participants = await participantsFeuille(sb as any, s!.id)
  console.log('participants feuille:', participants.length)
  const { data: em } = await sb.from('emargements').select('date, creneau, est_present, signature_data, apprenant_id').eq('session_id', s!.id)
  const parJour = new Map<string, number>()
  for (const e of (em||[])) if (e.signature_data) parJour.set(e.date, (parJour.get(e.date)||0)+1)
  console.log('jours avec signatures:', [...parJour.entries()].sort())
}
main()
