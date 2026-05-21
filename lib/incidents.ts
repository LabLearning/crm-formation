export const INCIDENT_TYPES: Record<string, string> = {
  accident: 'Accident corporel',
  comportement: 'Comportement',
  materiel: 'Matériel / équipement',
  securite: 'Sécurité',
  hygiene: 'Hygiène',
  organisation: 'Organisation',
  autre: 'Autre',
}

export const GRAVITE_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  mineur: { label: 'Mineur', bg: 'bg-surface-100', text: 'text-surface-600', dot: 'bg-surface-400' },
  modere: { label: 'Modéré', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  majeur: { label: 'Majeur', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critique: { label: 'Critique', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}

export const STATUT_META: Record<string, { label: string; bg: string; text: string }> = {
  ouvert: { label: 'Ouvert', bg: 'bg-rose-50', text: 'text-rose-700' },
  en_cours: { label: 'En cours', bg: 'bg-blue-50', text: 'text-blue-700' },
  resolu: { label: 'Résolu', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  clos: { label: 'Clos', bg: 'bg-surface-100', text: 'text-surface-600' },
}
