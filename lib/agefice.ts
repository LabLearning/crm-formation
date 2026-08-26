/**
 * Référentiel AGEFICE 2026 — financement des dirigeants non salariés
 * (commerce, industrie, services) et de leur conjoint collaborateur.
 * Source : communication-agefice.fr (critères, plafonds, justificatifs 2026).
 * Module client-safe : constantes et calculs uniquement.
 */

export const AGEFICE_STATUTS = {
  a_constituer: 'À constituer',
  depose: 'Déposé au Point d\'Accueil',
  accorde: 'Accordé',
  refuse: 'Refusé',
  en_formation: 'Formation en cours',
  remboursement: 'Remboursement demandé',
  solde: 'Soldé',
} as const

export type AgeficeStatut = keyof typeof AGEFICE_STATUTS

export const AGEFICE_CATEGORIES = {
  obligatoire: 'Formation obligatoire / réglementée',
  metier: 'Formation métier ou transversale',
  diplomante_rncp: 'Diplômante / titre RNCP (enveloppe majorée)',
} as const

export const AGEFICE_MODALITES = {
  presentiel: { label: 'Présentiel', taux: 42 },
  distanciel_synchrone: { label: 'Distanciel synchrone', taux: 35 },
  distanciel_asynchrone: { label: 'Distanciel asynchrone', taux: 20 },
} as const

export type AgeficeModalite = keyof typeof AGEFICE_MODALITES

/** Enveloppes annuelles individuelles 2026. */
export const AGEFICE_PLAFONDS = {
  standard: 3000,
  diplomante_rncp: 5000,
  cfp_faible: 600, // CFP versée < 7 €
} as const

/** Forfaits annexes (plafonnés au coût pédagogique, seuil mini 5 €). */
export const AGEFICE_FORFAITS = {
  perte_revenus_heure: 8,
  frais_annexes_heure: 4, // présentiel hors entreprise uniquement
} as const

/** Fenêtre de dépôt : la demande doit arriver entre 15 jours et 4 mois avant le début. */
export const DEPOT_MIN_JOURS = 15
export const DEPOT_MAX_JOURS = 120
/** Remboursement : pièces à transmettre au plus tard 4 mois après la fin. */
export const REMBOURSEMENT_MAX_JOURS = 120

export const PIECES_AVANT = {
  formulaire: 'Formulaire AGEFICE signé et daté (dates précises de formation)',
  programme: 'Programme détaillé sur papier à en-tête de l\'organisme',
  piece_identite: 'Pièce d\'identité (photo + signature, moins de 10 ans)',
  attestation_cfp: 'Attestation CFP URSSAF de l\'année (avec code de sécurité)',
  convention_devis: 'Convention de formation ou devis détaillé',
  lettre_projet: 'Lettre projet (si hors domaine d\'activité / reconversion)',
  mandat: 'Mandat signé stagiaire + organisme (si accompagnement renforcé)',
  kbis_creation: 'KBIS / SIRENE + affiliation URSSAF (créateurs d\'entreprise)',
} as const

export const PIECES_APRES = {
  attestation_assiduite: 'Attestation d\'assiduité et de règlement',
  facture_acquittee: 'Facture acquittée (tamponnée, signée, mention « acquittée »)',
  emargements: 'Feuilles d\'émargement (présentiel) / logs de connexion (distanciel)',
  convention_finale: 'Convention de formation (si non transmise au dépôt)',
} as const

/** Plafond annuel applicable au dossier. */
export function plafondDossier(categorie: string, cfpFaible: boolean): number {
  if (cfpFaible) return AGEFICE_PLAFONDS.cfp_faible
  return categorie === 'diplomante_rncp' ? AGEFICE_PLAFONDS.diplomante_rncp : AGEFICE_PLAFONDS.standard
}

/** Estimation de la prise en charge : min(heures × taux, coût pédagogique, plafond). */
export function estimationPriseEnCharge(input: {
  modalite: string
  duree_heures?: number | null
  cout_pedagogique?: number | null
  categorie: string
  cfp_faible: boolean
}): number {
  const taux = AGEFICE_MODALITES[input.modalite as AgeficeModalite]?.taux ?? AGEFICE_MODALITES.presentiel.taux
  const heures = Number(input.duree_heures || 0)
  const parHeures = heures > 0 ? heures * taux : 0
  const cout = Number(input.cout_pedagogique || 0)
  const plafond = plafondDossier(input.categorie, input.cfp_faible)
  const bornes = [plafond, parHeures || plafond, cout || Infinity]
  return Math.max(0, Math.min(...bornes))
}

/** Fenêtre de dépôt pour une date de début : [début − 4 mois, début − 15 jours]. */
export function fenetreDepot(dateDebut: string): { ouverture: Date; fermeture: Date } {
  const debut = new Date(dateDebut)
  const ouverture = new Date(debut); ouverture.setDate(ouverture.getDate() - DEPOT_MAX_JOURS)
  const fermeture = new Date(debut); fermeture.setDate(fermeture.getDate() - DEPOT_MIN_JOURS)
  return { ouverture, fermeture }
}

/** Alerte de délai sur un dossier — null si rien à signaler. */
export function alerteDelai(d: {
  statut: string
  date_debut_formation?: string | null
  date_fin_formation?: string | null
}): { niveau: 'urgent' | 'attention'; message: string } | null {
  const auj = new Date()
  if ((d.statut === 'a_constituer' || d.statut === 'depose') && d.date_debut_formation) {
    const { fermeture } = fenetreDepot(d.date_debut_formation)
    const restant = Math.ceil((fermeture.getTime() - auj.getTime()) / 86400000)
    if (d.statut === 'a_constituer') {
      if (restant < 0) return { niveau: 'urgent', message: 'Fenêtre de dépôt dépassée (15 j mini avant le début)' }
      if (restant <= 10) return { niveau: 'urgent', message: `Dépôt à faire sous ${restant} j (fenêtre 15 j – 4 mois avant)` }
      if (restant <= 25) return { niveau: 'attention', message: `${restant} j restants pour déposer la demande` }
    }
  }
  if ((d.statut === 'en_formation' || d.statut === 'accorde') && d.date_fin_formation) {
    const limite = new Date(d.date_fin_formation)
    limite.setDate(limite.getDate() + REMBOURSEMENT_MAX_JOURS)
    const restant = Math.ceil((limite.getTime() - auj.getTime()) / 86400000)
    if (restant < 0) return { niveau: 'urgent', message: 'Délai de remboursement dépassé (4 mois après la fin)' }
    if (restant <= 30 && new Date(d.date_fin_formation) < auj) {
      return { niveau: restant <= 14 ? 'urgent' : 'attention', message: `${restant} j pour transmettre les pièces de remboursement` }
    }
  }
  return null
}
