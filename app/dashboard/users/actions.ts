'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { inviteUserSchema, updateUserSchema } from '@/lib/validations/auth'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()

  if (!['super_admin', 'gestionnaire'].includes(session.user.role)) {
    return { success: false, error: 'Accès non autorisé' }
  }

  const raw = {
    email: formData.get('email') as string,
    role: formData.get('role') as string,
  }

  const parsed = inviteUserSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()

  // Check if user already exists in organization
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', session.organization.id)
    .eq('email', parsed.data.email)
    .single()

  if (existingUser) {
    return { success: false, error: 'Cet utilisateur fait déjà partie de l\'organisme' }
  }

  // Check existing invitation
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('organization_id', session.organization.id)
    .eq('email', parsed.data.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return { success: false, error: 'Une invitation est déjà en cours pour cet email' }
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: session.organization.id,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: session.user.id,
    })
    .select()
    .single()

  if (inviteError) {
    return { success: false, error: 'Erreur lors de la création de l\'invitation' }
  }

  // Invite via Supabase Auth (sends magic link)
  const serviceClient = await createServiceRoleClient()
  const { error: authError } = await serviceClient.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      first_name: '',
      last_name: '',
      invitation_token: invitation.token,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  })

  if (authError) {
    // Even if email fails, invitation is created — user can register manually
    console.error('[Invite Auth Error]', authError)
  }

  await logAudit({
    action: 'invite',
    entity_type: 'user',
    entity_id: invitation.id,
    details: { email: parsed.data.email, role: parsed.data.role },
  })

  revalidatePath('/dashboard/users')
  return { success: true, data: { email: parsed.data.email } }
}

export async function updateUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  const session = await getSession()

  if (session.user.role !== 'super_admin') {
    return { success: false, error: 'Seul le Super Admin peut modifier les rôles' }
  }

  if (userId === session.user.id) {
    return { success: false, error: 'Vous ne pouvez pas modifier votre propre rôle' }
  }

  const parsed = updateUserSchema.safeParse({ role })
  if (!parsed.success) {
    return { success: false, error: 'Rôle invalide' }
  }

  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('users')
    .update({ role: parsed.data.role })
    .eq('id', userId)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour du rôle' }
  }

  await logAudit({
    action: 'update_role',
    entity_type: 'user',
    entity_id: userId,
    details: { new_role: role },
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function toggleUserStatusAction(userId: string, newStatus: 'active' | 'suspended'): Promise<ActionResult> {
  const session = await getSession()

  if (!['super_admin', 'gestionnaire'].includes(session.user.role)) {
    return { success: false, error: 'Accès non autorisé' }
  }

  if (userId === session.user.id) {
    return { success: false, error: 'Vous ne pouvez pas modifier votre propre statut' }
  }

  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('users')
    .update({ status: newStatus })
    .eq('id', userId)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  await logAudit({
    action: newStatus === 'suspended' ? 'suspend_user' : 'activate_user',
    entity_type: 'user',
    entity_id: userId,
  })

  revalidatePath('/dashboard/users')
  return { success: true }
}
