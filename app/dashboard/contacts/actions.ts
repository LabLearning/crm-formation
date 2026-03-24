'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createContactSchema } from '@/lib/validations/crm'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createContactAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createContactSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: session.organization.id,
      client_id: parsed.data.client_id || null,
      civilite: parsed.data.civilite || null,
      prenom: parsed.data.prenom,
      nom: parsed.data.nom,
      email: parsed.data.email || null,
      telephone: parsed.data.telephone || null,
      mobile: parsed.data.mobile || null,
      poste: parsed.data.poste || null,
      service: parsed.data.service || null,
      est_principal: parsed.data.est_principal || false,
      est_signataire: parsed.data.est_signataire || false,
      est_referent_formation: parsed.data.est_referent_formation || false,
      notes: parsed.data.notes || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur lors de la création' }

  await logAudit({ action: 'create', entity_type: 'contact', entity_id: data.id })
  revalidatePath('/dashboard/contacts')
  return { success: true, data }
}

export async function updateContactAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createContactSchema.safeParse(raw)
  if (!parsed.success) return { success: false, errors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase
    .from('contacts')
    .update({
      client_id: parsed.data.client_id || null,
      civilite: parsed.data.civilite || null,
      prenom: parsed.data.prenom,
      nom: parsed.data.nom,
      email: parsed.data.email || null,
      telephone: parsed.data.telephone || null,
      mobile: parsed.data.mobile || null,
      poste: parsed.data.poste || null,
      service: parsed.data.service || null,
      est_principal: parsed.data.est_principal || false,
      est_signataire: parsed.data.est_signataire || false,
      est_referent_formation: parsed.data.est_referent_formation || false,
      notes: parsed.data.notes || null,
    })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur lors de la mise à jour' }

  await logAudit({ action: 'update', entity_type: 'contact', entity_id: id })
  revalidatePath('/dashboard/contacts')
  return { success: true }
}

export async function deleteContactAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur lors de la suppression' }

  await logAudit({ action: 'delete', entity_type: 'contact', entity_id: id })
  revalidatePath('/dashboard/contacts')
  return { success: true }
}
