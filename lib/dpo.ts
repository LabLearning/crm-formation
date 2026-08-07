/**
 * Déroulé opérationnel des sessions.
 *
 * Deux niveaux, à ne pas confondre :
 *
 *   1. LE SOCLE COMMUN — s'applique à TOUTE session, quelle que soit la
 *      formation : positionnement en amont, évaluation des acquis en fin de
 *      parcours, satisfaction à chaud, puis à froid à trois mois. Ces quatre
 *      jalons sont déjà tracés dans le CRM : leur état est CALCULÉ à partir des
 *      questionnaires réellement remplis, pas déclaré par le formateur.
 *
 *   2. LE DÉROULÉ TERRAIN HYGIÈNE — propre aux formations hygiène / HACCP /
 *      PMS. C'est la méthode d'intervention de Lab Learning : audit d'entrée →
 *      actions → formation → audit de sortie. Le formateur s'y engage par
 *      signature et valide ses étapes session par session.
 *
 * La version sert aux signatures : si la méthode évolue, les formateurs
 * doivent re-signer.
 */
import { themeOf } from '@/lib/branches'

export const DPO_VERSION = '2026-08'
export const DPO_TITRE = 'Hygiène alimentaire et prévention des risques — Méthodes HACCP & PMS'

/** Le déroulé terrain ne concerne que les formations hygiène / HACCP / PMS. */
export function estFormationHygiene(intitule?: string | null): boolean {
  return themeOf(intitule || '') === 'hygiene'
}

// ── 1. Socle commun à toutes les sessions ───────────────────────────────────

export interface JalonSocle {
  cle: string
  titre: string
  quand: string
  description: string
  ou: string
}

export const SOCLE: JalonSocle[] = [
  {
    cle: 'positionnement',
    titre: 'Questionnaire de positionnement',
    quand: 'Avant la formation',
    description: "Évalue le niveau initial de chaque participant et permet d'adapter la formation.",
    ou: 'Onglet QCM de la session',
  },
  {
    cle: 'evaluation_acquis',
    titre: "Questionnaire d'évaluation des acquis",
    quand: 'À la fin de la formation',
    description: 'Mesure ce que chaque participant a réellement acquis.',
    ou: 'Onglet QCM de la session',
  },
  {
    cle: 'satisfaction_chaud',
    titre: 'Questionnaire de satisfaction à chaud',
    quand: 'À l\'issue de la formation',
    description: "Recueille l'appréciation des participants immédiatement après la session.",
    ou: 'Onglet Évaluations de la session',
  },
  {
    cle: 'satisfaction_froid',
    titre: 'Questionnaire de satisfaction à froid',
    quand: 'Trois mois après la formation',
    description: "Mesure l'impact durable de la formation sur les pratiques.",
    ou: 'Envoi automatique à J+90',
  },
]

export interface EtapeDpo {
  cle: string
  numero: number
  titre: string
  intention: string
  objectifs: string[]
  /** Ce que le formateur doit avoir fait pour cocher l'étape. */
  attendus: string[]
  /** Outil du système d'information qui porte la preuve. */
  outil?: { nom: string; ou: string }
  /** Une étape obligatoire manque → pastille rouge et session incomplète. */
  obligatoire: boolean
}

export const PHILOSOPHIE = [
  "Partir de la réalité de l'établissement (audit initial)",
  'Prioriser les risques réels',
  "Mettre en conformité ce qui doit l'être immédiatement",
  "Former par l'action et la mise en situation",
  'Laisser une trace concrète et mesurable du passage de Lab Learning (avant / après)',
  "Sécuriser l'établissement face aux contrôles sanitaires",
]

export const POSTURE =
  "Le formateur n'est pas uniquement un « transmetteur de savoir », mais un acteur de la mise en conformité."

/** Les 7 étapes du déroulé terrain — formations hygiène uniquement. */
export const ETAPES: EtapeDpo[] = [
  {
    cle: 'audit_initial',
    numero: 1,
    titre: "Audit initial de l'établissement",
    intention: "Point de départ obligatoire de toute intervention.",
    objectifs: [
      'Évaluer le niveau réel de conformité hygiène et sécurité alimentaire',
      'Identifier les pratiques à risque et les non-conformités',
      'Adapter la formation aux besoins concrets du site',
      "Créer une base de comparaison pour l'audit de sortie",
    ],
    attendus: [
      'Observation des pratiques (gestes, habitudes, organisation)',
      'Analyse des flux et de la marche en avant',
      "Vérification de l'hygiène du personnel, des locaux et du matériel",
      'Contrôle des températures, stockages, DLC/DDM',
      'Vérification de la gestion des déchets',
      'Analyse de la prévention des contaminations croisées',
      'Premiers constats sur la traçabilité et les autocontrôles',
      "L'audit se fait sans jugement, dans une posture d'accompagnement",
    ],
    outil: {
      nom: 'AuditHygiène Pro',
      ou: "Audit réalisé dans AuditHygiène Pro. Le rapport généré remonte automatiquement dans le CRM (Qualité › Audits hygiène & DUERP) et s'affiche sur la fiche du client.",
    },
    obligatoire: true,
  },
  {
    cle: 'documents_obligatoires',
    numero: 2,
    titre: 'Vérification des documents obligatoires',
    intention: "Un document doit être utile, compréhensible et utilisé, pas uniquement présent.",
    objectifs: [
      "Vérifier la conformité réglementaire de l'établissement",
      'Identifier immédiatement les manques documentaires',
      'Prioriser les actions correctives liées aux obligations légales',
    ],
    attendus: [
      'Hygiène : PMS, procédures de nettoyage et désinfection, fiches de traçabilité (réception, production, DLC/DDM), relevés de températures, gestion des allergènes, affichage des origines des viandes',
      'Contrats externes : dératisation / désinsectisation / désinfection, analyses laboratoire, collecte des huiles usagées',
      'Sécurité : vérification annuelle des installations électriques, étanchéité des circuits frigorifiques, extincteurs, formation incendie (tous les 6 mois), ramonage des hottes',
      "Fiches de données de sécurité des produits d'entretien",
      "Document Unique d'Évaluation des Risques Professionnels (DUERP)",
    ],
    outil: {
      nom: 'AuditHygiène Pro',
      ou: "Checklist documentaire de l'audit (fourni / manquant). Le DUERP se construit dans le module DUERP du même outil.",
    },
    obligatoire: true,
  },
  {
    cle: 'debrief_responsable',
    numero: 3,
    titre: 'Débrief avec le responsable sur place',
    intention: "Posture d'accompagnement, jamais de sanction.",
    objectifs: [
      'Partager les constats de manière claire, factuelle et bienveillante',
      "Impliquer le responsable dans la démarche d'amélioration",
      'Créer une relation de confiance',
      "Favoriser l'adhésion aux actions correctives",
    ],
    attendus: [
      'Restitution orale des points forts et des points de vigilance',
      'Explication des non-conformités et des risques associés (sanitaires, réglementaires, image)',
      'Priorisation des risques',
      "Échange sur les contraintes réelles de l'établissement",
    ],
    outil: { nom: 'CRM', ou: 'À consigner dans le rapport de session (onglet Rapport).' },
    obligatoire: true,
  },
  {
    cle: 'plan_action',
    numero: 4,
    titre: "Élaboration et validation du plan d'action",
    intention: "Sans validation des moyens, le plan d'action n'est pas opérationnel.",
    objectifs: [
      'Structurer les actions correctives à mener',
      'Hiérarchiser les actions selon le niveau de risque',
      'Construire un plan réaliste, applicable rapidement',
    ],
    attendus: [
      'Actions correctives immédiates (priorité sanitaire)',
      'Actions correctives à court et moyen terme',
      'Ordre de priorité, responsables désignés, délais de mise en œuvre',
      'Moyens nécessaires (humains, matériels, organisationnels)',
      'Validation par le responsable ou le dirigeant : mobilisation des équipes, achat du matériel, adaptation des process',
    ],
    outil: {
      nom: 'AuditHygiène Pro',
      ou: "Plan d'action du DUERP (responsable, échéance, statut). Les actions en retard remontent dans le CRM.",
    },
    obligatoire: true,
  },
  {
    cle: 'actions_correctives',
    numero: 5,
    titre: 'Mise en place des actions correctives',
    intention: "Cœur de la valeur ajoutée Lab Learning : l'avant / après est obligatoire.",
    objectifs: [
      "Passer de la théorie à l'action",
      "Mettre l'établissement en conformité réelle",
      'Laisser une trace visible du passage de la formation',
    ],
    attendus: [
      'Réorganisation des zones de travail, des stockages',
      'Mise en place ou correction du plan de nettoyage',
      'Installation ou remplacement du matériel manquant (thermomètres, bacs, affichages)',
      'Création ou mise à jour des fiches obligatoires, mise en place des relevés de température',
      'Sécurisation des pratiques à risque',
      "Preuves avant / après : photos, documents remplis, affichages posés",
    ],
    outil: { nom: 'CRM', ou: 'Photos et documents déposés sur la session (onglet Documents).' },
    obligatoire: true,
  },
  {
    cle: 'formation_equipes',
    numero: 6,
    titre: 'Formation des équipes (intégrée au terrain)',
    intention: "La formation s'appuie sur les pratiques observées et le PMS réel de l'établissement.",
    objectifs: [
      "Donner du sens aux règles d'hygiène",
      'Rendre les équipes autonomes',
      'Assurer l’application durable des bonnes pratiques',
    ],
    attendus: [
      'Formation directement sur poste de travail',
      'Explication des règles à partir des situations réelles',
      'Mise en situation et corrections en temps réel',
      'Utilisation des supports et outils mis en place',
      "Émargement signé pour chaque demi-journée",
    ],
    outil: { nom: 'CRM', ou: 'Émargement numérique et supports pédagogiques de la session.' },
    obligatoire: true,
  },
  {
    cle: 'audit_sortie',
    numero: 7,
    titre: 'Audit de sortie',
    intention: 'Mesurer, valider, valoriser le travail accompli.',
    objectifs: [
      'Mesurer les progrès réalisés',
      'Valider la conformité atteinte',
      "Sécuriser l'établissement face aux contrôles",
      'Valoriser le travail accompli',
    ],
    attendus: [
      "Reprise de la grille d'audit initiale",
      'Vérification des actions mises en œuvre',
      'Évaluation des nouvelles pratiques',
      'Comparaison avant / après',
    ],
    outil: {
      nom: 'AuditHygiène Pro',
      ou: "Nouvel audit de type « Audit de sortie » sur le même établissement. L'écart de score avec l'audit initial s'affiche sur la fiche client du CRM.",
    },
    obligatoire: true,
  },
]

/**
 * Traçabilité propre à l'intervention terrain (le socle commun est traité
 * à part : voir SOCLE).
 */
export const TRACABILITE: { moment: string; items: { cle: string; label: string; outil: string }[] }[] = [
  {
    moment: "Avant l'intervention",
    items: [
      { cle: 'recueil_besoin', label: 'Recueil du besoin de la session', outil: 'CRM — onglet Recueil du besoin' },
    ],
  },
  {
    moment: "Pendant l'intervention",
    items: [
      { cle: 'emargement', label: 'Émargement signé de chaque demi-journée', outil: 'CRM — onglet Émargement' },
      { cle: 'compte_rendu', label: 'Compte rendu de passage : constats initiaux, actions mises en place, documents créés ou mis à jour, modifications de pratiques observées', outil: 'CRM — onglet Rapport' },
    ],
  },
]

export const ETAPES_PAR_CLE: Record<string, EtapeDpo> = Object.fromEntries(ETAPES.map((e) => [e.cle, e]))

export type StatutEtape = 'a_faire' | 'fait' | 'non_applicable'

/** Une session est conforme au déroulé quand toutes les étapes obligatoires sont faites. */
export function etatDeroule(validations: { etape_cle: string; statut: string }[]) {
  const parCle = new Map(validations.map((v) => [v.etape_cle, v.statut]))
  const manquantes = ETAPES.filter(
    (e) => e.obligatoire && !['fait', 'non_applicable'].includes(parCle.get(e.cle) || 'a_faire'),
  )
  return {
    total: ETAPES.length,
    faites: ETAPES.filter((e) => parCle.get(e.cle) === 'fait').length,
    manquantes,
    complet: manquantes.length === 0,
  }
}
