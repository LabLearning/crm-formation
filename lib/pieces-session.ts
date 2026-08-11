/**
 * Pièces attendues au dossier d'une action de formation.
 *
 * Une pièce est considérée présente si le CRM l'a produite (émargement signé
 * électroniquement, questionnaire rempli…) OU si son justificatif a été déposé
 * — le plus souvent un PDF reçu par mail du formateur, ou repris de l'ancien
 * outil. Un scan de feuille signée est une preuve ; l'exiger sous forme
 * numérique native reviendrait à ignorer la réalité du terrain.
 */

export interface PieceDossier {
  cle: string
  label: string
  indicateur: number
  /** Type de document accepté comme justificatif. */
  typeDocument: string
  aide: string
  /** Une absence sur cet indicateur est une non-conformité majeure. */
  majeure: boolean
}

export const PIECES: PieceDossier[] = [
  {
    cle: 'recueil', label: 'Recueil du besoin', indicateur: 4, typeDocument: 'recueil_besoin',
    aide: "Analyse du besoin du client avant la formation.", majeure: true,
  },
  {
    cle: 'convention', label: 'Convention signée', indicateur: 14, typeDocument: 'convention_signee',
    aide: "Convention ou contrat de formation, signé par le client.", majeure: true,
  },
  {
    cle: 'contrat', label: 'Contrat formateur', indicateur: 21, typeDocument: 'contrat_formateur',
    aide: "Contrat de prestation du formateur intervenu.", majeure: true,
  },
  {
    cle: 'positionnement', label: 'Positionnement', indicateur: 8, typeDocument: 'positionnement',
    aide: "Évaluation du niveau des participants avant l'entrée en formation.", majeure: false,
  },
  {
    cle: 'emargement', label: 'Émargement signé', indicateur: 12, typeDocument: 'emargement_signe',
    aide: "Feuille d'émargement signée par les stagiaires et le formateur.", majeure: false,
  },
  {
    cle: 'acquis', label: 'Évaluation des acquis', indicateur: 11, typeDocument: 'evaluation_acquis',
    aide: "Mesure de l'atteinte des objectifs en fin de formation.", majeure: true,
  },
  {
    cle: 'satisfaction', label: 'Satisfaction', indicateur: 28, typeDocument: 'satisfaction',
    aide: "Appréciation des stagiaires à l'issue de la formation.", majeure: false,
  },
]

export const ORIGINES = [
  { value: 'mail', label: 'Reçue par mail du formateur' },
  { value: 'papier', label: 'Numérisée depuis le papier' },
  { value: 'dendreo', label: "Reprise de l'ancien outil" },
  { value: 'crm', label: 'Produite par le CRM' },
]

export interface EtatPiece {
  cle: string
  presente: boolean
  /** « crm » quand la preuve est native, sinon la provenance du justificatif. */
  source: string | null
  documentId?: string | null
}

/** Complétude d'un dossier : le score et ce qui manque. */
export function completude(etats: EtatPiece[]) {
  const parCle = new Map(etats.map((e) => [e.cle, e]))
  const manquantes = PIECES.filter((p) => !parCle.get(p.cle)?.presente)
  return {
    total: PIECES.length,
    presentes: PIECES.length - manquantes.length,
    manquantes,
    majeuresManquantes: manquantes.filter((p) => p.majeure),
    complet: manquantes.length === 0,
  }
}
