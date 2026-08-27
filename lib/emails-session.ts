/**
 * Corrélation UNIQUE des emails d'une session avec les types de documents.
 * Toutes les vues (Mails, Dossier, Apprenants, Documents) passent par ici :
 * un changement de libellé d'objet se corrige à UN endroit au lieu de casser
 * silencieusement quatre écrans.
 */

export type TypeDocEmail =
  | 'convocation' | 'attestation' | 'certificat' | 'hygiene'
  | 'supports' | 'convention' | 'contrat_formateur' | 'evaluation' | 'autre'

export interface EnvoiEmail {
  subject: string | null
  to_email?: string | null
  sent_at?: string | null
  created_at?: string | null
  opened_at?: string | null
  status?: string | null
  entity_type?: string | null
}

/** Type de document déduit de l'objet du mail — source de vérité unique. */
export function typeDocEmail(subject: string | null | undefined, entityType?: string | null): TypeDocEmail {
  if (entityType === 'convention') return 'convention'
  if (entityType === 'contrat_formateur') return 'contrat_formateur'
  const s = (subject || '').toLowerCase()
  if (s.includes('convocation')) return 'convocation'
  if (s.includes('hygiène') || s.includes('hygiene')) return 'hygiene'
  if (s.includes('certificat')) return 'certificat'
  if (s.includes('attestation')) return 'attestation'
  if (s.includes('support')) return 'supports'
  if (s.includes('convention')) return 'convention'
  if (s.includes('contrat de prestation')) return 'contrat_formateur'
  if (s.includes('évaluation') || s.includes('satisfaction') || s.includes('questionnaire')) return 'evaluation'
  return 'autre'
}

/** Dernier envoi d'un type de document (optionnellement pour un destinataire). */
export function dernierEnvoiDoc(
  logs: EnvoiEmail[],
  type: TypeDocEmail,
  email?: string | null,
): EnvoiEmail | null {
  const cible = (email || '').toLowerCase()
  for (const l of logs) {
    if (typeDocEmail(l.subject, l.entity_type) !== type) continue
    if (cible && (l.to_email || '').toLowerCase() !== cible) continue
    return l
  }
  return null
}

/** Nombre de destinataires distincts ayant reçu ce type de document. */
export function destinatairesDoc(logs: EnvoiEmail[], type: TypeDocEmail): number {
  const vus = new Set<string>()
  for (const l of logs) {
    if (typeDocEmail(l.subject, l.entity_type) !== type) continue
    if (l.to_email) vus.add(l.to_email.toLowerCase())
  }
  return vus.size
}
