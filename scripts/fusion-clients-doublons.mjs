#!/usr/bin/env node
/**
 * Fusion des fiches clients en double.
 *
 * Doublons certains : même SIRET avec des libellés équivalents, ou même nom
 * normalisé sans SIRET contradictoire. La fiche GARDÉE est la plus riche
 * (le plus d'objets rattachés) et complète ses champs vides depuis l'autre ;
 * tout ce qui pointait le doublon est re-pointé, puis le doublon supprimé
 * (sauvegardé dans backups/ avant).
 *
 * NE FUSIONNE PAS (arbitrage humain) : même SIRET mais noms de personnes
 * différents (entreprises individuelles : ARRAISS, KARROUCHI) ou multi-sites
 * assumé (LA FABRIQUE A SUSHI ×3 villes sous un seul SIRET).
 *
 *   node scripts/fusion-clients-doublons.mjs           (simulation)
 *   node scripts/fusion-clients-doublons.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Tables portant un client_id à re-pointer (les absentes sont ignorées).
const A_REPOINTER = [
  'sessions', 'contacts', 'apprenants', 'leads', 'devis', 'conventions',
  'factures', 'dossiers_formation', 'poei', 'documents', 'inscriptions',
  'appreciations_parties_prenantes', 'reclamations', 'audits_etablissement',
  'poei_previsions', 'commissions',
]

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
const norm = (x) => String(x || '').toUpperCase().replace(/Œ/g, 'OE').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(SARL|SAS|SASU|EURL|SA|SNC|SOCIETE)\b/g, '').replace(/[0-9]/g, '').replace(/[^A-Z]/g, '')

const clients = await tout('clients', '*')
const sessions = await tout('sessions', 'id, client_id')
const poids = new Map()
for (const s of sessions) poids.set(s.client_id, (poids.get(s.client_id) || 0) + 1)

// Groupes : même SIRET, ou même nom sans SIRET contradictoire.
const groupes = new Map()
for (const c of clients) {
  const siret = String(c.siret || '').replace(/\D/g, '')
  const cle = siret.length >= 9 ? 'S:' + siret : 'N:' + norm(c.nom_commercial || c.raison_sociale)
  if (!groupes.has(cle)) groupes.set(cle, [])
  groupes.get(cle).push(c)
}
// Regrouper aussi par nom quand les sirets manquent d'un côté.
const parNom = new Map()
for (const c of clients) {
  const n = norm(c.nom_commercial || c.raison_sociale)
  if (!n) continue
  if (!parNom.has(n)) parNom.set(n, [])
  parNom.get(n).push(c)
}
for (const [n, l] of parNom) {
  if (l.length < 2) continue
  const sirets = new Set(l.map((c) => String(c.siret || '').replace(/\D/g, '')).filter((x) => x.length >= 9))
  if (sirets.size > 1) continue
  groupes.set('NN:' + n, l)
}

const dejaTraites = new Set()
const arbitrage = []
const fusions = []
for (const [cle, liste] of groupes) {
  const uniques = [...new Map(liste.map((c) => [c.id, c])).values()].filter((c) => !dejaTraites.has(c.id))
  if (uniques.length < 2) continue
  // même SIRET mais noms sans recouvrement → humain
  const noms = uniques.map((c) => norm(c.nom_commercial || c.raison_sociale))
  const compatibles = noms.every((n) => noms.every((m) => n.includes(m) || m.includes(n)))
  if (!compatibles) { arbitrage.push(uniques); uniques.forEach((c) => dejaTraites.add(c.id)); continue }
  uniques.sort((a, b) => (poids.get(b.id) || 0) - (poids.get(a.id) || 0))
  fusions.push({ garde: uniques[0], doublons: uniques.slice(1) })
  uniques.forEach((c) => dejaTraites.add(c.id))
}

console.log(`Fusions : ${fusions.length} groupes | arbitrage humain : ${arbitrage.length}`)
for (const g of arbitrage) console.log('  [ARBITRAGE]', g.map((c) => `${c.nom_commercial || c.raison_sociale} (${c.ville || '?'}, ${c.id.slice(0, 8)})`).join(' | '))

if (ECRIRE) {
  const { mkdirSync, writeFileSync } = await import('fs')
  mkdirSync('backups', { recursive: true })
  writeFileSync(`backups/fusion-clients-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ date: new Date().toISOString(), fusions }, null, 1))
}

for (const { garde, doublons } of fusions) {
  console.log(`  ${(garde.nom_commercial || garde.raison_sociale || '').slice(0, 40)} (${poids.get(garde.id) || 0} sessions) absorbe ${doublons.map((d) => d.id.slice(0, 8)).join(', ')}`)
  if (!ECRIRE) continue
  for (const d of doublons) {
    // champs vides complétés depuis le doublon
    const maj = {}
    for (const champ of ['siret', 'adresse', 'code_postal', 'ville', 'email', 'telephone', 'nom_commercial', 'convention_collective', 'forme_juridique', 'tva_intra']) {
      if (!garde[champ] && d[champ]) maj[champ] = d[champ]
    }
    if (Object.keys(maj).length) await supabase.from('clients').update(maj).eq('id', garde.id)
    for (const table of A_REPOINTER) {
      const { error } = await supabase.from(table).update({ client_id: garde.id }).eq('client_id', d.id)
      if (error && !/does not exist/.test(error.message)) console.error(`    !! ${table}: ${error.message.slice(0, 70)}`)
    }
    const { error } = await supabase.from('clients').delete().eq('id', d.id)
    if (error) console.log(`    doublon ${d.id.slice(0, 8)} conservé (référencé ailleurs : ${error.message.slice(0, 60)})`)
  }
}
console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION — relancer avec --ecrire'}`)
