'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

async function uploadPhoto(supabase: any, orgId: string, formateurId: string, photoBase64: string, type: 'arrivee' | 'depart'): Promise<string | null> {
  if (!photoBase64) return null

  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const date = new Date().toISOString().split('T')[0]
  const timestamp = Date.now()
  const path = `${orgId}/${formateurId}/${date}_${type}_${timestamp}.jpg`

  const { error } = await supabase.storage
    .from('pointages')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false })

  if (error) {
    console.error('[Upload Photo]', error.message)
    return null
  }

  const { data: urlData } = supabase.storage.from('pointages').getPublicUrl(path)
  return urlData?.publicUrl || null
}

export async function pointerArriveeAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const sessionId = formData.get('session_id') as string
  const photoBase64 = formData.get('photo') as string

  if (!sessionId) {
    return { success: false, error: 'Veuillez sélectionner une session' }
  }

  // Trouver la fiche formateur
  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) {
    return { success: false, error: 'Fiche formateur introuvable' }
  }

  const today = new Date().toISOString().split('T')[0]

  // Vérifier qu'il n'y a pas déjà un pointage aujourd'hui pour cette session
  const { data: existing } = await supabase
    .from('pointages_formateur')
    .select('id')
    .eq('formateur_id', formateur.id)
    .eq('session_id', sessionId)
    .eq('date', today)
    .single()

  if (existing) {
    return { success: false, error: 'Vous avez déjà pointé votre arrivée pour cette session aujourd\'hui' }
  }

  // Upload photo
  const photoUrl = await uploadPhoto(supabase, session.organization.id, formateur.id, photoBase64, 'arrivee')

  // Créer le pointage
  const { data, error } = await supabase
    .from('pointages_formateur')
    .insert({
      organization_id: session.organization.id,
      formateur_id: formateur.id,
      session_id: sessionId,
      date: today,
      heure_arrivee: new Date().toISOString(),
      photo_arrivee_url: photoUrl,
    })
    .select()
    .single()

  if (error) {
    console.error('[Pointage Arrivée]', error.message)
    return { success: false, error: 'Erreur lors du pointage' }
  }

  await logAudit({
    action: 'pointer_arrivee',
    entity_type: 'pointage',
    entity_id: data.id,
  })

  revalidatePath('/dashboard/formateur-home')
  return { success: true, data }
}

export async function pointerDepartAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const pointageId = formData.get('pointage_id') as string
  const photoBase64 = formData.get('photo') as string

  if (!pointageId) {
    return { success: false, error: 'Pointage introuvable' }
  }

  // Trouver la fiche formateur
  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) {
    return { success: false, error: 'Fiche formateur introuvable' }
  }

  // Vérifier le pointage
  const { data: pointage } = await supabase
    .from('pointages_formateur')
    .select('id, formateur_id, heure_depart')
    .eq('id', pointageId)
    .eq('formateur_id', formateur.id)
    .single()

  if (!pointage) {
    return { success: false, error: 'Pointage introuvable' }
  }

  if (pointage.heure_depart) {
    return { success: false, error: 'Vous avez déjà pointé votre départ' }
  }

  // Upload photo
  const photoUrl = await uploadPhoto(supabase, session.organization.id, formateur.id, photoBase64, 'depart')

  // Mettre à jour le pointage
  const { error } = await supabase
    .from('pointages_formateur')
    .update({
      heure_depart: new Date().toISOString(),
      photo_depart_url: photoUrl,
    })
    .eq('id', pointageId)

  if (error) {
    console.error('[Pointage Départ]', error.message)
    return { success: false, error: 'Erreur lors du pointage' }
  }

  await logAudit({
    action: 'pointer_depart',
    entity_type: 'pointage',
    entity_id: pointageId,
  })

  revalidatePath('/dashboard/formateur-home')
  return { success: true }
}
