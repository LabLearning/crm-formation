#!/usr/bin/env node
/**
 * Aligne les 32 indicateurs sur le Référentiel national qualité officiel.
 *
 * Le CRM portait une numérotation maison : convention en indicateur 14,
 * satisfaction en 28, réclamations en 29, et un « conformité réglementaire »
 * en 27 qui n'existe pas au référentiel. Un auditeur qui lit un numéro faux en
 * déduit que l'organisme ne connaît pas le référentiel, et regarde tout le
 * reste avec méfiance.
 *
 * Les libellés, critères et niveaux repris ici viennent du plan d'actions
 * transmis par le consultant après l'audit blanc du 12 août 2026 — c'est le
 * document de référence de l'audit.
 *
 *   node scripts/referentiel-rnq.mjs           # simulation
 *   node scripts/referentiel-rnq.mjs --ecrire
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

/**
 * Les 32 indicateurs du RNQ.
 *
 * `niveau` reprend l'état constaté à l'audit blanc : « blocage » chez le
 * consultant devient non conforme, « en cours » partiellement conforme,
 * « terminé » conforme. Lab Learning est un organisme de formation, pas un
 * CFA : les indicateurs propres à l'apprentissage sont sans objet.
 */
const RNQ = [
  // ── Critère 1 — information du public ──────────────────────────────────
  [1, 1, "Information du public", 'non_conforme',
    "Programmes non publiés sur le site, et modalités d'accès, tarifs et dates absents du support d'information. Certificat Qualiopi et logo conforme à ajouter au site."],
  [2, 1, "Indicateurs de résultats", 'conforme',
    "Taux de satisfaction, de réussite et de retour à l'emploi calculés et publiés."],
  [3, 1, "Obtention des certifications", 'non_applicable',
    "Aucune prestation ne conduit actuellement à une certification professionnelle enregistrée."],

  // ── Critère 2 — objectifs et conception ────────────────────────────────
  [4, 2, "Analyse du besoin du bénéficiaire", 'non_conforme',
    "L'analyse du besoin doit être datée avant la signature de la convention, ce qui n'est pas le cas partout. Fiche d'analyse des situations de handicap à mettre en place (trame Agefiph transmise)."],
  [5, 2, "Objectifs opérationnels et évaluables", 'partiellement_conforme',
    "Objectifs conformes dans l'ensemble ; reformuler les verbes non évaluables (« comprendre » → « identifier »)."],
  [6, 2, "Contenus et modalités de mise en œuvre", 'non_conforme',
    "Les programmes décrivent le contenu par module mais pas les modalités pédagogiques : à ajouter module par module."],
  [7, 2, "Adéquation du contenu aux exigences de la certification", 'non_applicable',
    "Sans objet en l'absence de prestation certifiante."],
  [8, 2, "Positionnement et évaluation des acquis à l'entrée", 'non_conforme',
    "Les questionnaires vierges sont conformes. Sur certaines sessions, seul le résultat en pourcentage est consultable : les questions et les réponses du stagiaire doivent être visibles."],

  // ── Critère 3 — mise en œuvre ──────────────────────────────────────────
  [9, 3, "Conditions de déroulement de la prestation", 'non_conforme',
    "Règlement intérieur non remis aux stagiaires ni publié : trame d'août 2026 à déployer (art. L6352-4 modifié). Conventions à signer avant l'entrée en formation. CGV et mentions légales en ligne."],
  [10, 3, "Adaptation de la prestation et du suivi", 'partiellement_conforme',
    "L'adaptation est réelle — programmes sur mesure, groupes de niveau issus du positionnement, audit initial de l'établissement — mais le processus n'est pas formalisé ni étayé de preuves."],
  [11, 3, "Atteinte des objectifs de la prestation", 'non_conforme',
    "Certificats de réalisation conformes, questionnaires d'acquis conformes ; les réponses de tous les stagiaires restent à recueillir."],
  [12, 3, "Engagement des bénéficiaires et prévention des abandons", 'non_conforme',
    "Processus de prévention des abandons en cours de formalisation (trame transmise). Chaque absence doit être justifiée au dossier."],
  [13, 3, "Coordination des apprentissages en alternance", 'non_applicable',
    "Aucune formation en alternance dispensée."],
  [14, 3, "Accompagnement socio-professionnel et citoyenneté", 'non_applicable',
    "Indicateur propre aux centres de formation d'apprentis."],
  [15, 3, "Information des apprentis sur leurs droits et devoirs", 'non_applicable',
    "Indicateur propre aux centres de formation d'apprentis."],
  [16, 3, "Présentation des bénéficiaires à la certification", 'non_applicable',
    "Sans objet en l'absence de prestation certifiante."],

  // ── Critère 4 — moyens ─────────────────────────────────────────────────
  [17, 4, "Moyens humains et techniques", 'partiellement_conforme',
    "Convention de mise à disposition des locaux conforme. Liste du matériel à vérifier et à étayer par les factures ; CV, diplômes et contrats des formateurs à verser au dossier."],
  [18, 4, "Coordination des intervenants", 'non_conforme',
    "La coordination est effective et tracée dans le CRM, mais l'organigramme fonctionnel reste à produire."],
  [19, 4, "Ressources pédagogiques", 'non_conforme',
    "Supports pédagogiques actualisés et datés. Reste à tracer leur mise à disposition auprès des stagiaires des sessions terminées."],
  [20, 4, "Conseil de perfectionnement et personnel dédié", 'non_applicable',
    "Indicateur propre aux centres de formation d'apprentis."],

  // ── Critère 5 — compétences des personnels ─────────────────────────────
  [21, 5, "Compétences des intervenants", 'non_conforme',
    "Fiche de poste, processus de recrutement, CV et contrats des formateurs conformes. Manquent la grille d'entretien de recrutement et l'évaluation du profil et des compétences de chaque formateur (trames transmises)."],
  [22, 5, "Entretien et développement des compétences", 'partiellement_conforme',
    "Formation des franchisés tracée pour une partie de l'équipe ; les preuves restent à demander aux autres formateurs. Plan de développement des compétences à établir."],

  // ── Critère 6 — environnement professionnel ────────────────────────────
  [23, 6, "Veille légale et réglementaire", 'partiellement_conforme',
    "Registre tenu et exploité, chaque entrée portant son impact et l'action engagée ; les preuves d'actions concrètes restent à joindre."],
  [24, 6, "Veille sur les emplois et les métiers", 'partiellement_conforme',
    "Veille tenue sur les branches HCR, boucherie, boulangerie et restauration rapide ; preuves d'exploitation à joindre."],
  [25, 6, "Veille pédagogique et technologique", 'partiellement_conforme',
    "Veille tenue ; preuves d'exploitation à joindre."],
  [26, 6, "Accueil des publics en situation de handicap", 'non_conforme',
    "Référent handicap désigné et liste de partenaires en cours de constitution. Formation à l'offre Ressource Handicap Formation à suivre, et preuve de la rencontre avec Cap emploi à produire."],
  [27, 6, "Sous-traitance et portage salarial", 'conforme',
    "Contrats de sous-traitance formalisés avec chaque formateur intervenant, assortis des justificatifs de conformité."],
  [28, 6, "Formation en situation de travail et réseau socio-économique", 'non_applicable',
    "Aucune période de formation en situation de travail au sens de l'indicateur."],
  [29, 6, "Actions en faveur de l'insertion et de la poursuite d'études", 'non_applicable',
    "Indicateur propre aux centres de formation d'apprentis."],

  // ── Critère 7 — appréciations et réclamations ──────────────────────────
  [30, 7, "Recueil des appréciations des parties prenantes", 'non_conforme',
    "Appréciations des stagiaires et de l'équipe pédagogique recueillies dans le CRM. Restent à traiter : la visibilité des questions et réponses, la relance des questionnaires, le recueil auprès des entreprises et la sollicitation annuelle des financeurs."],
  [31, 7, "Traitement des réclamations et des aléas", 'non_conforme',
    "Registre des réclamations tenu ; formulaire de réclamation à déployer (trame transmise) et actions menées à consigner dans le CRM."],
  [32, 7, "Mesures d'amélioration continue", 'partiellement_conforme',
    "Plan d'amélioration alimenté par les réclamations, les constats documentaires et la veille. Son suivi dans la durée reste à démontrer."],
]

const NIVEAUX = { conforme: 'OK ', partiellement_conforme: '~~~', non_conforme: '!!!', non_applicable: ' na' }

const { data: existants, error } = await supabase
  .from('qualiopi_indicateurs').select('id, indicateur, critere, libelle, niveau').eq('organization_id', ORG)
if (error) throw new Error(error.message)
const parNum = new Map(existants.map((i) => [i.indicateur, i]))

console.log('RÉFÉRENTIEL NATIONAL QUALITÉ — 32 indicateurs\n')
let renommes = 0
for (const [num, critere, libelle, niveau, commentaire] of RNQ) {
  const av = parNum.get(num)
  const change = av && (av.libelle !== libelle || av.critere !== critere)
  if (change) renommes++
  console.log(`${String(num).padStart(2)} C${critere} ${NIVEAUX[niveau]}  ${libelle}${change ? `   ← était « ${av.libelle} » (C${av.critere})` : ''}`)
}
const compte = {}
for (const r of RNQ) compte[r[3]] = (compte[r[3]] || 0) + 1
console.log(`\n${renommes} indicateur(s) mal libellé(s) ou mal rattaché(s).`)
console.log('Niveaux :', compte)

if (!ECRIRE) {
  console.log("\n--- SIMULATION, rien n'a été écrit. Relancer avec --ecrire ---")
  process.exit(0)
}

for (const [num, critere, libelle, niveau, commentaire] of RNQ) {
  const av = parNum.get(num)
  const ligne = {
    organization_id: ORG, indicateur: num, critere, libelle,
    niveau, commentaire, date_evaluation: AUJ, evalue_par: MOI,
  }
  const { error: e } = av
    ? await supabase.from('qualiopi_indicateurs').update(ligne).eq('id', av.id)
    : await supabase.from('qualiopi_indicateurs').insert(ligne)
  if (e) throw new Error(`ind ${num} — ${e.message}`)
}
console.log('\nRéférentiel aligné.')
