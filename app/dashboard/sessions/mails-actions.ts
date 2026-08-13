'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'
import { sendDocumentToApprenantAction, envoyerDocumentSessionAction } from './actions'

export type MailApprenantType = 'convocation' | 'attestation' | 'certificat' | 'hygiene'

/**
 * Envoie — ou prévisualise — un courriel de session à un apprenant.
 *
 * C'est le point d'entrée unique de la matrice de l'onglet Mails : une ligne
 * par type de courriel, une colonne par stagiaire, chaque case s'envoie après
 * aperçu. Les documents de clôture délèguent à l'action existante ; la
 * convocation, jusqu'ici réservée au cron J-3, devient envoyable à la main —
 * un stagiaire inscrit la veille ne peut pas attendre un cron déjà passé.
 */
export async function envoyerMailApprenantAction(
  sessionId: string,
  apprenantId: string,
  type: MailApprenantType,
  opts?: { preview?: boolean },
): Promise<ActionResult<{ html?: string; subject?: string; email?: string | null }>> {
  if (type !== 'convocation') {
    return sendDocumentToApprenantAction(sessionId, apprenantId, type, opts)
  }

  const session = await getSession()
  if (session.user.role === 'formateur') {
    return { success: false, error: 'Action réservée aux gestionnaires' }
  }
  const supabase = await createServiceRoleClient()

  const [{ data: apprenant }, { data: sess }] = await Promise.all([
    supabase.from('apprenants').select('*').eq('id', apprenantId).maybeSingle(),
    supabase.from('sessions')
      .select('*, formateur:formateurs(prenom, nom, email, telephone)')
      .eq('id', sessionId).eq('organization_id', session.organization.id).maybeSingle(),
  ])
  if (!apprenant) return { success: false, error: 'Apprenant introuvable' }
  if ((apprenant as any).organization_id !== session.organization.id) {
    return { success: false, error: 'Apprenant hors organisation' }
  }
  if (!sess) return { success: false, error: 'Session introuvable' }

  const [{ data: formation }, { data: org }] = await Promise.all([
    supabase.from('formations').select('*').eq('id', (sess as any).formation_id).maybeSingle(),
    supabase.from('organizations').select('*').eq('id', session.organization.id).single(),
  ])

  // Mêmes textes que la convocation automatique du cron J-3 : le stagiaire ne
  // doit pas recevoir deux formes différentes selon qui a déclenché l'envoi.
  const formationNom = (formation as any)?.intitule || (sess as any).intitule || 'Formation'
  const fmtLong = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateStr = new Date((sess as any).date_debut).toLocaleDateString('fr-FR')
  const dateDebutLong = fmtLong((sess as any).date_debut)
  const dateFinLong = fmtLong((sess as any).date_fin || (sess as any).date_debut)
  const lieuStr = (sess as any).lieu || 'le lieu indiqué dans votre convocation'
  const sujet = `Convocation — ${formationNom} (${dateStr})`
  const intro = `Nous avons le plaisir de vous convoquer à la session de formation suivante. Vous trouverez votre convocation détaillée en pièce jointe.`
  const meta: Array<[string, string]> = [
    ['Formation', formationNom],
    ['Début', dateDebutLong],
    ['Fin', dateFinLong],
    ['Lieu', lieuStr],
  ]
  const destinataire = [
    (apprenant as any).civilite, (apprenant as any).prenom, (apprenant as any).nom,
  ].filter(Boolean).join(' ').trim() || 'Madame, Monsieur'

  if (opts?.preview) {
    const { buildDocumentEmailHtml } = await import('@/lib/email')
    const html = buildDocumentEmailHtml({
      orgName: (org as any)?.name || 'Lab Learning',
      orgEmail: (org as any)?.email_contact || (org as any)?.email,
      orgLogoUrl: (org as any)?.logo_url,
      qualiopiCertified: (org as any)?.is_qualiopi !== false,
      recipientName: destinataire,
      docTitle: 'Convocation à votre formation',
      intro,
      metadata: meta,
      pdfFilename: `convocation-${(apprenant as any).nom || 'stagiaire'}.pdf`,
      footerNote: "Merci de vous présenter 15 minutes avant le début de la session avec une pièce d'identité.",
    })
    return { success: true, data: { html, subject: sujet, email: (apprenant as any).email } }
  }

  if (!(apprenant as any).email) return { success: false, error: "Cet apprenant n'a pas d'adresse email" }

  try {
    const { createElement } = await import('react')
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { ConvocationPDF } = await import('@/lib/pdf/convocation-pdf')
    const { withDocumentLogo } = await import('@/lib/pdf/org-logo')
    const orgDoc = await withDocumentLogo(supabase, org)
    const buffer = await renderToBuffer(createElement(ConvocationPDF, {
      apprenant, session: sess, formation, org: orgDoc, formateur: (sess as any).formateur,
    }) as any)

    const { sendDocumentEmail } = await import('@/lib/email')
    const r = await sendDocumentEmail({
      to: (apprenant as any).email,
      orgName: (org as any)?.name || 'Lab Learning',
      orgEmail: (org as any)?.email_contact || (org as any)?.email,
      orgLogoUrl: (org as any)?.logo_url,
      qualiopiCertified: (org as any)?.is_qualiopi !== false,
      recipientName: destinataire,
      subject: sujet,
      docTitle: 'Convocation à votre formation',
      intro,
      metadata: meta,
      pdfBuffer: Buffer.from(buffer),
      pdfFilename: `convocation-${(apprenant as any).nom || 'stagiaire'}.pdf`,
      footerNote: "Merci de vous présenter 15 minutes avant le début de la session avec une pièce d'identité.",
      organizationId: session.organization.id,
      entityType: 'session',
      entityId: sessionId,
      triggeredBy: session.user.id,
    })
    if (!r.success) return { success: false, error: r.error || "L'envoi a échoué" }
  } catch (e) {
    console.error('[convocation apprenant]', e)
    return { success: false, error: 'Erreur de génération de la convocation' }
  }

  await logAudit({ action: 'send_convocation', entity_type: 'apprenant', entity_id: apprenantId })
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  return { success: true, data: { email: (apprenant as any).email } }
}

/**
 * Le même envoi, pour tous les stagiaires de la session d'un coup.
 */
export async function envoyerMailATousAction(
  sessionId: string,
  type: MailApprenantType,
): Promise<ActionResult<{ envoyes: number; sansEmail: number; echecs: number }>> {
  if (type !== 'convocation') return envoyerDocumentSessionAction(sessionId, type)

  const session = await getSession()
  if (session.user.role === 'formateur') {
    return { success: false, error: 'Action réservée aux gestionnaires' }
  }
  const supabase = await createServiceRoleClient()
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('apprenant_id, apprenant:apprenants(email)')
    .eq('session_id', sessionId)
    .not('status', 'in', '("annule","abandonne")')

  const cibles = (inscriptions || []).filter((i: any) => i.apprenant_id)
  if (cibles.length === 0) return { success: false, error: 'Aucun stagiaire sur cette session' }

  let envoyes = 0
  let sansEmail = 0
  let echecs = 0
  for (const i of cibles as any[]) {
    if (!i.apprenant?.email) { sansEmail++; continue }
    const r = await envoyerMailApprenantAction(sessionId, i.apprenant_id, 'convocation')
    if (r.success) envoyes++
    else echecs++
  }
  return { success: true, data: { envoyes, sansEmail, echecs } }
}
