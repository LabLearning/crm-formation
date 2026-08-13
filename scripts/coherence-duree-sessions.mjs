#!/usr/bin/env node
/**
 * Sessions rattachées à la mauvaise variante de formation.
 *
 * Le catalogue porte plusieurs variantes d'un même intitulé — « HYGIÈNE
 * ALIMENTAIRE ET PRÉVENTION DES RISQUES » existe en 8 h, 14 h et 21 h — et
 * l'import Dendreo comme la saisie manuelle ont parfois accroché une session
 * de trois jours à la variante d'une journée. Conséquence directe : les
 * attestations et certificats énoncent la durée de la formation rattachée,
 * pas celle des jours réellement tenus — un document de 3 jours qui atteste
 * 8 heures ne vaut rien devant un contrôleur.
 *
 * Réparation : quand une variante du même intitulé correspond au nombre de
 * jours réellement émargés (à défaut, à l'empan de dates), la session y est
 * raccrochée. Ambigu ou sans variante exacte → signalé, jamais deviné.
 *
 *   node scripts/coherence-duree-sessions.mjs           # simulation
 *   node scripts/coherence-duree-sessions.mjs --ecrire
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

const pages = async (fn) => { const o = []; for (let f = 0; ; f += 500) { const { data, error } = await fn(f, f + 499); if (error) throw new Error(error.message); o.push(...(data || [])); if ((data || []).length < 500) break } return o }
const cle = (t) => String(t || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const [formations, sessions, emargements] = await Promise.all([
  pages((f, t) => supabase.from('formations').select('id, intitule, duree_heures, duree_jours').eq('organization_id', ORG).range(f, t)),
  pages((f, t) => supabase.from('sessions')
    .select('id, reference, date_debut, date_fin, status, formation_id, poei_intervention_id, client:client_id(raison_sociale)')
    .eq('organization_id', ORG).not('formation_id', 'is', null).range(f, t)),
  pages((f, t) => supabase.from('emargements').select('session_id, date').range(f, t)),
])

const parId = new Map(formations.map((f) => [f.id, f]))
const parIntitule = new Map()
for (const f of formations) {
  const k = cle(f.intitule)
  if (!parIntitule.has(k)) parIntitule.set(k, [])
  parIntitule.get(k).push(f)
}
const joursEmarges = new Map()
for (const e of emargements) {
  if (!joursEmarges.has(e.session_id)) joursEmarges.set(e.session_id, new Set())
  joursEmarges.get(e.session_id).add(e.date)
}

/** Jours réellement tenus : l'émargement fait foi, l'empan de dates à défaut. */
function joursDe(s) {
  const em = joursEmarges.get(s.id)
  if (em?.size) return em.size
  if (!s.date_debut) return null
  const d = new Date(s.date_debut)
  const fin = new Date(s.date_fin || s.date_debut)
  let n = 0
  const weekendOk = !!s.poei_intervention_id
  while (d <= fin) {
    const j = d.getDay()
    if (weekendOk || (j !== 0 && j !== 6)) n++
    d.setDate(d.getDate() + 1)
  }
  // Une session planifiée un samedi tombe à zéro avec le seul décompte des
  // jours ouvrés : c'est bien un jour tenu, pas une session vide.
  if (n === 0) {
    n = Math.round((fin - new Date(s.date_debut)) / 86400000) + 1
  }
  return n
}

const incoherentes = []
for (const s of sessions) {
  // Une session POEI est une tranche d'une formation longue : l'écart entre
  // ses jours et la durée totale du parcours est normal, pas une anomalie.
  if (s.poei_intervention_id) continue
  const f = parId.get(s.formation_id)
  if (!f?.duree_jours) continue
  const jours = joursDe(s)
  if (jours == null || jours === f.duree_jours) continue
  const variantes = (parIntitule.get(cle(f.intitule)) || []).filter((v) => v.duree_jours === jours)
  // Des variantes de même durée en heures et en jours sont interchangeables
  // pour les documents : le doublon du catalogue ne doit pas bloquer la
  // réparation. On prend la première.
  const memesDurees = variantes.length > 1
    && variantes.every((v) => v.duree_heures === variantes[0].duree_heures)
  const variante = variantes.length === 1 || memesDurees ? variantes[0] : null
  incoherentes.push({ s, f, jours, variante, ambigues: variantes.length })
}

const reparables = incoherentes.filter((x) => x.variante)
const orphelines = incoherentes.filter((x) => !x.variante)

console.log(`Sessions dont la durée de formation ne colle pas aux jours tenus : ${incoherentes.length}`)
console.log(`  raccrochables à la bonne variante du même intitulé : ${reparables.length}`)
console.log(`  sans variante correspondante (à corriger à la main) : ${orphelines.length}\n`)

console.log('── Raccrochables ──')
for (const x of reparables) {
  console.log(`${String(x.s.reference || '').padEnd(15)} ${x.s.date_debut}→${x.s.date_fin}  ${String(x.s.client?.raison_sociale || '').slice(0, 18).padEnd(19)} ${x.f.duree_heures}h/${x.f.duree_jours}j → ${x.variante.duree_heures}h/${x.variante.duree_jours}j  (${x.jours} jour(s) tenus)`)
}
console.log('\n── Sans variante exacte ──')
for (const x of orphelines.slice(0, 30)) {
  console.log(`${String(x.s.reference || '').padEnd(15)} ${x.s.date_debut}→${x.s.date_fin}  ${String(x.s.client?.raison_sociale || '').slice(0, 18).padEnd(19)} ${x.f.duree_heures}h/${x.f.duree_jours}j pour ${x.jours} jour(s)  «${x.f.intitule.slice(0, 38)}»${x.ambigues > 1 ? `  (${x.ambigues} variantes candidates)` : ''}`)
}
if (orphelines.length > 30) console.log(`  … et ${orphelines.length - 30} autres`)

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

for (const x of reparables) {
  const { error } = await supabase.from('sessions')
    .update({ formation_id: x.variante.id }).eq('id', x.s.id)
  if (error) throw new Error(`${x.s.reference} — ${error.message}`)
}
console.log(`\n${reparables.length} session(s) raccrochée(s) à la bonne variante.`)
