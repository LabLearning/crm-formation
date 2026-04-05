'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { inviteUserSchema, updateUserSchema } from '@/lib/validations/auth'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import { sendInvitationEmail } from '@/lib/email'
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

  // Generate invite link via Supabase Auth (without sending its default email)
  const serviceClient = await createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm-formation-five.vercel.app'

  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'invite',
    email: parsed.data.email,
    options: {
      data: { invitation_token: invitation.token },
      redirectTo: `${appUrl}/dashboard`,
    },
  })

  if (linkError) {
    console.error('[Invite Link Error]', linkError)
  }

  // Send branded invitation email — fix localhost URLs from Supabase config
  let inviteUrl = linkData?.properties?.action_link || `${appUrl}/login`
  if (inviteUrl.includes('localhost')) {
    inviteUrl = inviteUrl.replace(/http:\/\/localhost:\d+/g, appUrl)
  }
  const inviterName = `${session.user.first_name} ${session.user.last_name}`.trim() || session.user.email

  await sendInvitationEmail({
    toEmail: parsed.data.email,
    role: parsed.data.role,
    orgName: session.organization.name,
    orgEmail: 'noreply@lab-learning.fr',
    invitedByName: inviterName,
    inviteUrl,
  })

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

export async function startImpersonationAction(targetUserId: string): Promise<ActionResult> {
  const session = await getSession()

  if (session.user.role !== 'super_admin') {
    return { success: false, error: 'Accès non autorisé' }
  }

  const supabase = await createServiceRoleClient()

  const { data: targetUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', targetUserId)
    .eq('organization_id', session.organization.id)
    .single()

  if (!targetUser) {
    return { success: false, error: 'Utilisateur introuvable' }
  }

  if (targetUser.role === 'super_admin') {
    return { success: false, error: 'Impossible d\'accéder au compte d\'un Super Admin' }
  }

  const cookieStore = cookies()
  ;(cookieStore as any).set('ll_impersonate', targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  await logAudit({
    action: 'start_impersonation',
    entity_type: 'user',
    entity_id: targetUserId,
    details: { impersonated_by: session.user.id },
  })

  return { success: true }
}

export async function stopImpersonationAction(): Promise<ActionResult> {
  const cookieStore = cookies()
  ;(cookieStore as any).delete('ll_impersonate')
  return { success: true }
}
