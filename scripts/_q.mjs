import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local','utf8')
const supabase = createClient(env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1], env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1])
const ORG='ff747dfe-c034-44d8-98d7-e53892263fb5'

const { data: docs } = await supabase.from('documents')
  .select('id, type, origine, session_id, formateur_id, file_name')
  .eq('organization_id', ORG)
  .gte('created_at', new Date(Date.now() - 3*3600*1000).toISOString())

console.log('Pieces deposees ces 3 dernieres heures :', (docs||[]).length)
if (!docs?.length) { console.log('\nRien pour l instant.'); process.exit(0) }

const parType = new Map()
for (const d of docs) parType.set(d.type, (parType.get(d.type)||0)+1)
console.log('\nPAR TYPE')
for (const [t,n] of [...parType].sort((a,b)=>b[1]-a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`)

const sids = [...new Set(docs.filter(d=>d.session_id).map(d=>d.session_id))]
console.log(`\n${sids.length} sessions concernees`)

// impact reel : sessions qui gagnent un emargement
const emarg = [...new Set(docs.filter(d=>d.type==='emargement_signe').map(d=>d.session_id))].filter(Boolean)
if (emarg.length) {
  const { data: ses } = await supabase.from('sessions')
    .select('reference, date_debut, status, client:client_id(raison_sociale)').in('id', emarg)
  const { data: signes } = await supabase.from('emargements').select('session_id').in('session_id', emarg).not('signature_data','is',null)
  const avecSign = new Set((signes||[]).map(s=>s.session_id))
  console.log(`\nEMARGEMENTS deposes sur ${emarg.length} sessions :`)
  for (const s of (ses||[]).sort((a,b)=>a.date_debut<b.date_debut?1:-1).slice(0,40))
    console.log(`  ${(s.reference||'?').padEnd(16)} ${s.date_debut} ${s.status.padEnd(9)} ${(s.client?.raison_sociale||'').slice(0,26)}`)
  if ((ses||[]).length > 40) console.log(`  … et ${ses.length-40} autres`)
}
