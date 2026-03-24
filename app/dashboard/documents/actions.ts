'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createDocumentAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const nom = formData.get('nom') as string
  const type = formData.get('type') as string
  const requires_signature = formData.get('requires_signature') === 'true'

  if (!nom) return { success: false, error: 'Nom requis' }

  const { data, error } = await supabase.from('documents').insert({
    organization_id: session.organization.id,
    nom,
    type: type || 'autre',
    description: (formData.get('description') as string) || null,
    client_id: (formData.get('client_id') as string) || null,
    session_id: (formData.get('session_id') as string) || null,
    dossier_id: (formData.get('dossier_id') as string) || null,
    requires_signature,
    created_by: session.user.id,
  }).select().single()

  if (error) return { success: false, error: 'Erreur' }

  await logAudit({ action: 'create', entity_type: 'document', entity_id: data.id })
  revalidatePath('/dashboard/documents')
  return { success: true, data }
}

export async function requestSignatureAction(documentId: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const nom = formData.get('signataire_nom') as string
  const email = formData.get('signataire_email') as string
  const role = formData.get('signataire_role') as string

  if (!nom || !email) return { success: false, error: 'Nom et email requis' }

  const { data, error } = await supabase.from('signatures').insert({
    organization_id: session.organization.id,
    document_id: documentId,
    signataire_nom: nom,
    signataire_email: email,
    signataire_role: role || null,
  }).select().single()

  if (error) return { success: false, error: 'Erreur' }

  // TODO: Send signature email with token

  await logAudit({ action: 'request_signature', entity_type: 'signature', entity_id: data.id })
  revalidatePath('/dashboard/documents')
  revalidatePath('/dashboard/signatures')
  return { success: true, data: { token: data.token } }
}

export async function signDocumentAction(token: string, signatureData: string): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()

  const { data: sig } = await supabase
    .from('signatures')
    .select('id, status, expire_at')
    .eq('token', token)
    .single()

  if (!sig) return { success: false, error: 'Signature introuvable' }
  if (sig.status !== 'en_attente') return { success: false, error: 'Cette signature a déjà été traitée' }
  if (sig.expire_at && new Date(sig.expire_at) < new Date()) return { success: false, error: 'Le lien de signature a expiré' }

  const { error } = await supabase
    .from('signatures')
    .update({
      status: 'signe',
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    })
    .eq('id', sig.id)

  if (error) return { success: false, error: 'Erreur' }

  revalidatePath('/dashboard/signatures')
  return { success: true }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('documents').delete().eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Erreur' }
  await logAudit({ action: 'delete', entity_type: 'document', entity_id: id })
  revalidatePath('/dashboard/documents')
  return { success: true }
}
