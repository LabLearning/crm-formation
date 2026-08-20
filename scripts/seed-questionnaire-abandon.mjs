#!/usr/bin/env node
/**
 * Crée le questionnaire d'abandon J+1 (indicateur 12), avec les six questions
 * de la procédure « Prévention et gestion des abandons » V1 d'avril 2024
 * (fiche transmise par la consultante qualité). Adressé au stagiaire dès le
 * lendemain de l'abandon, par téléphone ou en ligne — les réponses restent
 * au dossier de la session.
 *
 * Idempotent : ne recrée rien s'il existe.
 *
 *   node scripts/seed-questionnaire-abandon.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = {}
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ORG = process.env.ORG_ID || 'ff747dfe-c034-44d8-98d7-e53892263fb5'

const TITRE = "Questionnaire d'abandon (J+1)"

// Les six questions de la fiche processus, dans l'ordre du document.
const QUESTIONS = [
  ['Pourquoi avez-vous arrêté votre formation ?', 'texte_libre'],
  ["Avez-vous changé d'objectif, de projet ?", 'texte_libre'],
  ['Avez-vous une remarque sur le déroulement de la formation ?', 'texte_libre'],
  ['Avez-vous une remarque sur le formateur ?', 'texte_libre'],
  ['Avez-vous une remarque sur la formation ?', 'texte_libre'],
  ["Souhaitez-vous qu'on vous recontacte afin d'étudier un autre projet de formation ?", 'texte_libre'],
]

const existing = await sb.from('qcm').select('id').eq('organization_id', ORG).eq('type', 'abandon').maybeSingle()
if (existing.data) {
  console.log('Le questionnaire existe déjà (id ' + existing.data.id + ') — rien à faire.')
  process.exit(0)
}

const { data: qcm, error } = await sb.from('qcm').insert({
  organization_id: ORG,
  formation_id: null,            // commun à toutes les formations
  titre: TITRE,
  description: "Adressé au stagiaire le lendemain de son abandon (procédure indicateur 12, V1 avril 2024) : comprendre la cause, recueillir ses remarques, proposer une suite (réintégration ou nouveau projet).",
  type: 'abandon',
  status: 'publie',
  afficher_resultats: false,
  is_template: true,
}).select('id').single()

if (error) { console.error('Création impossible:', error.message); process.exit(1) }

let n = 0
for (const [texte, type] of QUESTIONS) {
  const { error: e } = await sb.from('qcm_questions').insert({
    qcm_id: qcm.id, texte, type, position: n + 1, is_required: false, points: 0,
  })
  if (e) console.error('  question KO:', texte.slice(0, 40), e.message.slice(0, 60))
  else n++
}
console.log(`« ${TITRE} » créé (id ${qcm.id}) avec ${n}/${QUESTIONS.length} questions.`)
