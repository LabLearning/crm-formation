#!/usr/bin/env node
/**
 * Indicateur 5 — objectifs pédagogiques exprimés en verbes évaluables.
 *
 * POURQUOI : l'audit blanc a relevé des objectifs en "comprendre / connaître /
 * savoir / découvrir" — des états mentaux qu'aucune évaluation ne peut
 * constater. Le RNQ attend des verbes d'action observables (identifier,
 * appliquer, réaliser, expliquer…), c'est ce qui rend les évaluations des
 * acquis opposables.
 *
 * COMMENT : on ne réécrit que le verbe d'attaque de l'objectif, jamais le fond
 * pédagogique — le contenu reste celui validé par l'équipe. Remplacements
 * choisis pour rester fidèles à l'intention (comprendre → expliquer :
 * l'apprenant démontre sa compréhension en l'expliquant).
 *
 * USAGE : node scripts/verbes-evaluables.mjs           (simulation)
 *         node scripts/verbes-evaluables.mjs --ecrire  (application)
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const ECRIRE = process.argv.includes('--ecrire')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Remplacements en tête d'objectif uniquement — ordre du plus spécifique au
// plus général. La capture conserve la casse de la suite de la phrase.
const REGLES = [
  [/^être capable de comprendre\b/i, 'Expliquer'],
  [/^prendre conscience (?:de la|du|des|de l'|de)\b/i, 'Mesurer'],
  [/^prendre conscience\b/i, 'Mesurer les enjeux'],
  [/^se familiariser avec\b/i, 'Utiliser'],
  [/^sensibiliser (?:à|aux|au)\b/i, 'Appliquer les règles relatives à'],
  [/^comprendre et appliquer\b/i, 'Appliquer'],
  [/^comprendre et maîtriser\b/i, 'Maîtriser'],
  [/^comprendre\b/i, 'Expliquer'],
  [/^connaître\b/i, 'Identifier'],
  [/^connaitre\b/i, 'Identifier'],
  [/^savoir[- ]faire\b/i, 'Réaliser'],
  [/^savoir\s+(?=\p{L}+er\b|\p{L}+ir\b|\p{L}+re\b)/iu, ''], // "Savoir gérer X" → "Gérer X"
  [/^savoir\b/i, 'Mettre en œuvre'],
  [/^découvrir\b/i, 'Identifier'],
  [/^decouvrir\b/i, 'Identifier'],
  [/^appréhender\b/i, 'Analyser'],
  [/^apprehender\b/i, 'Analyser'],
  [/^assimiler\b/i, 'Restituer'],
  [/^apprécier\b/i, 'Évaluer'],
]

// Un verbe résiduel au milieu de la phrase ("… et comprendre les enjeux") est
// signalé mais pas réécrit automatiquement — trop de contexte en jeu.
const RESIDUELS = /\b(comprendre|connaître|connaitre|découvrir|appréhender|prendre conscience|se familiariser)\b/i

function majuscule(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

function corriger(objectif) {
  let t = objectif.trim()
  for (const [re, remplacement] of REGLES) {
    if (re.test(t)) {
      t = t.replace(re, remplacement).trim()
      return majuscule(t)
    }
  }
  return null
}

const { data: formations, error } = await supabase
  .from('formations')
  .select('id, intitule, objectifs_pedagogiques')
  .order('intitule')
if (error) throw error

let nbFormations = 0
let nbObjectifs = 0
const residuels = []

for (const f of formations) {
  let objectifs = f.objectifs_pedagogiques
  if (!objectifs) continue
  const etaitChaine = typeof objectifs === 'string'
  let liste
  try { liste = etaitChaine ? JSON.parse(objectifs) : objectifs } catch { liste = null }
  if (!Array.isArray(liste)) liste = [String(objectifs)]

  let modifie = false
  const nouvelle = liste.map((o) => {
    const c = corriger(String(o))
    if (c) {
      modifie = true
      nbObjectifs++
      console.log(`\n  ${f.intitule.slice(0, 65)}`)
      console.log(`    - ${String(o).slice(0, 90)}`)
      console.log(`    + ${c.slice(0, 90)}`)
      if (RESIDUELS.test(c)) residuels.push(`${f.intitule.slice(0, 50)} :: ${c.slice(0, 90)}`)
      return c
    }
    if (RESIDUELS.test(String(o))) residuels.push(`${f.intitule.slice(0, 50)} :: ${String(o).slice(0, 90)}`)
    return o
  })

  if (modifie) {
    nbFormations++
    if (ECRIRE) {
      const valeur = etaitChaine ? JSON.stringify(nouvelle) : nouvelle
      const { error: e } = await supabase.from('formations')
        .update({ objectifs_pedagogiques: valeur, updated_at: new Date().toISOString() })
        .eq('id', f.id)
      if (e) console.error(`  !! ${f.intitule}: ${e.message}`)
    }
  }
}

console.log(`\n${ECRIRE ? 'APPLIQUÉ' : 'SIMULATION'} — ${nbObjectifs} objectifs réécrits sur ${nbFormations} formations`)
if (residuels.length) {
  console.log(`\nVerbes flous en milieu de phrase (à reprendre à la main) : ${residuels.length}`)
  for (const r of [...new Set(residuels)]) console.log(`  · ${r}`)
}
if (!ECRIRE) console.log('\nRelancer avec --ecrire pour appliquer.')
