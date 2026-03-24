// ============================================================
// Types Module 5 — Devis, Conventions, Dossiers de formation
// ============================================================

import type { BadgeVariant } from '@/lib/types'

export type DevisStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire'
export type ConventionStatus = 'brouillon' | 'envoyee' | 'signee_client' | 'signee_of' | 'signee_complete' | 'annulee'
export type DossierStatus = 'en_creation' | 'devis_envoye' | 'convention_signee' | 'en_cours' | 'realise' | 'facture' | 'cloture'
export type ConventionType = 'inter_entreprise' | 'intra_entreprise' | 'individuelle'

export interface Devis {
  id: string
  organization_id: string
  numero: string
  client_id: string | null
  contact_id: string | null
  formation_id: string | null
  dossier_id: string | null
  status: DevisStatus
  date_emission: string
  date_validite: string
  date_acceptation: string | null
  montant_ht: number
  taux_tva: number
  montant_tva: number
  montant_ttc: number
  remise_pourcent: number
  remise_montant: number
  objet: string | null
  conditions_particulieres: string | null
  notes_internes: string | null
  sent_at: string | null
  relance_count: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: { raison_sociale: string | null; nom: string | null; prenom: string | null; type: string }
  contact?: { prenom: string; nom: string }
  formation?: { intitule: string; reference: string | null }
  lignes?: DevisLigne[]
}

export interface DevisLigne {
  id: string
  devis_id: string
  designation: string
  description: string | null
  formation_id: string | null
  quantite: number
  unite: string
  prix_unitaire_ht: number
  montant_ht: number
  position: number
}

export interface DossierFormation {
  id: string
  organization_id: string
  numero: string
  client_id: string
  contact_id: string | null
  formation_id: string | null
  session_id: string | null
  status: DossierStatus
  financeur_type: string | null
  financeur_nom: string | null
  numero_prise_en_charge: string | null
  montant_prise_en_charge: number | null
  date_accord_financement: string | null
  montant_total_ht: number
  montant_total_ttc: number
  date_creation: string
  date_devis: string | null
  date_convention: string | null
  date_debut_formation: string | null
  date_fin_formation: string | null
  date_facturation: string | null
  date_cloture: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: { raison_sociale: string | null; type: string }
  formation?: { intitule: string; reference: string | null }
  session?: { reference: string | null; date_debut: string; date_fin: string }
  checklist?: DossierChecklist[]
  timeline?: DossierTimeline[]
}

export interface DossierChecklist {
  id: string
  dossier_id: string
  label: string
  categorie: string
  is_required: boolean
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  document_url: string | null
  notes: string | null
}

export interface DossierTimeline {
  id: string
  dossier_id: string
  action: string
  description: string | null
  user_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user?: { first_name: string; last_name: string }
}

export interface Convention {
  id: string
  organization_id: string
  numero: string
  type: ConventionType
  dossier_id: string | null
  client_id: string
  formation_id: string
  session_id: string | null
  devis_id: string | null
  status: ConventionStatus
  objet: string | null
  nombre_stagiaires: number
  duree_heures: number | null
  lieu: string | null
  dates_formation: string | null
  montant_ht: number
  taux_tva: number
  montant_ttc: number
  financeur_type: string | null
  financeur_nom: string | null
  signature_client_date: string | null
  signature_client_nom: string | null
  signature_of_date: string | null
  date_emission: string
  notes_internes: string | null
  created_at: string
  updated_at: string
  client?: { raison_sociale: string | null }
  formation?: { intitule: string }
}

// ---- Labels ----

export const DEVIS_STATUS_LABELS: Record<DevisStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
}

export const DEVIS_STATUS_COLORS: Record<DevisStatus, BadgeVariant> = {
  brouillon: 'default',
  envoye: 'info',
  accepte: 'success',
  refuse: 'danger',
  expire: 'warning',
}

export const DOSSIER_STATUS_LABELS: Record<DossierStatus, string> = {
  en_creation: 'En création',
  devis_envoye: 'Devis envoyé',
  convention_signee: 'Convention signée',
  en_cours: 'En cours',
  realise: 'Réalisé',
  facture: 'Facturé',
  cloture: 'Clôturé',
}

export const DOSSIER_STATUS_COLORS: Record<DossierStatus, BadgeVariant> = {
  en_creation: 'default',
  devis_envoye: 'info',
  convention_signee: 'info',
  en_cours: 'warning',
  realise: 'success',
  facture: 'success',
  cloture: 'default',
}

export const CONVENTION_STATUS_LABELS: Record<ConventionStatus, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  signee_client: 'Signée client',
  signee_of: 'Signée OF',
  signee_complete: 'Signée (complète)',
  annulee: 'Annulée',
}

export const CONVENTION_STATUS_COLORS: Record<ConventionStatus, BadgeVariant> = {
  brouillon: 'default',
  envoyee: 'info',
  signee_client: 'warning',
  signee_of: 'warning',
  signee_complete: 'success',
  annulee: 'danger',
}

export const CONVENTION_TYPE_LABELS: Record<ConventionType, string> = {
  inter_entreprise: 'Inter-entreprise',
  intra_entreprise: 'Intra-entreprise',
  individuelle: 'Individuelle',
}

export const DOSSIER_WORKFLOW: DossierStatus[] = [
  'en_creation', 'devis_envoye', 'convention_signee', 'en_cours', 'realise', 'facture', 'cloture',
]
