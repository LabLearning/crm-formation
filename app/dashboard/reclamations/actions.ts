'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createReclamationAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const objet = formData.get('objet') as string
  const description = formData.get('description') as string
  const origine = formData.get('origine') as string
  const priorite = formData.get('priorite') as string
  const emetteur_nom = formData.get('emetteur_nom') as string
  const emetteur_email = formData.get('emetteur_email') as string
  const responsable_id = formData.get('responsable_id') as string

  if (!objet || !description) return { success: false, error: 'Objet et description requis' }

  const { data, error } = await supabase
    .from('reclamations')
    .insert({
      organization_id: session.organization.id,
      numero: '',
      objet,
      description,
      origine: origine || 'apprenant',
      priorite: priorite || 'moyenne',
      emetteur_nom: emetteur_nom || null,
      emetteur_email: emetteur_email || null,
      responsable_id: responsable_id || null,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur lors de la création' }

  await logAudit({ action: 'create', entity_type: 'reclamation', entity_id: data.id })
  revalidatePath('/dashboard/reclamations')
  return { success: true, data }
}

export async function updateReclamationStatusAction(id: string, status: string, details?: Record<string, string>): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const updateData: Record<string, unknown> = { status }
  if (status === 'en_analyse') updateData.date_analyse = new Date().toISOString().split('T')[0]
  if (status === 'action_corrective') {
    updateData.action_corrective = details?.action_corrective || null
    updateData.date_resolution = new Date().toISOString().split('T')[0]
  }
  if (status === 'cloturee') {
    updateData.date_cloture = new Date().toISOString().split('T')[0]
    updateData.commentaire_cloture = details?.commentaire_cloture || null
    updateData.resolution_satisfaisante = details?.resolution_satisfaisante === 'true'
  }
  if (details?.analyse_contenu) updateData.analyse_contenu = details.analyse_contenu

  const { error } = await supabase
    .from('reclamations')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }

  await logAudit({ action: 'update_status', entity_type: 'reclamation', entity_id: id, details: { status } })
  revalidatePath('/dashboard/reclamations')
  return { success: true }
}

export async function createActionAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const titre = formData.get('titre') as string
  const description = formData.get('description') as string
  const source = formData.get('source') as string
  const reclamation_id = formData.get('reclamation_id') as string
  const priorite = formData.get('priorite') as string
  const responsable_id = formData.get('responsable_id') as string
  const date_echeance = formData.get('date_echeance') as string

  if (!titre) return { success: false, error: 'Titre requis' }

  const { data, error } = await supabase
    .from('actions_amelioration')
    .insert({
      organization_id: session.organization.id,
      titre,
      description: description || null,
      source: source || 'interne',
      reclamation_id: reclamation_id || null,
      priorite: priorite || 'moyenne',
      responsable_id: responsable_id || null,
      date_echeance: date_echeance || null,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur' }

  await logAudit({ action: 'create', entity_type: 'action_amelioration', entity_id: data.id })
  revalidatePath('/dashboard/reclamations')
  return { success: true, data }
}

export async function updateActionStatusAction(id: string, status: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const updateData: Record<string, unknown> = { status }
  if (status === 'realisee') updateData.date_realisation = new Date().toISOString().split('T')[0]
  if (status === 'verifiee') updateData.date_verification = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('actions_amelioration')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }
  revalidatePath('/dashboard/reclamations')
  return { success: true }
}

export async function deleteReclamationAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('reclamations').delete().eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Erreur' }
  revalidatePath('/dashboard/reclamations')
  return { success: true }
}
