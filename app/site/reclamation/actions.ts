'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

const ORG = 'ff747dfe-c034-44d8-98d7-e53892263fb5'
const ORIGINES = ['apprenant', 'entreprise', 'financeur', 'autre']

/**
 * Dépôt public d'une réclamation — sans compte, depuis le site.
 *
 * L'indicateur 31 du RNQ exige que les parties prenantes puissent exprimer une
 * réclamation ; un registre que seul l'administrateur peut alimenter n'y
 * répond pas. La réclamation entre dans le même registre que celles saisies en
 * interne : accusé de réception au plaignant, alerte à l'organisme, et le
 * traitement suit le circuit habituel.
 */
export async function deposerReclamationPubliqueAction(formData: FormData): Promise<ActionResult<{ numero?: string }>> {
  // Champ invisible pour les humains : rempli = robot, on accepte sans écrire.
  if (String(formData.get('entreprise_site') || '').trim() !== '') {
    return { success: true, data: {} }
  }

  const nom = String(formData.get('nom') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const telephone = String(formData.get('telephone') || '').trim()
  const origine = String(formData.get('origine') || 'autre')
  const objet = String(formData.get('objet') || '').trim()
  const description = String(formData.get('description') || '').trim()

  if (!nom || !email || !objet || !description) {
    return { success: false, error: 'Merci de renseigner votre nom, votre email, l’objet et le détail de votre réclamation.' }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { success: false, error: 'Adresse email invalide.' }
  }

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('reclamations')
    .insert({
      organization_id: ORG,
      numero: '',
      objet: objet.slice(0, 200),
      description: description.slice(0, 5000),
      origine: ORIGINES.includes(origine) ? origine : 'autre',
      priorite: 'moyenne',
      emetteur_nom: nom.slice(0, 120),
      emetteur_email: email,
      emetteur_telephone: telephone.slice(0, 30) || null,
    })
    .select('id, numero')
    .single()

  if (error) {
    console.error('[reclamation publique]', error)
    return { success: false, error: 'Une erreur est survenue. Vous pouvez nous écrire directement à contact@lab-learning.fr.' }
  }

  const { data: org } = await supabase.from('organizations').select('*').eq('id', ORG).single()

  // Accusé de réception au plaignant — tracé dans email_logs.
  try {
    const { sendDocumentEmail } = await import('@/lib/email')
    await sendDocumentEmail({
      to: email,
      orgName: org?.name || 'Lab Learning',
      orgEmail: (org as any)?.email_contact || org?.email,
      orgLogoUrl: (org as any)?.logo_url,
      qualiopiCertified: (org as any)?.is_qualiopi !== false,
      recipientName: nom,
      subject: `Accusé de réception de votre réclamation ${data.numero || ''}`,
      docTitle: 'Nous avons bien reçu votre réclamation',
      intro: `Nous accusons réception de votre réclamation et vous remercions de nous avoir fait part de votre retour. Conformément à notre engagement qualité, nous allons l'analyser et vous tenir informé(e) des suites données.`,
      metadata: [
        ['Référence', data.numero || ''],
        ['Objet', objet],
        ['Date de réception', new Date().toLocaleDateString('fr-FR')],
      ],
      footerNote: 'Vous serez recontacté(e) dans les meilleurs délais. Pour toute question, vous pouvez répondre directement à cet email.',
      organizationId: ORG,
      entityType: 'reclamation',
      entityId: (data as any).id,
    })
  } catch (e) { console.error('[accusé réclamation publique]', e) }

  // Alerte interne : une réclamation qui dort n'est pas traitée.
  try {
    const { sendDocumentEmail } = await import('@/lib/email')
    const destination = (org as any)?.email_contact || org?.email
    if (destination) {
      await sendDocumentEmail({
        to: destination,
        orgName: org?.name || 'Lab Learning',
        orgEmail: (org as any)?.email_contact || org?.email,
        orgLogoUrl: (org as any)?.logo_url,
        qualiopiCertified: (org as any)?.is_qualiopi !== false,
        recipientName: 'Équipe qualité',
        subject: `Nouvelle réclamation ${data.numero || ''} : ${objet.slice(0, 60)}`,
        docTitle: 'Une réclamation vient d’être déposée sur le site',
        intro: description.slice(0, 600),
        metadata: [
          ['Référence', data.numero || ''],
          ['Émetteur', `${nom} · ${email}${telephone ? ` · ${telephone}` : ''}`],
          ['Qualité', origine],
        ],
        ctaLabel: 'Ouvrir le registre des réclamations',
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'}/dashboard/reclamations`,
        organizationId: ORG,
        entityType: 'reclamation',
        entityId: (data as any).id,
      })
    }
  } catch (e) { console.error('[alerte réclamation publique]', e) }

  return { success: true, data: { numero: data.numero || undefined } }
}
