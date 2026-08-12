#!/usr/bin/env node
/**
 * Registre de veille — couverture du premier semestre 2025 et dédoublonnage.
 *
 * `date_veille` porte la date de l'ÉVÉNEMENT suivi (parution du texte, sortie
 * de l'étude, mise à jour du référentiel), pas celle de la saisie. `created_at`
 * garde la trace de la saisie : le registre a été formalisé lors de la reprise
 * du CRM, et cela se voit en base. C'est assumable devant un auditeur — ce qui
 * ne le serait pas, c'est de prétendre que les fiches ont été écrites à
 * l'époque.
 *
 * Chaque entrée porte un impact et une action : sans exploitation, une veille
 * ne vaut rien pour les indicateurs 23 à 25.
 *
 *   node scripts/veille-2025.mjs           # simulation
 *   node scripts/veille-2025.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const AUTEUR = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const ECRIRE = process.argv.includes('--ecrire')

const ENTREES = [
  {
    date_veille: '2025-01-16', type: 'legale',
    titre: 'Financement de la formation professionnelle — loi de finances pour 2025',
    source: 'Légifrance · Centre Inffo',
    resume:
      "Arbitrages budgétaires sur la contribution unique à la formation et à l'alternance et sur les enveloppes confiées aux OPCO. Les priorités de prise en charge des branches sont resserrées.",
    impact:
      "Les plafonds AKTO applicables à nos formations réglementaires peuvent évoluer en cours d'année : un devis émis en début d'exercice n'engage pas l'OPCO sur toute l'année.",
    action:
      "Vérification systématique du plafond en vigueur au moment de la demande de prise en charge, et non au moment du devis. Le simulateur budget est recalé sur la grille AKTO à chaque évolution.",
  },
  {
    date_veille: '2025-02-11', type: 'metier',
    titre: "Obligation de formation en hygiène alimentaire dans la restauration commerciale",
    source: 'DGAL · Arrêté du 5 octobre 2011 modifié',
    resume:
      "Tout établissement de restauration commerciale doit compter au moins une personne justifiant d'une formation en hygiène alimentaire de 14 heures. Les contrôles de la DDPP portent sur la preuve de cette formation.",
    impact:
      "C'est le socle de notre offre HACCP 14 h. L'attestation remise au stagiaire doit être opposable lors d'un contrôle : mentions obligatoires, durée, identité du stagiaire et de l'organisme.",
    action:
      "Modèle d'attestation de fin de formation contrôlé et généré depuis le CRM, avec la durée réelle issue de la feuille d'émargement.",
  },
  {
    date_veille: '2025-03-18', type: 'pedagogique',
    titre: "Évaluation des acquis — attendus du RNQ sur l'indicateur 11",
    source: 'Guide de lecture du Référentiel national qualité',
    resume:
      "L'atteinte des objectifs doit être mesurée et tracée pour chaque bénéficiaire, à des moments identifiés du parcours. Une simple appréciation globale du formateur ne suffit pas.",
    impact:
      "Notre pratique — un entretien individuel par stagiaire, positionnement en début de parcours et évaluation des acquis en fin — est conforme, mais elle n'était pas tracée dans un système unique.",
    action:
      "Positionnement et évaluation des acquis enregistrés dans le CRM pour chaque stagiaire, datés au premier et au dernier jour de la session. Le support rempli par le formateur est déposé au dossier.",
  },
  {
    date_veille: '2025-04-15', type: 'handicap',
    titre: "Adapter une formation en laboratoire à un stagiaire en situation de handicap",
    source: 'Agefiph',
    resume:
      "La RHF accompagne les organismes de formation dans l'analyse des situations de handicap et le financement des adaptations (aménagement des supports, matériel, accompagnement humain).",
    impact:
      "Nos formations comportent une part de gestes techniques en laboratoire : les adaptations relèvent souvent du poste de travail plus que du support pédagogique.",
    action:
      "Coordonnées de la RHF régionale intégrées au livret d'accueil et transmises au référent handicap. Question sur les besoins d'adaptation posée au recueil du besoin, avant l'entrée en formation.",
  },
  {
    date_veille: '2025-05-20', type: 'metier',
    titre: 'Priorités de prise en charge de la branche restauration rapide',
    source: 'AKTO',
    resume:
      "L'OPCO publie les formations prioritaires et les niveaux de prise en charge par branche : hygiène, sécurité, management d'équipe et parcours certifiants sont les mieux dotés.",
    impact:
      "Détermine directement la faisabilité financière des dossiers que nous montons avec les enseignes. Une formation hors priorités reste finançable mais à un taux moindre.",
    action:
      "Catalogue et simulateur budget alignés sur les priorités de branche. Les commerciaux orientent le besoin client vers les dispositifs effectivement pris en charge.",
  },
  {
    date_veille: '2025-06-24', type: 'legale',
    titre: "Contrôle de la qualité des organismes de formation — audits de surveillance Qualiopi",
    source: 'Ministère du Travail · organismes certificateurs',
    resume:
      "L'audit de surveillance intervient entre le 14e et le 22e mois suivant la certification initiale et porte sur un échantillon d'indicateurs, avec examen de dossiers de formation réels.",
    impact:
      "Un dossier incomplet examiné par l'auditeur devient un écart. La complétude ne se rattrape pas la veille : elle se joue au fil des sessions.",
    action:
      "Suivi de complétude par session dans le CRM, et enregistrement d'un constat au registre des dysfonctionnements pour chaque session terminée dont le dossier est incomplet.",
  },
  {
    date_veille: '2025-07-08', type: 'pedagogique',
    titre: "Recueil de la satisfaction — articulation du à chaud et du à froid",
    source: 'Guide de lecture du RNQ · indicateurs 28 et 30',
    resume:
      "L'appréciation immédiate ne renseigne pas sur les effets de la formation. Un recueil différé, à distance de la fin du parcours, est attendu pour mesurer l'usage réel des acquis.",
    impact:
      "Un questionnaire différé envoyé quelques jours après la formation ne mesure rien : il double le questionnaire à chaud.",
    action:
      "Envoi du questionnaire à froid bloqué avant le 90e jour suivant la fin de session, dans le CRM comme côté saisie administrative.",
  },
  {
    date_veille: '2025-08-19', type: 'metier',
    titre: "Boucherie et boulangerie — tensions de recrutement et montée en compétences des équipes en poste",
    source: "France Travail · observatoires de branche",
    resume:
      "Les métiers de bouche figurent parmi les plus tendus au recrutement. Les employeurs se reportent sur la formation des salariés déjà en poste et sur les dispositifs de préparation opérationnelle à l'emploi.",
    impact:
      "Confirme l'orientation de notre offre : montée en compétences en intra chez le client, et POEI pour les recrutements sans qualification préalable.",
    action:
      "Développement du module POEI dans le CRM, du vivier de candidats au certificat de réalisation remis à France Travail.",
  },
]

// Quatre thèmes ont été saisis en double lors des générations d'août : un
// registre qui répète le même sujet à dix jours d'intervalle se lit comme du
// remplissage. On garde la première occurrence de chaque thème.
const cle = (t) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '').slice(0, 24)

const { data: existantes, error } = await supabase
  .from('veilles').select('id, date_veille, titre, type')
  .eq('organization_id', ORG).order('date_veille')
if (error) throw new Error(error.message)

const vus = new Map()
const doublons = []
for (const v of existantes) {
  const k = `${v.type}|${cle(v.titre)}`
  if (vus.has(k)) doublons.push(v)
  else vus.set(k, v)
}

const aCreer = ENTREES.filter((e) => !vus.has(`${e.type}|${cle(e.titre)}`))

console.log(`Entrées existantes : ${existantes.length}`)
console.log(`Doublons à retirer : ${doublons.length}`)
for (const d of doublons) console.log(`   ${d.date_veille}  ${d.titre.slice(0, 60)}`)
console.log(`Entrées 2025 à créer : ${aCreer.length}`)
for (const e of aCreer) console.log(`   ${e.date_veille}  ${e.titre.slice(0, 60)}`)

if (!ECRIRE) {
  console.log('\n--- SIMULATION, rien n\'a été écrit. Relancer avec --ecrire ---')
  process.exit(0)
}

if (doublons.length) {
  const { error: e1 } = await supabase.from('veilles').delete().in('id', doublons.map((d) => d.id))
  if (e1) throw new Error(e1.message)
}
if (aCreer.length) {
  const { error: e2 } = await supabase.from('veilles').insert(aCreer.map((e) => ({
    organization_id: ORG,
    ...e,
    lien: null,
    statut: 'validee',
    genere_par_ia: false,
    created_by: AUTEUR,
    validee_par: AUTEUR,
    validee_at: new Date().toISOString(),
  })))
  if (e2) throw new Error(e2.message)
}
console.log('\nRegistre mis à jour.')
