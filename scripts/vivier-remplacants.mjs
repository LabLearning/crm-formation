#!/usr/bin/env node
/**
 * Indicateur 18 — formalisation du vivier de formateurs remplaçants.
 *
 * Le vivier existe dans les faits : 40 des 46 formateurs ayant animé une
 * formation l'ont fait sur un programme aussi animé par au moins un autre
 * formateur — chacun peut donc être remplacé. Ce script pose le drapeau
 * formateur_secours sur ces formateurs, à partir des SESSIONS RÉELLES
 * (aucune capacité supposée : uniquement ce qui a déjà été animé).
 *
 *   node scripts/vivier-remplacants.mjs           (simulation)
 *   node scripts/vivier-remplacants.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const sessions = []
for (let d = 0; ; d += 1000) {
  const { data } = await supabase.from('sessions').select('formateur_id, formation_id').range(d, d + 999)
  sessions.push(...data)
  if (data.length < 1000) break
}
const { data: formateurs } = await supabase.from('formateurs').select('id, prenom, nom').eq('is_active', true)

const parFormateur = new Map()
for (const x of sessions) {
  if (!x.formateur_id || !x.formation_id) continue
  if (!parFormateur.has(x.formateur_id)) parFormateur.set(x.formateur_id, new Set())
  parFormateur.get(x.formateur_id).add(x.formation_id)
}
let n = 0
for (const f of formateurs || []) {
  const miennes = parFormateur.get(f.id)
  if (!miennes) continue
  const remplacable = [...parFormateur.entries()].some(([autre, siennes]) =>
    autre !== f.id && [...miennes].some((fm) => siennes.has(fm)))
  if (!remplacable) continue
  n++
  if (ECRIRE) await supabase.from('formateurs').update({ formateur_secours: true, updated_at: new Date().toISOString() }).eq('id', f.id)
}
console.log(`${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${n} formateurs marqués au vivier de remplacement.`)
