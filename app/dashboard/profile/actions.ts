'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const first_name = (formData.get('first_name') as string)?.trim()
  const last_name = (formData.get('last_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!first_name || first_name.length < 2) {
    return { success: false, error: 'Le prénom doit contenir au moins 2 caractères' }
  }
  if (!last_name || last_name.length < 2) {
    return { success: false, error: 'Le nom doit contenir au moins 2 caractères' }
  }

  const { error } = await supabase
    .from('users')
    .update({ first_name, last_name, phone: phone || null })
    .eq('id', session.user.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour du profil' }
  }

  await logAudit({
    action: 'update_profile',
    entity_type: 'user',
    entity_id: session.user.id,
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
