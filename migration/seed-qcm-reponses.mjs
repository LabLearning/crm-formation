#!/usr/bin/env node
/**
 * Sème les qcm_reponses (l'assignation lue par le portail apprenant) pour les
 * sessions existantes, selon le moment du cycle Qualiopi :
 *   planifiee/confirmee → positionnement + entree
 *   en_cours            → + sortie + satisfaction_chaud
 *   terminee            → + satisfaction_froid (tous)
 * SILENCIEUX : n'envoie AUCUN email/WhatsApp (backfill). Idempotent : dédoublonne
 * par (qcm_id, apprenant_id), comme seedQcmReponsesForSession.
 *
 *   node migration/seed-qcm-reponses.mjs            → DRY-RUN
 *   node migration/seed-qcm-reponses.mjs --apply    → écrit
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

const TYPES_BY_STATUS = {
  planifiee: ['positionnement', 'entree'],
  confirmee: ['positionnement', 'entree'],
  en_cours: ['positionnement', 'entree', 'sortie', 'satisfaction_chaud'],
  terminee: ['positionnement', 'entree', 'sortie', 'satisfaction_chaud', 'satisfaction_froid'],
}

// QCM publiés : (formation_id, type) → qcm_id
const qcms = await getAll(`/qcm?organization_id=eq.${ORG}&status=eq.publie&formation_id=not.is.null&select=id,formation_id,type`)
const qcmByFT = new Map()
for (const q of qcms) qcmByFT.set(`${q.formation_id}:${q.type}`, q.id)

const sessions = await getAll(`/sessions?organization_id=eq.${ORG}&formation_id=not.is.null&select=id,formation_id,status`)
const inscriptions = await getAll(`/inscriptions?organization_id=eq.${ORG}&select=session_id,apprenant_id,status`)
const insBySession = new Map()
for (const i of inscriptions) {
  if (['annule', 'abandonne'].includes(i.status)) continue
  if (!i.apprenant_id) continue
  if (!insBySession.has(i.session_id)) insBySession.set(i.session_id, [])
  insBySession.get(i.session_id).push(i.apprenant_id)
}

// réponses déjà existantes : clé (qcm_id, apprenant_id)
const existing = await getAll(`/qcm_reponses?organization_id=eq.${ORG}&select=qcm_id,apprenant_id`)
const seen = new Set(existing.map((e) => `${e.qcm_id}:${e.apprenant_id}`))

const toInsert = []
const byType = {}
for (const s of sessions) {
  const types = TYPES_BY_STATUS[s.status]
  if (!types) continue
  const apprenants = insBySession.get(s.id) || []
  if (apprenants.length === 0) continue
  for (const t of types) {
    const qid = qcmByFT.get(`${s.formation_id}:${t}`)
    if (!qid) continue
    for (const aid of apprenants) {
      const key = `${qid}:${aid}`
      if (seen.has(key)) continue
      seen.add(key)
      toInsert.push({ organization_id: ORG, qcm_id: qid, apprenant_id: aid, session_id: s.id, is_complete: false })
      byType[t] = (byType[t] || 0) + 1
    }
  }
}

console.log('sessions=' + sessions.length, '| réponses à semer=' + toInsert.length, '| par type=' + JSON.stringify(byType))
if (DRY) { console.log('DRY-RUN — rien écrit. Ajouter --apply.'); process.exit(0) }

let created = 0
for (let i = 0; i < toInsert.length; i += 500) {
  const batch = toInsert.slice(i, i + 500)
  const r = await fetch(`${SBASE}/rest/v1/qcm_reponses`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(batch) })
  if (!r.ok) throw new Error(`insert → ${r.status} ${(await r.text()).slice(0, 200)}`)
  created += batch.length
}
console.log('Réponses créées : ' + created)
