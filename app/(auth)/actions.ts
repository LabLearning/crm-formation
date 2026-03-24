'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/validations/auth'
import type { ActionResult } from '@/lib/types'

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { success: false, error: 'Email ou mot de passe incorrect' }
  }

  // Update last_login_at
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  redirect('/dashboard')
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    organization_name: formData.get('organization_name') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        organization_name: parsed.data.organization_name,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: 'Un compte existe déjà avec cet email' }
    }
    return { success: false, error: 'Erreur lors de la création du compte' }
  }

  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
