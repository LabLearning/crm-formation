#!/usr/bin/env node
/**
 * Fusion des 5 paires nées du va-et-vient purge/restauration du 18/08 :
 * la session créée depuis la matrice (coquille : n° dossier + prix, sans
 * inscriptions) double la session restaurée (complète : inscrits,
 * émargements, questionnaires).
 *
 * On garde la session COMPLÈTE et on lui greffe ce que la coquille apportait
 * (n° de dossier OPCO, prix facturé) ; la coquille et ses satellites générés
 * (recueil, marquage) sont supprimés.
 *
 * USAGE : node scripts/fusion-jumeaux-matrice.mjs           (simulation)
 *         node scripts/fusion-jumeaux-matrice.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const SATELLITES = ['recueils_besoin', 'session_formations', 'qcm_sessions', 'qcm_reponses', 'inscriptions', 'emargements', 'incidents', 'documents']

async function tout(table, cols) {
  const o = []
  for (let d = 0; ; d += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(d, d + 999)
    if (error) throw new Error(error.message)
    o.push(...data)
    if (data.length < 1000) break
  }
  return o
}

const sessions = await tout('sessions', 'id, reference, date_debut, client_id, prix_ht, numero_dossier_opco, notes_internes')
const coquilles = sessions.filter((x) => (x.notes_internes || '').includes('Créée depuis la matrice'))

let fusions = 0
for (const c of coquilles) {
  const twin = sessions.find((x) => x.id !== c.id && x.client_id === c.client_id
    && String(x.date_debut) === String(c.date_debut) && !(x.notes_internes || '').includes('Créée depuis la matrice'))
  if (!twin) continue
  fusions++
  console.log(`  ${c.reference} (coquille) → fusion dans ${twin.reference}`)
  if (!ECRIRE) continue

  // La session complète hérite du n° de dossier et du prix de la matrice.
  await supabase.from('sessions').update({
    numero_dossier_opco: twin.numero_dossier_opco || c.numero_dossier_opco || c.reference,
    prix_ht: twin.prix_ht ?? c.prix_ht,
    updated_at: new Date().toISOString(),
  }).eq('id', twin.id)

  for (const table of SATELLITES) {
    const { error } = await supabase.from(table).delete().eq('session_id', c.id)
    if (error && !/does not exist/.test(error.message)) console.error(`  !! ${table}: ${error.message.slice(0, 70)}`)
  }
  const { error } = await supabase.from('sessions').delete().eq('id', c.id)
  if (error) console.error(`  !! session ${c.reference}: ${error.message}`)
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${fusions} fusions`)
if (!ECRIRE && fusions) console.log('Relancer avec --ecrire.')
