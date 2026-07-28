#!/usr/bin/env node
/**
 * Rattache le QCM d'évaluation des acquis (type 'sortie', publié) de chaque
 * formation à TOUTES ses sessions (existantes), via qcm_sessions. Idempotent.
 *
 *   node migration/backfill-qcm-sessions.mjs            → DRY-RUN (compte)
 *   node migration/backfill-qcm-sessions.mjs --apply    → insère les liens
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const DRY = !process.argv.includes('--apply')
const SBASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const H = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }

async function getAll(path) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SBASE}/rest/v1${path}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    if (!r.ok) throw new Error(`${path} → ${r.status} ${(await r.text()).slice(0, 200)}`)
    const b = await r.json(); rows.push(...b)
    if (b.length < 1000) break
  }
  return rows
}

// TOUS les QCM publiés (tous types Qualiopi) → map formation_id → [qcm_id]
const qcms = await getAll(`/qcm?organization_id=eq.${ORG}&status=eq.publie&formation_id=not.is.null&select=id,formation_id`)
const qcmByForm = new Map()
for (const q of qcms) {
  if (!qcmByForm.has(q.formation_id)) qcmByForm.set(q.formation_id, [])
  qcmByForm.get(q.formation_id).push(q.id)
}

// Sessions + formations multiples
const sessions = await getAll(`/sessions?organization_id=eq.${ORG}&select=id,formation_id`)
const sf = await getAll(`/session_formations?select=session_id,formation_id`)
const extraForms = new Map()
for (const r of sf) {
  if (!extraForms.has(r.session_id)) extraForms.set(r.session_id, [])
  extraForms.get(r.session_id).push(r.formation_id)
}

// Liens déjà existants
const existing = await getAll(`/qcm_sessions?organization_id=eq.${ORG}&select=session_id,qcm_id`)
const linked = new Set(existing.map((e) => `${e.session_id}:${e.qcm_id}`))

const toInsert = []
for (const s of sessions) {
  const forms = new Set([s.formation_id, ...(extraForms.get(s.id) || [])].filter(Boolean))
  for (const fid of forms) {
    for (const qid of (qcmByForm.get(fid) || [])) {
      if (linked.has(`${s.id}:${qid}`)) continue
      linked.add(`${s.id}:${qid}`)
      toInsert.push({ organization_id: ORG, qcm_id: qid, session_id: s.id, date_ouverture: new Date().toISOString() })
    }
  }
}

console.log(`sessions=${sessions.length} qcm_publies=${qcms.length} liens_a_creer=${toInsert.length}`)
if (DRY) { console.log('DRY-RUN — rien inséré. Ajouter --apply pour écrire.'); process.exit(0) }

let created = 0
for (let i = 0; i < toInsert.length; i += 500) {
  const batch = toInsert.slice(i, i + 500)
  const r = await fetch(`${SBASE}/rest/v1/qcm_sessions`, { method: 'POST', headers: H, body: JSON.stringify(batch) })
  if (!r.ok) throw new Error(`insert → ${r.status} ${(await r.text()).slice(0, 200)}`)
  created += batch.length
}
console.log(`Liens créés : ${created}`)
