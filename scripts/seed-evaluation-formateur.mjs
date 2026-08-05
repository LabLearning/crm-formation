/**
 * Crée le questionnaire unique « Évaluation du formateur », commun à toutes
 * les formations (formation_id = NULL). Idempotent : ne recrée rien s'il existe.
 * À lancer après la migration 111.
 *
 *   node scripts/seed-evaluation-formateur.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = {}
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ORG = process.env.ORG_ID || 'ff747dfe-c034-44d8-98d7-e53892263fb5'

const TITRE = 'Évaluation du formateur'

const QUESTIONS = [
  ['Le formateur maîtrise son sujet.', 'note_1_5'],
  ['Les explications sont claires et compréhensibles.', 'note_1_5'],
  ['Le formateur répond précisément aux questions posées.', 'note_1_5'],
  ['Le rythme de la formation est adapté au groupe.', 'note_1_5'],
  ['Les supports et méthodes pédagogiques sont pertinents.', 'note_1_5'],
  ['Le formateur favorise la participation et les échanges.', 'note_1_5'],
  ['Le formateur est à l\'écoute et disponible.', 'note_1_5'],
  ['Les exemples proposés sont concrets et adaptés à votre métier.', 'note_1_5'],
  ['Le formateur crée un climat de travail positif.', 'note_1_5'],
  ['Vous recommanderiez ce formateur.', 'note_1_5'],
  ['Points forts du formateur (commentaire libre).', 'texte_libre'],
  ['Suggestions d\'amélioration (commentaire libre).', 'texte_libre'],
]

const existing = await sb.from('qcm').select('id').eq('organization_id', ORG).eq('type', 'evaluation_formateur').maybeSingle()
if (existing.error && !/no rows/i.test(existing.error.message)) {
  console.error('Erreur:', existing.error.message)
  process.exit(1)
}
if (existing.data) {
  console.log('Le questionnaire existe déjà (id ' + existing.data.id + ') — rien à faire.')
  process.exit(0)
}

const { data: qcm, error } = await sb.from('qcm').insert({
  organization_id: ORG,
  formation_id: null,            // commun à toutes les formations
  titre: TITRE,
  description: "Questionnaire d'évaluation du formateur, rempli par les apprenants en fin de session. Commun à toutes les formations.",
  type: 'evaluation_formateur',
  status: 'publie',
  afficher_resultats: false,
  is_template: true,
}).select('id').single()

if (error) { console.error('Création impossible:', error.message); process.exit(1) }

let n = 0
for (const [texte, type] of QUESTIONS) {
  const { error: e } = await sb.from('qcm_questions').insert({
    qcm_id: qcm.id, texte, type, position: n + 1, is_required: type !== 'texte_libre', points: 0,
  })
  if (e) console.error('  question KO:', texte.slice(0, 40), e.message.slice(0, 60))
  else n++
}
console.log(`✅ « ${TITRE} » créé (id ${qcm.id}) avec ${n}/${QUESTIONS.length} questions.`)
