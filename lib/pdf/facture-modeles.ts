// Modèles de style pour les factures de prestation des formateurs.
// Module léger (sans @react-pdf) importable côté client (formulaires) comme serveur.
export type FactureModele = 'epure' | 'classique' | 'moderne'

export const FACTURE_MODELES: { value: FactureModele; label: string; description: string }[] = [
  { value: 'epure', label: 'Épuré', description: 'Minimaliste, noir et blanc, typographique' },
  { value: 'classique', label: 'Classique', description: 'Encadré, présentation traditionnelle' },
  { value: 'moderne', label: 'Moderne', description: 'Bandeau coloré, présentation contemporaine' },
]
