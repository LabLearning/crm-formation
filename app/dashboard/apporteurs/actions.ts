'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createApporteurSchema } from '@/lib/validations/crm'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createApporteurAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createApporteurSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('apporteurs_affaires')
    .insert({
      organization_id: session.organization.id,
      type: parsed.data.type,
      raison_sociale: parsed.data.raison_sociale || null,
      siret: parsed.data.siret || null,
      nom: parsed.data.nom,
      prenom: parsed.data.prenom || null,
      email: parsed.data.email || null,
      telephone: parsed.data.telephone || null,
      adresse: parsed.data.adresse || null,
      code_postal: parsed.data.code_postal || null,
      ville: parsed.data.ville || null,
      taux_commission: parsed.data.taux_commission,
      commission_fixe: parsed.data.commission_fixe || null,
      mode_calcul: parsed.data.mode_calcul,
      conditions: parsed.data.conditions || null,
      date_debut_contrat: parsed.data.date_debut_contrat || null,
      date_fin_contrat: parsed.data.date_fin_contrat || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur lors de la création' }

  await logAudit({ action: 'create', entity_type: 'apporteur', entity_id: data.id })
  revalidatePath('/dashboard/apporteurs')
  return { success: true, data }
}

export async function updateApporteurAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createApporteurSchema.safeParse(raw)
  if (!parsed.success) return { success: false, errors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase
    .from('apporteurs_affaires')
    .update({
      type: parsed.data.type,
      raison_sociale: parsed.data.raison_sociale || null,
      siret: parsed.data.siret || null,
      nom: parsed.data.nom,
      prenom: parsed.data.prenom || null,
      email: parsed.data.email || null,
      telephone: parsed.data.telephone || null,
      adresse: parsed.data.adresse || null,
      code_postal: parsed.data.code_postal || null,
      ville: parsed.data.ville || null,
      taux_commission: parsed.data.taux_commission,
      commission_fixe: parsed.data.commission_fixe || null,
      mode_calcul: parsed.data.mode_calcul,
      conditions: parsed.data.conditions || null,
      date_debut_contrat: parsed.data.date_debut_contrat || null,
      date_fin_contrat: parsed.data.date_fin_contrat || null,
    })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur lors de la mise à jour' }

  await logAudit({ action: 'update', entity_type: 'apporteur', entity_id: id })
  revalidatePath('/dashboard/apporteurs')
  return { success: true }
}

export async function toggleApporteurAction(id: string, isActive: boolean): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('apporteurs_affaires')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }

  revalidatePath('/dashboard/apporteurs')
  return { success: true }
}

export async function deleteApporteurAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('apporteurs_affaires')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Impossible de supprimer (leads liés existants)' }

  await logAudit({ action: 'delete', entity_type: 'apporteur', entity_id: id })
  revalidatePath('/dashboard/apporteurs')
  return { success: true }
}
