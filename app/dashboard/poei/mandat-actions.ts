'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

const APP = () => process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'

/**
 * Envoie au gérant de l'entreprise le lien de signature du mandat POEI
 * (expérimentation France Travail : l'OF fait les démarches de la demande
 * d'aide au nom de l'entreprise).
 *
 * La date portée sur le mandat est figée au premier envoi (date d'émission) ;
 * un renvoi ne la change pas. L'envoi est tracé dans email_logs.
 */
export async function envoyerMandatAction(
  poeiId: string,
  opts?: { preview?: boolean },
): Promise<ActionResult<{ email?: string; html?: string; subject?: string }>> {
  const session = await getSession()
  if (['apprenant', 'formateur'].includes(session.user.role)) {
    return { success: false, error: 'Accès non autorisé' }
  }
  const supabase = await createServiceRoleClient()

  const { data: poei } = await supabase.from('poei')
    .select('id, numero, date_debut, date_fin, client_id, formation:formation_id(intitule), client:client_id(raison_sociale, nom_commercial)')
    .eq('id', poeiId).eq('organization_id', session.organization.id).single()
  if (!poei) return { success: false, error: 'POEI introuvable' }
  if (!(poei as any).client_id) return { success: false, error: 'Aucune entreprise rattachée au projet' }

  // Le gérant = contact référent de la fiche client, source unique.
  const { data: contacts } = await supabase.from('contacts')
    .select('prenom, nom, email, est_signataire, est_principal').eq('client_id', (poei as any).client_id)
  const ref = (contacts || []).find((c: any) => c.est_signataire && c.email)
    || (contacts || []).find((c: any) => c.est_principal && c.email)
    || (contacts || []).find((c: any) => c.email)
  if (!ref?.email) {
    return { success: false, error: "Aucun contact référent avec email sur l'entreprise : ajoutez-le sur la fiche client" }
  }
  const gerantNom = [ref.prenom, ref.nom].filter(Boolean).join(' ').trim()

  const { data: existing } = await supabase.from('poei_mandats').select('*')
    .eq('organization_id', session.organization.id).eq('poei_id', poeiId).maybeSingle()
  if (existing?.signed_at) return { success: false, error: 'Le mandat est déjà signé' }

  let mandat = existing
  if (!mandat) {
    const { data: created, error } = await supabase.from('poei_mandats').insert({
      organization_id: session.organization.id,
      poei_id: poeiId,
      email: ref.email,
      created_by: session.user.id,
    }).select('*').single()
    if (error) {
      console.error('[mandat poei]', error)
      return { success: false, error: 'Erreur lors de la préparation du lien (migration 135 appliquée ?)' }
    }
    mandat = created
  } else if (existing.email !== ref.email) {
    await supabase.from('poei_mandats').update({ email: ref.email }).eq('id', existing.id)
  }

  const { data: org } = await supabase.from('organizations').select('*').eq('id', session.organization.id).single()
  const clientNom = (poei as any).client?.nom_commercial || (poei as any).client?.raison_sociale || 'votre établissement'
  const formationNom = (poei as any).formation?.intitule || 'la formation'
  const url = `${APP()}/mandat/${mandat.token}/signer`

  // Mêmes textes pour l'aperçu et l'envoi réel.
  const emailParams = {
    orgName: (org as any)?.name || 'Lab Learning',
    orgEmail: (org as any)?.email_contact || (org as any)?.email,
    orgLogoUrl: (org as any)?.logo_url,
    qualiopiCertified: (org as any)?.is_qualiopi !== false,
    recipientName: gerantNom || 'Madame, Monsieur',
    subject: `Signature du mandat POEI — ${(poei as any).numero || clientNom}`,
    docTitle: 'Mandat POEI',
    intro: `Pour lancer la POEI « ${formationNom} » de ${clientNom}, France Travail demande un mandat signé du gérant : il autorise ${(org as any)?.name || 'Lab Learning'} à réaliser en votre nom les démarches de la demande d'aide (dépôt d'offre, demande en ligne, validation, bilan) — à titre gratuit. Vous pouvez lire le mandat complet puis le signer en deux minutes depuis le lien ci-dessous.`,
    ctaLabel: 'Lire et signer le mandat',
    ctaUrl: url,
    footerNote: 'Lien personnel, à ne pas transmettre. Valable 60 jours.',
  }

  if (opts?.preview) {
    const { buildDocumentEmailHtml } = await import('@/lib/email')
    return { success: true, data: { email: ref.email, html: buildDocumentEmailHtml(emailParams), subject: emailParams.subject } }
  }

  const { sendDocumentEmail } = await import('@/lib/email')
  const r = await sendDocumentEmail({
    ...emailParams,
    to: ref.email,
    organizationId: session.organization.id,
    entityType: 'poei',
    entityId: poeiId,
    triggeredBy: session.user.id,
  })
  if (!r.success) return { success: false, error: r.error || "L'envoi a échoué" }

  await supabase.from('poei_mandats').update({ sent_at: new Date().toISOString() }).eq('id', mandat.id)
  await logAudit({ action: 'send_mandat_poei', entity_type: 'poei', entity_id: poeiId, details: { email: ref.email } })
  revalidatePath(`/dashboard/poei/${poeiId}`)
  return { success: true, data: { email: ref.email } }
}
