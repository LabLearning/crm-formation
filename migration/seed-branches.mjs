// Seed initial des branches sur les formations (à lancer APRÈS la migration 099).
//   node migration/seed-branches.mjs
// Idempotent : ne touche pas une formation déjà classée (branche posée, transverse,
// ou déjà dépubliée) — pour préserver les éditions manuelles faites dans le CRM.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const OFFSITE = /textile|odoo|sellsy|\bexcel\b|microsoft|\bproject\b|smart concept|parcours individuel|tronc commun|assistant(e)? (de direction|maître|maitre)|prise en main.*(crm|lms)|optimisation des potentiels|molina|gravat/i
const SECTOR = {
  'restauration-rapide': /rapide|fast[- ]?food|tacos|pizza|burger|snack|équipier|equipier|chickeez|chamas|kebab|\bnst\b|barista/i,
  'restaurant-hcr': /restaurant|restauration|h[oô]tel|caf[eé]|\bbar\b|serveu|\bsalle\b|moule|\bsauce|cuisine|culinaire|traiteur/i,
  'boucherie-charcuterie': /bouch|charcut|\bviande/i,
  'boulangerie-patisserie': /boulanger|\bpain\b|p[aâ]tiss|viennois|no[eë]l/i,
}
const THEME = [
  /hygi[eè]ne|haccp|\bpms\b|sanitaire|tra[cç]abilit|[eé]tiquet|nettoyage|d[eé]sinfection|ma[iî]trise sanitaire|denr[eé]es/i,
  /duerp|document unique|incendie|\bsst\b|secouri|risques? professionnel|\btms\b|gestes et postures|chariot|conduite en s[eé]curit|s[eé]curit[eé] au travail/i,
  /manage|leadership|gestion|rentabilit|accueil client|\bvente|fid[eé]lisation|communication|conflit|m[eé]diation|commercial|financement|posture professionnelle|intelligence artificielle|\bia\b/i,
]
const hasTheme = (n) => THEME.some((re) => re.test(n))
function sectorsOf(n) {
  const o = []
  if (SECTOR['restauration-rapide'].test(n)) o.push('restauration-rapide')
  else if (SECTOR['restaurant-hcr'].test(n)) o.push('restaurant-hcr')
  if (SECTOR['boucherie-charcuterie'].test(n)) o.push('boucherie-charcuterie')
  if (SECTOR['boulangerie-patisserie'].test(n)) o.push('boulangerie-patisserie')
  return o
}
function classify(n) {
  if (OFFSITE.test(n)) return { branches: [], est_transverse: false, site_publie: false }
  const branches = sectorsOf(n)
  const est_transverse = branches.length === 0 && hasTheme(n)
  return { branches, est_transverse, site_publie: branches.length > 0 || est_transverse }
}

const run = async () => {
  const { data: rows, error } = await s.from('formations')
    .select('id, intitule, branches, est_transverse, site_publie').eq('organization_id', ORG)
  if (error) { console.error('Colonnes absentes ? Applique la migration 099 d’abord.', error.message); process.exit(1) }
  let updated = 0, skipped = 0
  const stats = {}
  for (const f of rows) {
    const alreadyClassified = (Array.isArray(f.branches) && f.branches.length > 0) || f.est_transverse === true || f.site_publie === false
    if (alreadyClassified) { skipped++; continue }
    const c = classify(f.intitule || '')
    const { error: e } = await s.from('formations').update(c).eq('id', f.id)
    if (e) { console.error('update', f.id, e.message); continue }
    updated++
    const key = c.site_publie ? (c.est_transverse ? 'transverse' : (c.branches.join(',') || '—')) : 'non-publié'
    stats[key] = (stats[key] || 0) + 1
  }
  console.log('MàJ:', updated, '| ignorées (déjà classées):', skipped)
  console.log('Répartition:', JSON.stringify(stats, null, 2))
}
run()
