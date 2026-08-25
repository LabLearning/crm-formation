/**
 * Statuts du workflow OPCO : types et libellés partagés entre le composant
 * client et les server actions — un module 'use server' ne pouvant exporter
 * que des fonctions async, ces constantes vivent ici.
 */
export type OpcoWorkflowStatus =
  | 'a_constituer' | 'pret_a_envoyer' | 'envoye_opco' | 'en_attente_opco'
  | 'valide_opco' | 'refuse_opco' | 'mise_en_paiement' | 'paye'

export const OPCO_WORKFLOW_LABELS: Record<OpcoWorkflowStatus, string> = {
  a_constituer: 'À constituer',
  pret_a_envoyer: 'Prêt à envoyer',
  envoye_opco: 'Envoyé à l\'OPCO',
  en_attente_opco: 'En attente OPCO',
  valide_opco: 'Validé par OPCO',
  refuse_opco: 'Refusé par OPCO',
  mise_en_paiement: 'En mise en paiement',
  paye: 'Payé',
}

export const OPCO_WORKFLOW_COLORS: Record<OpcoWorkflowStatus, string> = {
  a_constituer: 'bg-surface-100 text-surface-700',
  pret_a_envoyer: 'bg-amber-100 text-amber-700',
  envoye_opco: 'bg-brand-100 text-brand-700',
  en_attente_opco: 'bg-amber-100 text-amber-700',
  valide_opco: 'bg-emerald-100 text-emerald-700',
  refuse_opco: 'bg-red-100 text-red-700',
  mise_en_paiement: 'bg-purple-100 text-purple-700',
  paye: 'bg-emerald-100 text-emerald-800 font-semibold',
}
