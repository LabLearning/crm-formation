#!/usr/bin/env node
/**
 * Complète les modalités pédagogiques des formations qui n'en ont pas
 * (indicateur 6) : le déroulé intra par phase — apports théoriques courts,
 * démonstration au poste, mise en pratique sur l'équipement réel,
 * évaluation. Les fiches qui ont déjà leur texte ne sont pas touchées.
 *
 *   node scripts/modalites-pedagogiques.mjs           (simulation)
 *   node scripts/modalites-pedagogiques.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TEXTE = `Formation en intra-entreprise, sur le lieu de travail et l'équipement réel de l'établissement. Chaque module alterne : apports théoriques courts illustrés de cas du secteur ; démonstration par le formateur au poste de travail ; mise en pratique individuelle par le stagiaire sur son propre matériel, avec reprise des gestes non acquis ; questions-réponses ancrées dans le quotidien de l'équipe. Supports remis aux stagiaires (papier et portail en ligne). Positionnement individuel à l'entrée, évaluation des acquis en sortie ; adaptation du rythme et des modalités aux besoins repérés (niveau de français, situation de handicap — voir processus PROC-10).`

const { data: formations } = await supabase.from('formations')
  .select('id, intitule, methodes_pedagogiques').eq('is_active', true)
let n = 0
for (const f of formations || []) {
  if (String(f.methodes_pedagogiques || '').trim()) continue
  n++
  console.log('  +', f.intitule.slice(0, 70))
  if (ECRIRE) await supabase.from('formations').update({ methodes_pedagogiques: TEXTE, updated_at: new Date().toISOString() }).eq('id', f.id)
}
console.log(`${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${n} formations complétées.`)
