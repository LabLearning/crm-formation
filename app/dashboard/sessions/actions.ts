'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createSessionSchema } from '@/lib/validations/formation'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createSessionSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const formErrors = parsed.error.flatten().formErrors
    return { success: false, errors: fieldErrors, error: formErrors[0] }
  }

  const supabase = await createServiceRoleClient()

  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', session.organization.id)

  const ref = parsed.data.reference || `SES-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      organization_id: session.organization.id,
      formation_id: parsed.data.formation_id,
      reference: ref,
      intitule: parsed.data.intitule || null,
      date_debut: parsed.data.date_debut,
      date_fin: parsed.data.date_fin,
      horaires: parsed.data.horaires || null,
      lieu: parsed.data.lieu || null,
      adresse: parsed.data.adresse || null,
      code_postal: parsed.data.code_postal || null,
      ville: parsed.data.ville || null,
      lien_visio: parsed.data.lien_visio || null,
      places_min: parsed.data.places_min,
      places_max: parsed.data.places_max,
      formateur_id: parsed.data.formateur_id || null,
      status: parsed.data.status || 'planifiee',
      cout_formateur: parsed.data.cout_formateur || null,
      cout_salle: parsed.data.cout_salle || null,
      cout_materiel: parsed.data.cout_materiel || null,
      notes_internes: parsed.data.notes_internes || null,
      notes_logistiques: parsed.data.notes_logistiques || null,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[Create Session]', error)
    return { success: false, error: 'Erreur lors de la création' }
  }

  await logAudit({ action: 'create', entity_type: 'session', entity_id: data.id })
  revalidatePath('/dashboard/sessions')
  return { success: true, data }
}

export async function updateSessionAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createSessionSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const formErrors = parsed.error.flatten().formErrors
    return { success: false, errors: fieldErrors, error: formErrors[0] }
  }

  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('sessions')
    .update({
      formation_id: parsed.data.formation_id,
      reference: parsed.data.reference || undefined,
      intitule: parsed.data.intitule || null,
      date_debut: parsed.data.date_debut,
      date_fin: parsed.data.date_fin,
      horaires: parsed.data.horaires || null,
      lieu: parsed.data.lieu || null,
      adresse: parsed.data.adresse || null,
      code_postal: parsed.data.code_postal || null,
      ville: parsed.data.ville || null,
      lien_visio: parsed.data.lien_visio || null,
      places_min: parsed.data.places_min,
      places_max: parsed.data.places_max,
      formateur_id: parsed.data.formateur_id || null,
      status: parsed.data.status || undefined,
      cout_formateur: parsed.data.cout_formateur || null,
      cout_salle: parsed.data.cout_salle || null,
      cout_materiel: parsed.data.cout_materiel || null,
      notes_internes: parsed.data.notes_internes || null,
      notes_logistiques: parsed.data.notes_logistiques || null,
    })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur lors de la mise à jour' }

  await logAudit({ action: 'update', entity_type: 'session', entity_id: id })
  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function updateSessionStatusAction(id: string, status: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }

  await logAudit({ action: 'update_status', entity_type: 'session', entity_id: id, details: { status } })
  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function deleteSessionAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Impossible de supprimer (inscriptions liées)' }

  await logAudit({ action: 'delete', entity_type: 'session', entity_id: id })
  revalidatePath('/dashboard/sessions')
  return { success: true }
}
