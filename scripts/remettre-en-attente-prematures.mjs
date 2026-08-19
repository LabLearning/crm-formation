#!/usr/bin/env node
/**
 * Réponses questionnaires prématurées — remise en attente.
 *
 * RÈGLE : une évaluation de sortie ou une satisfaction ne peut pas être
 * complétée avant la FIN de la session ; un positionnement ne peut pas
 * l'être avant son DÉBUT. Les réponses saisies en avance (formateurs zélés)
 * repassent en attente : la ligne reste, le détail et le score partent en
 * sauvegarde — resaisissable le moment venu.
 *
 *   node scripts/remettre-en-attente-prematures.mjs           (simulation)
 *   node scripts/remettre-en-attente-prematures.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function tout(table, cols) {
  const o = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(d, d + 999)
    if (error) throw new Error(table + ': ' + error.message)
    o.push(...data)
    if (data.length < 1000) break
  }
  return o
}

const [sessions, reponses, qcms] = await Promise.all([
  tout('sessions', 'id, reference, status, date_debut, date_fin'),
  tout('qcm_reponses', 'id, session_id, qcm_id, is_complete, score, completed_at'),
  tout('qcm', 'id, type'),
])
const typeQcm = new Map(qcms.map((q) => [q.id, q.type]))
const parSession = new Map(sessions.map((x) => [x.id, x]))
const auj = new Date().toISOString().slice(0, 10)

const aRemettre = []
for (const r of reponses) {
  if (!r.is_complete) continue
  const sess = parSession.get(r.session_id)
  if (!sess) continue
  const type = typeQcm.get(r.qcm_id)
  const commencee = sess.date_debut && String(sess.date_debut).slice(0, 10) <= auj && !['planifiee', 'confirmee'].includes(sess.status)
  const finie = sess.status === 'terminee' && (!sess.date_fin || String(sess.date_fin).slice(0, 10) <= auj)
  const prematuree =
    (['sortie', 'satisfaction_chaud', 'satisfaction_froid'].includes(type) && !finie) ||
    (['positionnement', 'entree'].includes(type) && !commencee)
  if (prematuree) aRemettre.push({ r, ref: sess.reference || sess.id.slice(0, 8), type, statut: sess.status })
}

console.log(`Réponses prématurées à remettre en attente : ${aRemettre.length}`)
const parCle = {}
for (const x of aRemettre) parCle[`${x.ref} ${x.type}`] = (parCle[`${x.ref} ${x.type}`] || 0) + 1
for (const [k, n] of Object.entries(parCle).sort()) console.log(`  ${k} -> ${n}`)

if (ECRIRE && aRemettre.length) {
  const { mkdirSync, writeFileSync } = await import('fs')
  mkdirSync('backups', { recursive: true })
  const sauvegarde = []
  for (const { r } of aRemettre) {
    const { data: det } = await supabase.from('qcm_reponses_detail').select('*').eq('reponse_id', r.id)
    const { data: ligne } = await supabase.from('qcm_reponses').select('*').eq('id', r.id).single()
    sauvegarde.push({ reponse: ligne, details: det || [] })
  }
  writeFileSync(`backups/reponses-prematurees-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(sauvegarde))
  console.log(`Sauvegarde : backups/reponses-prematurees-… (${sauvegarde.length} réponses avec leur détail)`)

  for (const { r } of aRemettre) {
    await supabase.from('qcm_reponses_detail').delete().eq('reponse_id', r.id)
    await supabase.from('qcm_reponses').update({
      is_complete: false, score: null, score_points: null, score_total: null,
      is_reussi: null, completed_at: null,
    }).eq('id', r.id)
  }
  console.log('APPLIQUÉ — remises en attente.')
} else if (aRemettre.length) console.log('Relancer avec --ecrire.')
