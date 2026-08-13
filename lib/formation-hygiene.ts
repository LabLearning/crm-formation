/**
 * Une formation relève-t-elle de l'hygiène alimentaire réglementaire ?
 *
 * Ces formations doivent donner lieu, en plus des documents de clôture
 * habituels, à l'attestation de l'arrêté du 12 février 2024 — celle que
 * l'établissement présente lors d'un contrôle de la DDPP.
 *
 * La catégorie du catalogue fait foi quand elle est renseignée ; elle ne l'est
 * pas partout, d'où la lecture de l'intitulé en second recours. Mieux vaut
 * proposer l'attestation sur une session qui n'en relève pas — un gestionnaire
 * le verra — que de l'oublier sur une session qui en relève.
 */
export function estFormationHygiene(formation?: {
  categorie?: string | null
  intitule?: string | null
} | null): boolean {
  if (!formation) return false
  const sansAccent = (v?: string | null) =>
    String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  if (sansAccent(formation.categorie) === 'hygiene') return true
  const t = sansAccent(formation.intitule)
  return /hygiene alimentaire|haccp|plan de maitrise sanitaire/.test(t)
}
