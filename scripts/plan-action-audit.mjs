#!/usr/bin/env node
/**
 * Plan d'actions issu de l'audit blanc du 12 août 2026.
 *
 * Le consultant a relevé les écarts indicateur par indicateur ; ce script les
 * charge dans le registre du CRM, chacun rattaché à son indicateur, avec un
 * responsable et une échéance. C'est le livrable attendu par l'indicateur 32,
 * qui est précisément celui que le consultant a noté « à faire sur CRM ».
 *
 * Les actions posées la veille sur la base de nos propres constats sont
 * remplacées : elles portaient l'ancienne numérotation et se recoupaient avec
 * celles-ci.
 *
 *   node scripts/plan-action-audit.mjs           # simulation
 *   node scripts/plan-action-audit.mjs --ecrire
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const supabase = createClient(
  env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1],
  env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1],
)
const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const MOI = '16a538a0-ca4e-42f1-b2a0-354aea73ca46'
const ECRIRE = process.argv.includes('--ecrire')
const AUJ = new Date().toISOString().slice(0, 10)

/** J-4 pour ce qui doit être prêt le jour de l'audit, le reste à un mois. */
const AVANT_AUDIT = '2026-08-17'
const APRES = '2026-09-30'

const PLAN = [
  // ── À produire avant l'audit ─────────────────────────────────────────
  [9, 'haute', AVANT_AUDIT, "Déployer le nouveau règlement intérieur stagiaires",
    "Le règlement intérieur n'est ni remis aux stagiaires ni publié. La loi n° 2026-534 du 25 juin 2026 impose en outre trois nouvelles mentions à l'article L6352-4 : traitement égal des stagiaires, liberté d'expression et de conscience, neutralité des enseignements. Personnaliser la trame d'août 2026 transmise par le consultant, la publier sur le site, la joindre au livret d'accueil et tracer sa remise."],
  [1, 'haute', AVANT_AUDIT, "Compléter l'information publique sur les formations",
    "Publier les programmes sur le site avec, pour chacun, les modalités et délais d'accès, les tarifs et les dates. Ajouter le certificat Qualiopi et le logo conforme portant la mention « actions de formation »."],
  [21, 'haute', AVANT_AUDIT, "Évaluer le profil et les compétences de chaque formateur",
    "La fiche de poste, le processus de recrutement, les CV et les contrats sont conformes. Manquent la grille d'entretien de recrutement et la fiche d'évaluation du profil et des compétences, à renseigner pour chaque formateur intervenu. Trames transmises par le consultant."],
  [8, 'haute', AVANT_AUDIT, "Rendre visibles les questions et les réponses des questionnaires",
    "Sur certaines sessions, seul le résultat en pourcentage est consultable : l'auditeur doit pouvoir lire les questions et ce que le stagiaire a répondu. Les questionnaires vierges sont conformes. Recueillir les réponses manquantes auprès des formateurs et les saisir, en déposant le support papier au dossier."],
  [11, 'haute', AVANT_AUDIT, "Recueillir l'évaluation des acquis de tous les stagiaires",
    "Les questionnaires d'acquis et les certificats de réalisation sont conformes ; les réponses de l'ensemble des stagiaires restent à recueillir. Impression des questionnaires vierges par session, saisie des résultats et dépôt du support au dossier."],
  [4, 'haute', AVANT_AUDIT, "Dater l'analyse du besoin avant la signature de la convention",
    "L'analyse du besoin doit être antérieure à la contractualisation ; ce n'est pas le cas sur toutes les actions. Reprendre les dossiers concernés et fiabiliser l'ordre des étapes pour les actions à venir."],
  [18, 'haute', AVANT_AUDIT, "Établir l'organigramme fonctionnel",
    "Identifier les intervenants par champ — pédagogique, administratif, commercial, logistique — avec les référents pédagogique, administratif et handicap. La coordination est effective et tracée dans le CRM, mais elle n'est pas représentée."],
  [31, 'haute', AVANT_AUDIT, "Déployer le formulaire de réclamation",
    "Mettre en service le formulaire transmis par le consultant, le rendre accessible aux parties prenantes, et consigner dans le CRM les actions menées sur les réclamations déjà enregistrées."],
  [12, 'haute', AVANT_AUDIT, "Justifier chaque absence au dossier de session",
    "Toute absence doit être justifiée au dossier. Reprendre les sessions terminées et rattacher le justificatif ou le motif à chaque absence constatée."],

  // ── À engager, échéance à un mois ────────────────────────────────────
  [12, 'moyenne', APRES, "Formaliser le processus de prévention des abandons",
    "L'indicateur s'applique aux formations de plus de deux jours. Adapter la trame transmise, y intégrer le questionnaire d'abandon, et réunir les preuves concrètes de sa mise en œuvre : relances, entretiens, solutions proposées."],
  [30, 'haute', APRES, "Solliciter les appréciations des entreprises et des financeurs",
    "Le recueil auprès des stagiaires et de l'équipe pédagogique est en place. Manquent l'appréciation des entreprises clientes et la sollicitation des financeurs, exigée au moins une fois par an. Mettre en place les envois et un dispositif de relance des questionnaires."],
  [6, 'moyenne', APRES, "Ajouter les modalités pédagogiques à chaque module de programme",
    "Les programmes décrivent le contenu par module mais pas les méthodes mobilisées ni les modalités d'évaluation associées. À compléter module par module."],
  [26, 'moyenne', APRES, "Constituer le réseau handicap et former le référent",
    "Suivre la formation à l'offre Ressource Handicap Formation de l'Agefiph, produire la preuve de la rencontre avec Cap emploi, compléter la liste des partenaires du territoire et mettre en place la fiche d'analyse des situations de handicap."],
  [19, 'moyenne', APRES, "Tracer la mise à disposition des ressources pédagogiques",
    "Les supports sont actualisés et datés, mais rien ne prouve leur remise aux stagiaires des sessions terminées. Adresser les supports par message et conserver la trace de l'envoi."],
  [22, 'moyenne', APRES, "Établir le plan de développement des compétences",
    "La formation des franchisés est tracée pour une partie de l'équipe. Demander aux autres formateurs leurs justificatifs de formation continue et consolider le plan pour l'ensemble des personnes concourant à la formation."],
  [17, 'moyenne', APRES, "Verser au dossier les moyens matériels et les pièces des formateurs",
    "Vérifier la liste du matériel et l'étayer par les factures. Verser dans le CRM les CV, diplômes et contrats des formateurs, aujourd'hui conservés hors outil."],
  [10, 'moyenne', APRES, "Formaliser le processus d'adaptation des prestations",
    "L'adaptation est réelle — programmes sur mesure, groupes de niveau issus du positionnement, adaptation aux non-conformités relevées à l'audit initial de l'établissement — mais elle n'est ni décrite ni étayée. Écrire le processus et l'illustrer par des cas concrets."],
  [5, 'basse', APRES, "Reformuler les objectifs non évaluables des programmes",
    "Les objectifs sont conformes dans l'ensemble ; remplacer les verbes qui ne se mesurent pas, « comprendre » notamment, par des verbes évaluables tels qu'« identifier » ou « réaliser »."],
  [23, 'moyenne', APRES, "Joindre les preuves d'exploitation de la veille",
    "Le registre est tenu et chaque entrée porte son impact et l'action engagée. Joindre les preuves concrètes de ces actions : supports modifiés, procédures mises à jour, diffusion aux formateurs."],
  [32, 'moyenne', APRES, "Suivre le plan d'amélioration dans la durée",
    "Le plan existe et s'alimente des réclamations, des constats documentaires et de la veille. Ce qui reste à démontrer, c'est son suivi : revue périodique des actions, vérification de leur efficacité et clôture motivée."],
]

const { data: inds, error: e0 } = await supabase
  .from('qualiopi_indicateurs').select('id, indicateur').eq('organization_id', ORG)
if (e0) throw new Error(e0.message)
const idDe = new Map(inds.map((i) => [i.indicateur, i.id]))

const { data: anciennes } = await supabase
  .from('actions_amelioration').select('id, titre, source').eq('organization_id', ORG).eq('source', 'audit')

console.log(`Actions issues de l'audit blanc : ${PLAN.length}`)
console.log(`  avant le 17 août : ${PLAN.filter((p) => p[2] === AVANT_AUDIT).length}`)
console.log(`  à un mois        : ${PLAN.filter((p) => p[2] === APRES).length}`)
console.log(`Actions « audit » déjà en base, à remplacer : ${(anciennes || []).length}\n`)
for (const [ind, prio, ech, titre] of PLAN) {
  console.log(`  ind.${String(ind).padStart(2)}  ${ech}  ${prio.padEnd(7)} ${titre}`)
}

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

if ((anciennes || []).length) {
  const { error } = await supabase.from('actions_amelioration')
    .delete().in('id', anciennes.map((a) => a.id))
  if (error) throw new Error(error.message)
}

const { error } = await supabase.from('actions_amelioration').insert(
  PLAN.map(([ind, priorite, echeance, titre, description]) => ({
    organization_id: ORG,
    titre, description,
    source: 'audit',
    indicateur_id: idDe.get(ind) || null,
    status: 'en_cours',
    priorite,
    responsable_id: MOI,
    date_planifiee: AUJ,
    date_echeance: echeance,
    created_by: MOI,
  })),
)
if (error) throw new Error(error.message)
console.log('\nPlan chargé.')
