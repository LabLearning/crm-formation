#!/usr/bin/env node
/**
 * Grille tarifaire du catalogue : un prix fixe par formation, calé sur la
 * prise en charge OPCO de sa branche.
 *
 * Le prix par stagiaire (tarif_inter_ht) suit le taux horaire de la branche ×
 * la durée ; les formations HCR reçoivent en plus un prix de groupe
 * (tarif_intra_ht) au forfait AKTO de 1 000 €/jour. Une formation multi-
 * branches prend le barème de sa branche principale, la restauration rapide
 * d'abord — c'est le cœur de l'activité.
 *
 * Taux horaires par branche (grilles 2026 du simulateur) :
 *   restauration rapide  25 €/h (AKTO)
 *   boucherie            50 €/h métier · 25 €/h management-gestion (OPCO EP)
 *   boulang.-pâtisserie  40 €/h métier · 30 €/h hygiène (OPCO EP)
 *   transverse / sans branche : 25 €/h — aligné sur la clientèle cœur
 *
 * Un tarif déjà saisi à la main n'est jamais écrasé.
 *
 *   node scripts/tarifs-formations.mjs           # simulation
 *   node scripts/tarifs-formations.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')

const sansAccent = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Taux horaire par stagiaire selon la branche principale et le thème. */
function tauxHoraire(f) {
  const branches = f.branches || []
  const cat = sansAccent(f.categorie)
  const titre = sansAccent(f.intitule)
  const management = cat.includes('management') || /management|gestion|rentabilite|manag/.test(titre)

  if (branches.includes('restauration-rapide')) return 25
  if (branches.includes('boucherie-charcuterie')) return management ? 25 : 50
  if (branches.includes('boulangerie-patisserie')) {
    if (cat.includes('hygiene') || /hygiene|haccp/.test(titre)) return 30
    return 40
  }
  if (branches.includes('restaurant-hcr')) return null // forfait jour, pas de taux
  // Transverse ou sans branche : aligné sur la clientèle cœur.
  return 25
}

const { data: formations, error } = await supabase.from('formations')
  .select('id, intitule, categorie, branches, duree_heures, duree_jours, tarif_inter_ht, tarif_intra_ht, is_active')
  .eq('organization_id', ORG).eq('is_active', true).order('intitule')
if (error) throw new Error(error.message)

const lignes = []
for (const f of formations) {
  const heures = Number(f.duree_heures || 0)
  const jours = Number(f.duree_jours || 0) || (heures ? Math.ceil(heures / 7) : 0)
  if (!heures) { lignes.push({ f, saut: 'durée absente' }); continue }
  if (f.tarif_inter_ht || f.tarif_intra_ht) { lignes.push({ f, saut: 'tarif déjà saisi' }); continue }

  const taux = tauxHoraire(f)
  const hcr = (f.branches || []).includes('restaurant-hcr')
  const inter = taux ? taux * heures : null
  // Le forfait HCR est un prix de groupe : il va dans l'intra.
  const intra = hcr ? 1000 * jours : null
  if (!inter && !intra) { lignes.push({ f, saut: 'aucune règle' }); continue }
  lignes.push({ f, inter, intra, taux, jours })
}

const aEcrire = lignes.filter((l) => !l.saut)
console.log(`Formations actives : ${formations.length} · à tarifer : ${aEcrire.length}\n`)
for (const l of lignes) {
  const nom = l.f.intitule.slice(0, 52).padEnd(53)
  if (l.saut) { console.log(`  —  ${nom} (${l.saut})`); continue }
  const parts = []
  if (l.inter) parts.push(`${l.inter.toLocaleString('fr-FR')} € HT/stagiaire (${l.taux} €/h × ${l.f.duree_heures}h)`)
  if (l.intra) parts.push(`${l.intra.toLocaleString('fr-FR')} € HT/groupe (forfait HCR ${l.jours}j)`)
  console.log(`  ✓  ${nom} ${parts.join(' · ')}`)
}

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

for (const l of aEcrire) {
  const { error: e } = await supabase.from('formations').update({
    ...(l.inter ? { tarif_inter_ht: l.inter } : {}),
    ...(l.intra ? { tarif_intra_ht: l.intra } : {}),
  }).eq('id', l.f.id)
  if (e) throw new Error(`${l.f.intitule} — ${e.message}`)
}
console.log(`\n${aEcrire.length} formation(s) tarifée(s).`)
