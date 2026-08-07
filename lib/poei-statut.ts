/**
 * Statut d'un dossier POEI, déduit de la réalité.
 *
 * Le statut était saisi à la main et mentait dès que personne ne le mettait à
 * jour (quatre dossiers sur huit étaient « en montage » sans aucun candidat).
 * On le calcule désormais à partir de faits : dépôt et accord France Travail,
 * présence de candidats, dates de la session.
 *
 * Les décisions humaines — refus, abandon, embauche — ne peuvent pas se
 * déduire : elles restent saisies et ne sont jamais écrasées.
 */
import type { PoeiStatus } from '@/lib/types/poei'

/** Statuts qui traduisent une décision et que le calcul ne touche jamais. */
export const STATUTS_MANUELS: PoeiStatus[] = ['refuse', 'abandonne', 'embauche']

export interface FaitsPoei {
  statut?: string | null
  nb_candidats: number
  date_depot_ft?: string | null
  date_accord_ft?: string | null
  session_date_debut?: string | null
  session_date_fin?: string | null
  date_debut?: string | null
  date_fin?: string | null
}

export function statutAttenduPoei(f: FaitsPoei, aujourdhui = new Date().toISOString().slice(0, 10)): PoeiStatus {
  if (f.statut && STATUTS_MANUELS.includes(f.statut as PoeiStatus)) return f.statut as PoeiStatus

  // Une formation n'a de sens qu'avec des candidats : sans personne à former,
  // des dates prévisionnelles ne font pas passer le dossier « en formation ».
  if (f.nb_candidats > 0) {
    const debut = (f.session_date_debut || f.date_debut || '').slice(0, 10)
    const fin = (f.session_date_fin || f.date_fin || debut || '').slice(0, 10)
    if (fin && fin < aujourdhui) return 'terminee'
    if (debut && debut <= aujourdhui && (!fin || fin >= aujourdhui)) return 'en_formation'
  }

  if (f.date_accord_ft) return 'accorde'
  if (f.date_depot_ft) return 'depose'
  if (f.nb_candidats > 0) return 'candidature'
  return 'montage'
}

/** Ce qui empêche le dossier d'avancer, à afficher en rouge sur la fiche. */
export function blocagesPoei(f: FaitsPoei & { duree_heures?: number | null; montant_horaire?: number | null; session_id?: string | null; client_id?: string | null }) {
  const out: string[] = []
  if (!f.client_id) out.push('Aucune entreprise rattachée')
  if (f.nb_candidats === 0) out.push('Aucun candidat')
  if (!f.session_id) out.push('Aucune session de formation planifiée')
  if (!f.duree_heures) out.push('Durée de formation non renseignée')
  if (!f.montant_horaire) out.push('Taux horaire non renseigné')
  // Le dépôt et l'accord France Travail ne sont pas saisis dans le CRM
  // (aucun dossier ne les renseigne) : les compter comme blocage rendrait
  // l'alerte permanente, donc inutile.
  return out
}
