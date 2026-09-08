/**
 * Évaluation d'un formateur par le référent de l'établissement : questions,
 * résolution du référent et textes de l'email — partagés entre la page
 * publique, l'envoi réel et l'aperçu.
 *
 * (Distinct de lib/evaluation-formateur.ts, qui porte la grille interne
 * d'évaluation des compétences du formateur, indicateur 21.)
 */

export const QUESTIONS_FORMATEUR: { cle: string; label: string }[] = [
  { cle: 'note_ponctualite', label: 'Ponctualité et assiduité du formateur' },
  { cle: 'note_pedagogie', label: 'Pédagogie et clarté des explications' },
  { cle: 'note_maitrise', label: 'Maîtrise du métier et du poste enseigné' },
  { cle: 'note_relationnel', label: 'Relation avec vos équipes et avec vous' },
  { cle: 'note_adaptation', label: 'Adaptation à votre établissement et à ses contraintes' },
]

export interface Referent {
  id: string
  nom: string
  email: string
  fonction: string | null
}

/**
 * Le référent de la formation côté client : le contact marqué référent
 * formation, à défaut le signataire, à défaut le contact principal, à défaut
 * le premier contact joignable. Il faut une adresse email dans tous les cas.
 */
export async function resoudreReferent(supabase: any, clientId: string | null): Promise<Referent | null> {
  if (!clientId) return null
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, prenom, nom, email, poste, est_referent_formation, est_signataire, est_principal')
    .eq('client_id', clientId)
  const avecEmail = (contacts || []).filter((c: any) => c.email)
  const c = avecEmail.find((x: any) => x.est_referent_formation)
    || avecEmail.find((x: any) => x.est_signataire)
    || avecEmail.find((x: any) => x.est_principal)
    || avecEmail[0]
  if (!c) return null
  return {
    id: c.id,
    nom: [c.prenom, c.nom].map((s: string) => (s || '').trim()).filter(Boolean).join(' '),
    email: String(c.email).trim(),
    fonction: c.poste || null,
  }
}

export const urlEvaluationFormateur = (token: string) =>
  `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'}/appreciation/formateur/${token}`

/** Textes de l'email adressé au référent (un email par formateur). */
export function paramsEmailEvaluationFormateur(p: {
  referentNom: string
  formateurNom: string
  formationIntitule: string | null
  etablissement: string | null
  periode: string | null
  url: string
}) {
  const formation = p.formationIntitule ? ` « ${p.formationIntitule} »` : ''
  const chez = p.etablissement ? ` chez ${p.etablissement}` : ''
  const quand = p.periode ? ` (${p.periode})` : ''
  return {
    recipientName: p.referentNom || 'Madame, Monsieur',
    subject: `Votre avis sur ${p.formateurNom}, formateur intervenu${chez}`,
    docTitle: `Évaluation du formateur ${p.formateurNom}`,
    intro: `${p.formateurNom} est intervenu${chez} pour la formation${formation}${quand}. En tant que référent de la formation, votre regard sur sa prestation nous est précieux : cinq questions rapides, deux minutes, et vos remarques libres. Vos réponses alimentent notre démarche qualité et le suivi de nos formateurs.`,
    ctaLabel: 'Évaluer le formateur',
    ctaUrl: p.url,
    footerNote: 'Lien personnel, à ne pas transmettre. Vos réponses sont traitées par Lab Learning dans le cadre de sa certification Qualiopi.',
  }
}
