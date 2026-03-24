// ============================================================
// Types Module 7 — QCM & Évaluations
// ============================================================

import type { BadgeVariant } from '@/lib/types'

export type QCMType = 'positionnement' | 'entree' | 'sortie' | 'satisfaction_chaud' | 'satisfaction_froid'
export type QuestionType = 'choix_unique' | 'choix_multiple' | 'vrai_faux' | 'note_1_5' | 'note_1_10' | 'texte_libre' | 'nps'
export type EvaluationStatus = 'brouillon' | 'publie' | 'en_cours' | 'termine' | 'archive'

export interface QCM {
  id: string
  organization_id: string
  formation_id: string | null
  titre: string
  description: string | null
  type: QCMType
  duree_minutes: number | null
  score_min_reussite: number | null
  questions_aleatoires: boolean
  afficher_resultats: boolean
  status: EvaluationStatus
  is_template: boolean
  version: number
  created_at: string
  updated_at: string
  formation?: { intitule: string; reference: string | null }
  questions?: QCMQuestion[]
  _reponses_count?: number
}

export interface QCMQuestion {
  id: string
  qcm_id: string
  texte: string
  type: QuestionType
  explication: string | null
  points: number
  is_required: boolean
  position: number
  section: string | null
  choix?: QCMChoix[]
}

export interface QCMChoix {
  id: string
  question_id: string
  texte: string
  est_correct: boolean
  position: number
}

export interface QCMReponse {
  id: string
  organization_id: string
  qcm_id: string
  session_id: string | null
  apprenant_id: string
  token: string
  score: number | null
  score_points: number | null
  score_total: number | null
  is_reussi: boolean | null
  started_at: string | null
  completed_at: string | null
  duree_secondes: number | null
  is_complete: boolean
  created_at: string
  apprenant?: { prenom: string; nom: string; email: string | null }
  qcm?: { titre: string; type: QCMType }
  details?: QCMReponseDetail[]
}

export interface QCMReponseDetail {
  id: string
  reponse_id: string
  question_id: string
  choix_ids: string[] | null
  texte_libre: string | null
  note_valeur: number | null
  est_correct: boolean | null
  points_obtenus: number
}

export interface EvaluationSatisfaction {
  id: string
  organization_id: string
  session_id: string
  formation_id: string | null
  type: QCMType
  nombre_reponses: number
  nombre_invites: number
  taux_reponse: number
  note_moyenne: number
  nps_score: number | null
  note_contenu: number | null
  note_formateur: number | null
  note_organisation: number | null
  note_supports: number | null
  note_applicabilite: number | null
  points_forts: string[]
  axes_amelioration: string[]
  created_at: string
}

// ---- Labels ----

export const QCM_TYPE_LABELS: Record<QCMType, string> = {
  positionnement: 'Positionnement',
  entree: 'Évaluation d\'entrée',
  sortie: 'Évaluation de sortie',
  satisfaction_chaud: 'Satisfaction à chaud',
  satisfaction_froid: 'Satisfaction à froid',
}

export const QCM_TYPE_COLORS: Record<QCMType, BadgeVariant> = {
  positionnement: 'info',
  entree: 'warning',
  sortie: 'success',
  satisfaction_chaud: 'danger',
  satisfaction_froid: 'default',
}

export const QCM_TYPE_QUALIOPI: Record<QCMType, string> = {
  positionnement: 'C2 · Indicateur 17',
  entree: 'C5 · Diagnostique',
  sortie: 'C5 · Indicateur 18',
  satisfaction_chaud: 'C7 · Indicateur 30',
  satisfaction_froid: 'C7 · Indicateur 31',
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choix_unique: 'Choix unique',
  choix_multiple: 'Choix multiple',
  vrai_faux: 'Vrai / Faux',
  note_1_5: 'Note (1 à 5)',
  note_1_10: 'Note (1 à 10)',
  texte_libre: 'Texte libre',
  nps: 'NPS (0 à 10)',
}

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  brouillon: 'Brouillon',
  publie: 'Publié',
  en_cours: 'En cours',
  termine: 'Terminé',
  archive: 'Archivé',
}

export const EVALUATION_STATUS_COLORS: Record<EvaluationStatus, BadgeVariant> = {
  brouillon: 'default',
  publie: 'info',
  en_cours: 'warning',
  termine: 'success',
  archive: 'default',
}
