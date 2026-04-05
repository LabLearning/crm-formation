'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function setupAccountAction(formData: FormData): Promise<ActionResult> {
  const firstName = (formData.get('firstName') as string)?.trim()
  const lastName = (formData.get('lastName') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!firstName || !lastName) {
    return { success: false, error: 'Veuillez renseigner votre prenom et nom' }
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caracteres' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Les mots de passe ne correspondent pas' }
  }

  // Get current user from session (set by /auth/confirm)
  const anonClient = await createServerSupabaseClient()
  const { data: { user } } = await anonClient.auth.getUser()

  if (!user) {
    return { success: false, error: 'Session expiree. Veuillez cliquer a nouveau sur le lien d\'invitation.' }
  }

  const supabase = await createServiceRoleClient()

  // Update password in Supabase Auth
  const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
    password,
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
    .eq('id', user.id)

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('email', user.email)
    .is('accepted_at', null)

  revalidatePath('/dashboard')
  return { success: true }
}
