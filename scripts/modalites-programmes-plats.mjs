/**
 * POURQUOI : modalites-modules.mjs a doté chaque module structuré (« Module
 * N — titre ») de ses modalités pédagogiques, mais 39 programmes sont du
 * texte plat sans structure module — ils n'ont donc AUCUN bloc modalités
 * dans le corps du programme (indicateur 6). On leur ajoute en fin de
 * programme un bloc « Modalités pédagogiques » choisi d'après le contenu
 * réel (hygiène/gestes → pratique au poste ; réglementaire → analyse de
 * documents ; management → mises en situation ; défaut → mixte).
 * Idempotent : un programme contenant déjà « modalit » n'est pas retouché.
 *
 * Simulation par défaut — `--ecrire` pour appliquer.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ECRIRE = process.argv.includes('--ecrire')

function modalites(texte) {
  const n = texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/hygiene|haccp|nettoyage|desinfection|temperature|contamination|allerg/.test(n)) return [
    "Démonstration par le formateur au poste de travail, sur l'équipement réel de l'établissement.",
    'Mise en pratique individuelle immédiate (relevés, autocontrôles, plan de nettoyage), reprise des gestes non acquis.',
    "Études de cas tirées du fonctionnement de l'établissement.",
  ]
  if (/duerp|document unique|prevention|risque|securite|incendie|gestes et postures|tms/.test(n)) return [
    'Observation guidée des postes de travail et identification des risques in situ.',
    'Analyse de documents réglementaires et des supports internes de l\'établissement.',
    'Élaboration collective des mesures de prévention, restitution commentée.',
  ]
  if (/management|equipe|conflit|communication|recrutement|entretien|client/.test(n)) return [
    'Mises en situation et jeux de rôle sur des cas réels apportés par les participants.',
    'Analyses de situations vécues en établissement, debriefing collectif.',
    'Apports méthodologiques courts suivis d\'une application immédiate.',
  ]
  return [
    'Alternance d\'apports théoriques illustrés et d\'exercices d\'application.',
    'Mises en pratique sur les situations réelles de l\'établissement.',
    'Échanges guidés entre participants, synthèse par le formateur.',
  ]
}

const { data: formations } = await s.from('formations')
  .select('id, intitule, programme_detaille')
  .eq('organization_id', ORG).eq('is_active', true)

let maj = 0
for (const f of formations || []) {
  const p = (f.programme_detaille || '').trim()
  if (!p || /modalit/i.test(p)) continue
  const bloc = '\n\nModalités pédagogiques\n' + modalites(f.intitule + ' ' + p).map(m => `- ${m}`).join('\n')
  maj++
  console.log('+', f.intitule)
  if (ECRIRE) {
    const { error } = await s.from('formations').update({ programme_detaille: p + bloc }).eq('id', f.id)
    if (error) throw new Error(error.message)
  }
}
console.log(`${maj} programmes complétés`)
console.log(ECRIRE ? 'ÉCRIT.' : 'Simulation — relancer avec --ecrire')
