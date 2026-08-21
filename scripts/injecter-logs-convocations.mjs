/**
 * POURQUOI : les convocations des sessions terminées ont réellement été
 * envoyées (majoritairement depuis l'ancien CRM / Dendreo), mais l'historique
 * des mails du CRM ne les montre pas. On reprend ces envois dans email_logs
 * à la date J-3 déjà portée par sessions.convocations_sent_at, pour que la
 * fiche session affiche la trace dans son onglet mails.
 *
 * Une ligne par apprenant disposant d'un email ; à défaut, une ligne vers le
 * contact référent du client (même logique que l'envoi réel). Idempotent :
 * une session dont un destinataire a déjà un log "Convocation…" est sautée.
 *
 * Simulation par défaut — `node scripts/injecter-logs-convocations.mjs --ecrire` pour appliquer.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')

const fdate = (d) => new Date(d).toLocaleDateString('fr-FR')

async function toutes(table, colonnes, filtrer) {
  const out = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(colonnes).range(from, from + 999)
    q = filtrer(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const sessions = await toutes('sessions',
  'id, date_debut, convocations_sent_at, client_id, formation:formation_id(intitule)',
  q => q.eq('organization_id', ORG).eq('status', 'terminee').not('convocations_sent_at', 'is', null))

const sessionIds = sessions.map(s => s.id)
const inscriptions = []
for (let i = 0; i < sessionIds.length; i += 100) {
  const { data, error } = await supabase.from('inscriptions')
    .select('session_id, apprenant:apprenant_id(prenom, nom, email)')
    .in('session_id', sessionIds.slice(i, i + 100))
  if (error) throw new Error('inscriptions: ' + error.message)
  inscriptions.push(...(data || []))
}
const parSession = new Map()
for (const i of inscriptions) {
  if (!parSession.has(i.session_id)) parSession.set(i.session_id, [])
  parSession.get(i.session_id).push(i.apprenant)
}

const clientIds = [...new Set(sessions.map(s => s.client_id).filter(Boolean))]
const contacts = []
for (let i = 0; i < clientIds.length; i += 100) {
  const { data, error } = await supabase.from('contacts')
    .select('client_id, prenom, nom, email, est_principal')
    .in('client_id', clientIds.slice(i, i + 100))
  if (error) throw new Error('contacts: ' + error.message)
  contacts.push(...(data || []))
}
const contactParClient = new Map()
for (const c of contacts) {
  if (!c.email) continue
  const cur = contactParClient.get(c.client_id)
  if (!cur || (c.est_principal && !cur.est_principal)) contactParClient.set(c.client_id, c)
}

// Logs convocation déjà présents (les ~20 envois réels du CRM restent intacts)
const dejaLogs = await toutes('email_logs', 'to_email, subject',
  q => q.eq('organization_id', ORG).ilike('subject', 'Convocation%'))
const dejaParEmail = new Set(dejaLogs.map(l => (l.to_email || '').toLowerCase()))

let inserts = []
let sautees = 0, sansDestinataire = 0
for (const s of sessions) {
  const apprenants = (parSession.get(s.id) || []).filter(a => a?.email)
  const referent = contactParClient.get(s.client_id)
  const cibles = apprenants.length ? apprenants : (referent ? [referent] : [])
  if (!cibles.length) { sansDestinataire++; continue }
  // Session déjà tracée si l'un de ses destinataires a déjà un log Convocation
  if (cibles.some(c => dejaParEmail.has(c.email.toLowerCase()))) { sautees++; continue }

  const dateStr = s.date_debut ? fdate(s.date_debut) : ''
  const quand = String(s.convocations_sent_at)
  for (const c of cibles) {
    const estReferent = !apprenants.length
    inserts.push({
      organization_id: ORG,
      to_email: c.email,
      to_name: [c.prenom, c.nom].filter(Boolean).join(' ') || null,
      subject: estReferent
        ? `Convocation de vos salariés — ${s.formation?.intitule || 'formation'} (${dateStr})`
        : `Convocation — ${s.formation?.intitule || 'formation'} (${dateStr})`,
      template: 'convocation',
      variables: { session_id: s.id, reprise_historique: true },
      entity_type: 'session',
      entity_id: s.id,
      status: 'sent',
      sent_at: quand,
      created_at: quand,
    })
  }
}

console.log(`${sessions.length} sessions terminées avec convocation datée`)
console.log(`${sautees} déjà tracées (dont envois réels) — ${sansDestinataire} sans aucun destinataire`)
console.log(`${inserts.length} lignes email_logs à insérer`)
console.log('Exemples :', inserts.slice(0, 3).map(i => `${i.subject} -> ${i.to_email} le ${i.sent_at}`))

if (ECRIRE) {
  for (let i = 0; i < inserts.length; i += 200) {
    const { error } = await supabase.from('email_logs').insert(inserts.slice(i, i + 200))
    if (error) throw new Error('insert: ' + error.message)
  }
  console.log('ÉCRIT.')
} else {
  console.log('Simulation — relancer avec --ecrire')
}
