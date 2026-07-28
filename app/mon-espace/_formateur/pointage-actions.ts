'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { getPortalContext } from '@/lib/portal-auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

/** Résout le formateur depuis le token portail OU le compte connecté. */
async function resolveFormateur(token: string | null) {
  const supabase = await createServiceRoleClient()
  if (token) {
    const ctx = await getPortalContext(token)
    if (ctx && ctx.type === 'formateur') return { supabase, formateurId: ctx.formateur.id as string, orgId: ctx.organization.id as string }
  }
  try {
    const session = await getSession()
    if (session.user.role !== 'formateur') return null
    const { data: f } = await supabase.from('formateurs').select('id').eq('user_id', session.user.id).single()
    if (!f) return null
    return { supabase, formateurId: f.id as string, orgId: session.organization.id as string }
  } catch { return null }
}

async function uploadPhoto(supabase: any, orgId: string, formateurId: string, photoBase64: string, type: 'arrivee' | 'depart'): Promise<string | null> {
  if (!photoBase64) return null
  const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  const date = new Date().toISOString().split('T')[0]
  const path = `${orgId}/${formateurId}/${date}_${type}_${Date.now()}.jpg`
  const { error } = await supabase.storage.from('pointages').upload(path, buffer, { contentType: 'image/jpeg', upsert: false })
  if (error) { console.error('[pointage upload]', error.message); return null }
  const { data } = supabase.storage.from('pointages').getPublicUrl(path)
  return data?.publicUrl || null
}

const revalidate = (token: string | null, sessionId: string) => {
  if (token) revalidatePath(`/portail/${token}/emargement/${sessionId}`)
  revalidatePath(`/mon-espace/emargement/${sessionId}`)
}

/** Pointage d'arrivée du formateur sur une session (jour courant). */
export async function pointerArriveeSessionAction(formData: FormData): Promise<ActionResult> {
  const token = (formData.get('token') as string) || null
  const ctx = await resolveFormateur(token)
  if (!ctx) return { success: false, error: 'Accès non autorisé' }
  const { supabase, formateurId, orgId } = ctx

  const sessionId = formData.get('session_id') as string
  const photo = formData.get('photo') as string
  if (!sessionId) return { success: false, error: 'Session manquante' }

  // La session doit appartenir au formateur
  const { data: sess } = await supabase.from('sessions').select('id').eq('id', sessionId).eq('formateur_id', formateurId).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }

  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('pointages_formateur').select('id').eq('formateur_id', formateurId).eq('session_id', sessionId).eq('date', today).maybeSingle()
  if (existing) return { success: false, error: 'Arrivée déjà pointée aujourd\'hui pour cette session' }

  const photoUrl = await uploadPhoto(supabase, orgId, formateurId, photo, 'arrivee')
  const { data, error } = await supabase.from('pointages_formateur').insert({
    organization_id: orgId, formateur_id: formateurId, session_id: sessionId,
    date: today, heure_arrivee: new Date().toISOString(), photo_arrivee_url: photoUrl,
  }).select('id').single()
  if (error) { console.error('[pointage arrivée]', error.message); return { success: false, error: 'Erreur lors du pointage' } }

  await logAudit({ action: 'pointer_arrivee', entity_type: 'pointage', entity_id: data.id })
  revalidate(token, sessionId)
  return { success: true, data }
}

/** Pointage de départ du formateur. */
export async function pointerDepartSessionAction(formData: FormData): Promise<ActionResult> {
  const token = (formData.get('token') as string) || null
  const ctx = await resolveFormateur(token)
  if (!ctx) return { success: false, error: 'Accès non autorisé' }
  const { supabase, formateurId, orgId } = ctx

  const pointageId = formData.get('pointage_id') as string
  const sessionId = (formData.get('session_id') as string) || ''
  const photo = formData.get('photo') as string
  if (!pointageId) return { success: false, error: 'Pointage introuvable' }

  const { data: pointage } = await supabase
    .from('pointages_formateur').select('id, heure_depart').eq('id', pointageId).eq('formateur_id', formateurId).maybeSingle()
  if (!pointage) return { success: false, error: 'Pointage introuvable' }
  if (pointage.heure_depart) return { success: false, error: 'Départ déjà pointé' }

  const photoUrl = await uploadPhoto(supabase, orgId, formateurId, photo, 'depart')
  const { error } = await supabase.from('pointages_formateur')
    .update({ heure_depart: new Date().toISOString(), photo_depart_url: photoUrl }).eq('id', pointageId)
  if (error) { console.error('[pointage départ]', error.message); return { success: false, error: 'Erreur lors du pointage' } }

  await logAudit({ action: 'pointer_depart', entity_type: 'pointage', entity_id: pointageId })
  revalidate(token, sessionId)
  return { success: true }
}
