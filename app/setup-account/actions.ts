'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

export async function setupAccountAction(formData: FormData): Promise<ActionResult> {
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const token = formData.get('token') as string
  const uid = formData.get('uid') as string

  if (!firstName || !lastName) {
    return { success: false, error: 'Veuillez renseigner votre prenom et nom' }
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caracteres' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Les mots de passe ne correspondent pas' }
  }

  if (!token || !uid) {
    return { success: false, error: 'Lien d\'invitation invalide' }
  }

  const supabase = await createServiceRoleClient()

  // Verify invitation token against our table
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (!invitation) {
    return { success: false, error: 'Invitation invalide ou deja utilisee' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'Cette invitation a expire. Demandez un nouveau lien.' }
  }

  // Update password + confirm email in Supabase Auth
  const { error: authError } = await supabase.auth.admin.updateUserById(uid, {
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  if (authError) {
    return { success: false, error: authError.message }
  }

  // Update user profile in users table
  await supabase
    .from('users')
    .update({
      first_name: firstName,
      last_name: lastName,
      status: 'active',
    })
    .eq('id', uid)

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { success: true }
}
