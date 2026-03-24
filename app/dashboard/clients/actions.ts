'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClientSchema } from '@/lib/validations/crm'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value
  }

  const parsed = createClientSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const formErrors = parsed.error.flatten().formErrors
    return {
      success: false,
      errors: fieldErrors,
      error: formErrors.length > 0 ? formErrors[0] : undefined,
    }
  }

  const supabase = await createServiceRoleClient()

  const insertData = {
    organization_id: session.organization.id,
    type: parsed.data.type,
    raison_sociale: parsed.data.raison_sociale || null,
    siret: parsed.data.siret || null,
    code_naf: parsed.data.code_naf || null,
    secteur_activite: parsed.data.secteur_activite || null,
    taille_entreprise: parsed.data.taille_entreprise || null,
    civilite: parsed.data.civilite || null,
    nom: parsed.data.nom || null,
    prenom: parsed.data.prenom || null,
    adresse: parsed.data.adresse || null,
    code_postal: parsed.data.code_postal || null,
    ville: parsed.data.ville || null,
    telephone: parsed.data.telephone || null,
    email: parsed.data.email || null,
    site_web: parsed.data.site_web || null,
    financeur_type: parsed.data.financeur_type || null,
    numero_opco: parsed.data.numero_opco || null,
    notes: parsed.data.notes || null,
    created_by: session.user.id,
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[Create Client]', error)
    return { success: false, error: 'Erreur lors de la création du client' }
  }

  await logAudit({ action: 'create', entity_type: 'client', entity_id: data.id })
  revalidatePath('/dashboard/clients')
  return { success: true, data }
}

export async function updateClientAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value
  }

  const parsed = createClientSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const formErrors = parsed.error.flatten().formErrors
    return { success: false, errors: fieldErrors, error: formErrors[0] }
  }

  const updateData = {
    type: parsed.data.type,
    raison_sociale: parsed.data.raison_sociale || null,
    siret: parsed.data.siret || null,
    code_naf: parsed.data.code_naf || null,
    secteur_activite: parsed.data.secteur_activite || null,
    taille_entreprise: parsed.data.taille_entreprise || null,
    civilite: parsed.data.civilite || null,
    nom: parsed.data.nom || null,
    prenom: parsed.data.prenom || null,
    adresse: parsed.data.adresse || null,
    code_postal: parsed.data.code_postal || null,
    ville: parsed.data.ville || null,
    telephone: parsed.data.telephone || null,
    email: parsed.data.email || null,
    site_web: parsed.data.site_web || null,
    financeur_type: parsed.data.financeur_type || null,
    numero_opco: parsed.data.numero_opco || null,
    notes: parsed.data.notes || null,
  }

  const { error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  await logAudit({ action: 'update', entity_type: 'client', entity_id: id })
  revalidatePath('/dashboard/clients')
  return { success: true }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Impossible de supprimer ce client (données liées existantes)' }
  }

  await logAudit({ action: 'delete', entity_type: 'client', entity_id: id })
  revalidatePath('/dashboard/clients')
  return { success: true }
}
