'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import { randomBytes, createHash } from 'crypto'
import type { ActionResult } from '@/lib/types'

/** Génère un token de signature unique pour une convention et retourne le lien public */
export async function generateSignatureLinkAction(conventionId: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: conv } = await supabase
    .from('conventions')
    .select('id, organization_id, signature_token, status')
    .eq('id', conventionId)
    .eq('organization_id', session.organization.id)
    .single()
  if (!conv) return { success: false, error: 'Convention introuvable' }

  // Si un token existe déjà, on le réutilise
  let token = conv.signature_token
  if (!token) {
    token = createHash('sha256').update(randomBytes(32)).digest('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)  // 30 jours de validité
    await supabase
      .from('conventions')
      .update({
        signature_token: token,
        signature_token_expires_at: expiresAt.toISOString(),
        status: conv.status === 'brouillon' ? 'envoyee' : conv.status,
        sent_at: conv.status === 'brouillon' ? new Date().toISOString() : undefined,
      })
      .eq('id', conventionId)
  }

  await logAudit({ action: 'generate_signature_link', entity_type: 'convention', entity_id: conventionId })
  revalidatePath('/dashboard/conventions')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'
  return { success: true, data: { url: `${appUrl}/convention/${token}/signer` } }
}

/** Action publique : enregistre la signature client (depuis la page /convention/[token]/signer) */
export async function signConventionPublicAction(
  token: string,
  data: { nom: string; signatureDataUrl: string },
  meta: { ip?: string; userAgent?: string },
): Promise<ActionResult> {
  if (!data.nom?.trim()) return { success: false, error: 'Nom requis pour la signature' }
  if (!data.signatureDataUrl?.startsWith('data:image/')) {
    return { success: false, error: 'Signature manquante' }
  }

  const supabase = await createServiceRoleClient()

  const { data: conv } = await supabase
    .from('conventions')
    .select('id, organization_id, signature_token_expires_at, status, session_id, client_id, formation_id')
    .eq('signature_token', token)
    .single()
  if (!conv) return { success: false, error: 'Lien invalide' }
  if (conv.signature_token_expires_at && new Date(conv.signature_token_expires_at) < new Date()) {
    return { success: false, error: 'Lien expiré' }
  }
  if (['signee_client', 'signee_complete'].includes(conv.status)) {
    return { success: false, error: 'Convention déjà signée' }
  }

  const now = new Date().toISOString()
  await supabase
    .from('conventions')
    .update({
      status: 'signee_client',
      signature_client_date: now,
      signature_client_nom: data.nom.trim(),
      signature_client_signature_data: data.signatureDataUrl,
      signature_client_ip: meta.ip || null,
      signature_client_user_agent: meta.userAgent || null,
      // À la signature client → la demande AKTO peut être envoyée
      akto_dossier_status: conv.client_id ? 'pret_a_envoyer' : 'non_envoye',
    })
    .eq('id', conv.id)

  // Si la convention est liée à une session → bascule en 'validee' si contrat formateur OK
  if (conv.session_id) {
    const { maybeValidateSession } = await import('@/app/dashboard/sessions/confirm-actions')
    await maybeValidateSession(supabase, conv.session_id, conv.organization_id)
  }

  // Notifier le créateur de la convention
  const { createNotification } = await import('@/lib/email')
  const { data: createdBy } = await supabase
    .from('conventions').select('created_by').eq('id', conv.id).single()
  if (createdBy?.created_by) {
    await createNotification({
      organizationId: conv.organization_id,
      userId: createdBy.created_by,
      titre: 'Convention signée par le client',
      message: `${data.nom.trim()} a signé la convention. Vous pouvez maintenant envoyer la demande de prise en charge AKTO.`,
      type: 'convention',
      lienUrl: `/dashboard/conventions`,
      lienLabel: 'Voir la convention',
      entityType: 'convention',
      entityId: conv.id,
    })
  }

  await logAudit({ action: 'sign_convention', entity_type: 'convention', entity_id: conv.id, details: { signataire: data.nom } })
  return { success: true, data: { conventionId: conv.id } }
}

/** Marque la demande AKTO comme envoyée et permet de saisir le numéro de dossier reçu */
export async function updateAktoStatusAction(
  conventionId: string,
  status: 'envoye' | 'accord_recu' | 'refuse',
  numero?: string,
): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const update: Record<string, unknown> = { akto_dossier_status: status }
  if (status === 'envoye') update.akto_dossier_envoye_at = new Date().toISOString()
  if (status === 'accord_recu') {
    update.akto_accord_recu_at = new Date().toISOString()
    if (numero) update.akto_dossier_numero = numero
  }

  const { error } = await supabase
    .from('conventions')
    .update(update)
    .eq('id', conventionId)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }

  await logAudit({ action: `akto_${status}`, entity_type: 'convention', entity_id: conventionId, details: { numero } })
  revalidatePath('/dashboard/conventions')
  return { success: true }
}
