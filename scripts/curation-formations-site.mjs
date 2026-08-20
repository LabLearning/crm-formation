#!/usr/bin/env node
/**
 * Réduit le catalogue public du site : trop de formations quasi identiques.
 * On regroupe par famille (regex sur l'intitulé) ; dans chaque famille on ne
 * garde publiée que la fiche la plus utilisée (nb de sessions), le reste passe
 * site_publie=false (les fiches restent actives dans le CRM, rien n'est
 * supprimé). Les déclinaisons par enseigne (Chamas, Chickeez, NST, Dreams
 * Donuts) sont dépubliées au profit de l'équipier polyvalent générique.
 *
 * Simulation par défaut :
 *   node scripts/curation-formations-site.mjs
 *   node scripts/curation-formations-site.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ECRIRE = process.argv.includes('--ecrire')
const norm = (x) => (x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Une formation tombe dans la PREMIÈRE famille dont la regex matche.
// garder: combien de fiches on publie dans la famille (1 sauf mention).
const FAMILLES = [
  { nom: 'equipier enseigne (depublie)', re: /(equipier|employe) polyvalent.*(chamas|chickeez|nst|dreams)/, garder: 0 },
  { nom: 'equipier polyvalent generique', re: /(equipier|employe) polyvalent/, garder: 1 },
  { nom: 'hygiene boulangerie', re: /hygiene.*boulangerie/, garder: 1 },
  { nom: 'hygiene/securite boucherie', re: /(hygiene|securite).*(boucher)/, garder: 1 },
  { nom: 'securite alimentaire patisserie', re: /securite.*patisserie/, garder: 1 },
  { nom: 'hygiene alimentaire (HACCP)', re: /hygiene alimentaire/, garder: 1 },
  { nom: 'PMS', re: /plan de maitrise sanitaire|pms/, garder: 1 },
  { nom: 'nettoyage-desinfection', re: /nettoyage.*desinfection/, garder: 1 },
  { nom: 'tracabilite-etiquetage', re: /tracabilite/, garder: 1 },
  { nom: 'allergenes', re: /allergene/, garder: 1 },
  { nom: 'pack securite 360', re: /pack securite/, garder: 1 },
  { nom: 'DUERP-prevention', re: /duerp|document unique|prevention des risques/, garder: 1 },
  { nom: 'SST', re: /sauveteur secouriste|\bsst\b/, garder: 1 },
  { nom: 'incendie', re: /incendie/, garder: 1 },
  { nom: 'chariots', re: /chariot/, garder: 1 },
  { nom: 'gestes et postures / TMS', re: /gestes et postures|\btms\b/, garder: 1 },
  { nom: 'IA', re: /intelligence artificielle|\bia\b/, garder: 2 },
  { nom: 'management', re: /management|manager|leadership/, garder: 2 },
  { nom: 'conflits-communication', re: /conflit|mediation|assertive|communication/, garder: 1 },
  { nom: 'accueil client / vente', re: /accueil client|posture professionnelle|relation client|vente/, garder: 1 },
  { nom: 'gestion-rentabilite', re: /rentabilite|couts matieres/, garder: 1 },
  { nom: 'financement (interne, hors site)', re: /dispositifs de financement/, garder: 0 },
  { nom: 'pizza', re: /pizza/, garder: 1 },
  { nom: 'barista', re: /barista/, garder: 1 },
  { nom: 'charcuterie', re: /charcuterie/, garder: 1 },
  { nom: 'moules', re: /moules/, garder: 1 },
  { nom: 'patisserie de fetes', re: /noel|fetes/, garder: 1 },
  { nom: 'creation entreprise', re: /creation d.entreprise/, garder: 1 },
]

const { data: formations } = await s.from('formations')
  .select('id, intitule').eq('is_active', true).eq('site_publie', true)
const counts = {}
for (let de = 0; ; de += 1000) {
  const { data } = await s.from('sessions').select('formation_id').range(de, de + 999)
  for (const r of data || []) if (r.formation_id) counts[r.formation_id] = (counts[r.formation_id] || 0) + 1
  if (!data || data.length < 1000) break
}

const parFamille = new Map(FAMILLES.map((f) => [f.nom, []]))
const horsFamille = []
for (const f of formations || []) {
  const fam = FAMILLES.find((F) => F.re.test(norm(f.intitule)))
  if (fam) parFamille.get(fam.nom).push(f)
  else horsFamille.push(f)
}

const aDepublier = []
for (const fam of FAMILLES) {
  const membres = parFamille.get(fam.nom)
  if (!membres.length) continue
  membres.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
  const gardes = membres.slice(0, fam.garder)
  const vires = membres.slice(fam.garder)
  console.log(`\n[${fam.nom}] ${membres.length} fiche(s)`)
  gardes.forEach((f) => console.log(`  GARDE  (${counts[f.id] || 0} sess.) ${f.intitule.slice(0, 70)}`))
  vires.forEach((f) => { aDepublier.push(f); console.log(`  retire (${counts[f.id] || 0} sess.) ${f.intitule.slice(0, 70)}`) })
}
if (horsFamille.length) {
  console.log('\n[hors famille — gardées]')
  horsFamille.forEach((f) => console.log(`  GARDE  ${f.intitule.slice(0, 70)}`))
}
console.log(`\nBilan : ${formations.length} publiées → ${formations.length - aDepublier.length} gardées, ${aDepublier.length} dépubliées`)

if (!ECRIRE) { console.log('Simulation — relancer avec --ecrire pour appliquer.'); process.exit(0) }
const { error } = await s.from('formations').update({ site_publie: false }).in('id', aDepublier.map((f) => f.id))
if (error) { console.error('!!', error.message); process.exit(1) }
console.log('Appliqué.')
