'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import { sendTemplateEmail } from '@/lib/email'
import type { ActionResult } from '@/lib/types'

export async function generatePortalTokenAction(
  type: 'apprenant' | 'formateur' | 'client' | 'apporteur',
  targetId: string,
  email: string
): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Check if token already exists
  const field = type === 'apprenant' ? 'apprenant_id' : type === 'formateur' ? 'formateur_id' : type === 'apporteur' ? 'apporteur_id' : 'email'
  const matchValue = (type === 'client') ? email : targetId

  const query = supabase
    .from('portal_access_tokens')
    .select('id, token')
    .eq('organization_id', session.organization.id)
    .eq('type', type)
    .eq('is_active', true)

  if (type === 'client') {
    query.eq('email', email)
  } else {
    query.eq(field, targetId)
  }

  const { data: existing } = await query.single()

  if (existing) {
    return { success: true, data: { token: existing.token, existing: true } }
  }

  const insertData: Record<string, unknown> = {
    organization_id: session.organization.id,
    type,
    email,
    created_by: session.user.id,
  }
  if (type === 'apprenant') insertData.apprenant_id = targetId
  else if (type === 'formateur') insertData.formateur_id = targetId
  // For client and apporteur, we use email to find them via portal-auth.ts

  const { data, error } = await supabase
    .from('portal_access_tokens')
    .insert(insertData)
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur lors de la generation du token' }

  await logAudit({
    action: 'generate_portal_token',
    entity_type: type,
    entity_id: targetId || email,
  })

  return { success: true, data: { token: data.token, existing: false } }
}

export async function revokePortalTokenAction(tokenId: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('portal_access_tokens')
    .update({ is_active: false })
    .eq('id', tokenId)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }

  revalidatePath('/dashboard/apprenants')
  revalidatePath('/dashboard/formateurs')
  return { success: true }
}

export async function getPortalTokensAction(type: 'apprenant' | 'formateur' | 'client' | 'apporteur') {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data } = await supabase
    .from('portal_access_tokens')
    .select('*, apprenant:apprenants(prenom, nom, email), formateur:formateurs(prenom, nom, email)')
    .eq('organization_id', session.organization.id)
    .eq('type', type)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return data || []
}
