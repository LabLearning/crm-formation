'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { updateOrganizationSchema } from '@/lib/validations/auth'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function updateOrganizationAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()

  if (session.user.role !== 'super_admin') {
    return { success: false, error: 'Accès non autorisé' }
  }

  const raw = {
    name: formData.get('name') as string,
    legal_name: formData.get('legal_name') as string || undefined,
    siret: formData.get('siret') as string || undefined,
    address: formData.get('address') as string || undefined,
    postal_code: formData.get('postal_code') as string || undefined,
    city: formData.get('city') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    email: formData.get('email') as string || undefined,
    website: formData.get('website') as string || undefined,
    numero_da: formData.get('numero_da') as string || undefined,
    is_qualiopi: formData.get('is_qualiopi') === 'true',
  }

  const parsed = updateOrganizationSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('organizations')
    .update({
      ...parsed.data,
      legal_name: parsed.data.legal_name || null,
      siret: parsed.data.siret || null,
      address: parsed.data.address || null,
      postal_code: parsed.data.postal_code || null,
      city: parsed.data.city || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      website: parsed.data.website || null,
      numero_da: parsed.data.numero_da || null,
    })
    .eq('id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  await logAudit({
    action: 'update',
    entity_type: 'organization',
    entity_id: session.organization.id,
    details: { fields: Object.keys(parsed.data) },
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}
