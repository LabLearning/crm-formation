'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

const APP = () => process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'

/**
 * Prépare (ou réutilise) le lien de signature du certificat de réalisation
 * d'un candidat POEI. La date portée sur le certificat est TOUJOURS le dernier
 * jour de la POEI, quelle que soit la date réelle de signature.
 */
async function ensureSignature(supabase: any, orgId: string, poeiId: string, apprenantId: string, userId: string) {
  const { data: poei } = await supabase
    .from('poei').select('id, date_fin, date_debut, session_id').eq('id', poeiId).eq('organization_id', orgId).single()
  if (!poei) return { error: 'POEI introuvable' }

  const { data: appr } = await supabase
    .from('apprenants').select('id, prenom, nom, email').eq('id', apprenantId).eq('organization_id', orgId).single()
  if (!appr) return { error: 'Candidat introuvable' }

  const { data: existing } = await supabase
    .from('certificat_signatures').select('*')
    .eq('organization_id', orgId).eq('poei_id', poeiId).eq('apprenant_id', apprenantId).maybeSingle()

  const dateSignature = poei.date_fin || poei.date_debut || null
  if (existing) {
    // Réaligne la date affichée si la POEI a changé de date de fin
    if (dateSignature && existing.date_signature !== dateSignature) {
      await supabase.from('certificat_signatures').update({ date_signature: dateSignature }).eq('id', existing.id)
    }
    return { sig: { ...existing, date_signature: dateSignature }, appr, poei }
  }

  const { data: created, error } = await supabase.from('certificat_signatures').insert({
    organization_id: orgId, poei_id: poeiId, session_id: poei.session_id || null,
    apprenant_id: apprenantId, email: appr.email || null,
    date_signature: dateSignature, created_by: userId,
  }).select('*').single()
  if (error) { console.error('[certif sig]', error); return { error: 'Erreur lors de la préparation du lien' } }
  return { sig: created, appr, poei }
}

/** Envoie au candidat, par email, le lien de signature de son certificat. */
export async function sendCertificatSignatureAction(poeiId: string, apprenantId: string): Promise<ActionResult & { data?: { email: string } }> {
  const session = await getSession()
  if (['apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const r = await ensureSignature(supabase, session.organization.id, poeiId, apprenantId, session.user.id)
  if ('error' in r) return { success: false, error: r.error }
  const { sig, appr } = r as any

  if (!appr.email) return { success: false, error: 'Ce candidat n\'a pas d\'adresse email' }
  if (sig.signed_at) return { success: false, error: 'Ce certificat est déjà signé' }

  const { data: org } = await supabase.from('organizations').select('*').eq('id', session.organization.id).single()
  const url = `${APP()}/certificat/${sig.token}/signer`

  try {
    const { sendDocumentEmail } = await import('@/lib/email')
    await sendDocumentEmail({
      to: appr.email,
      orgName: org?.name || 'Lab Learning',
      orgEmail: (org as any)?.email_contact || org?.email,
      orgLogoUrl: (org as any)?.logo_url,
      qualiopiCertified: (org as any)?.is_qualiopi !== false,
      recipientName: `${appr.prenom || ''} ${appr.nom || ''}`.trim() || 'Madame, Monsieur',
      subject: 'Signature de votre certificat de réalisation',
      docTitle: 'Votre certificat de réalisation',
      intro: "Votre formation est terminée. Merci de signer électroniquement votre certificat de réalisation en cliquant sur le bouton ci-dessous.",
      ctaLabel: 'Signer mon certificat',
      ctaUrl: url,
      footerNote: 'Lien personnel, à ne pas transmettre. Valable 60 jours.',
      organizationId: session.organization.id,
      entityType: 'certificat_signature', entityId: sig.id, triggeredBy: session.user.id,
    })
  } catch (e) {
    console.error('[certif email]', e)
    return { success: false, error: "Échec de l'envoi de l'email" }
  }

  await supabase.from('certificat_signatures').update({ sent_at: new Date().toISOString() }).eq('id', sig.id)
  await logAudit({ action: 'send_signature', entity_type: 'certificat_signature', entity_id: sig.id })
  revalidatePath(`/dashboard/poei/${poeiId}`)
  return { success: true, data: { email: appr.email } }
}

/** Envoie le lien à TOUS les candidats de la POEI qui ont un email et n'ont pas signé. */
export async function sendAllCertificatSignaturesAction(poeiId: string): Promise<ActionResult & { data?: { sent: number; skipped: number } }> {
  const session = await getSession()
  if (['apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: cands } = await supabase
    .from('poei_candidats').select('apprenant_id').eq('poei_id', poeiId).eq('organization_id', session.organization.id)
  const ids = (cands || []).map((c: any) => c.apprenant_id).filter(Boolean)
  let sent = 0, skipped = 0
  for (const id of ids) {
    const r = await sendCertificatSignatureAction(poeiId, id)
    if (r.success) sent++; else skipped++
  }
  revalidatePath(`/dashboard/poei/${poeiId}`)
  return { success: true, data: { sent, skipped } }
}

/** Génère le lien sans envoyer d'email (copier/coller manuel). */
export async function getCertificatSignatureLinkAction(poeiId: string, apprenantId: string): Promise<ActionResult & { data?: { url: string } }> {
  const session = await getSession()
  if (['apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const r = await ensureSignature(supabase, session.organization.id, poeiId, apprenantId, session.user.id)
  if ('error' in r) return { success: false, error: r.error }
  return { success: true, data: { url: `${APP()}/certificat/${(r as any).sig.token}/signer` } }
}
