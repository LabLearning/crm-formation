'use server'

import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function togglePresenceAction(
  token: string,
  emargementId: string,
  estPresent: boolean
): Promise<{ success: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'formateur') {
    return { success: false, error: 'Accès non autorisé' }
  }

  const supabase = await createServiceRoleClient()

  const updateData: Record<string, any> = {
    est_present: estPresent,
  }

  const { error } = await supabase
    .from('emargements')
    .update(updateData)
    .eq('id', emargementId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function createEmargementAction(
  token: string,
  sessionId: string,
  date: string,
  creneau: 'matin' | 'apres_midi' | 'journee'
): Promise<{ success: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'formateur') {
    return { success: false, error: 'Accès non autorisé' }
  }

  const supabase = await createServiceRoleClient()

  // Get all active inscriptions for this session
  const { data: inscriptions, error: inscriptionsError } = await supabase
    .from('inscriptions')
    .select('apprenant_id')
    .eq('session_id', sessionId)
    .not('status', 'in', '("annule","abandonne")')

  if (inscriptionsError) {
    return { success: false, error: inscriptionsError.message }
  }

  if (!inscriptions || inscriptions.length === 0) {
    return { success: false, error: 'Aucun apprenant inscrit à cette session' }
  }

  const organizationId = context.organization.id

  // Check existing emargements to avoid duplicates
  const apprenantIds = inscriptions.map((i) => i.apprenant_id)
  const { data: existing } = await supabase
    .from('emargements')
    .select('apprenant_id')
    .eq('session_id', sessionId)
    .eq('date', date)
    .eq('creneau', creneau)
    .in('apprenant_id', apprenantIds)

  const existingApprenantIds = new Set((existing || []).map((e: any) => e.apprenant_id))

  const toInsert = inscriptions
    .filter((i) => !existingApprenantIds.has(i.apprenant_id))
    .map((i) => ({
      session_id: sessionId,
      apprenant_id: i.apprenant_id,
      date,
      creneau,
      est_present: false,
      organization_id: organizationId,
    }))

  if (toInsert.length === 0) {
    return { success: false, error: 'La feuille d\'émargement existe déjà pour cette date et ce créneau' }
  }

  const { error: insertError } = await supabase.from('emargements').insert(toInsert)

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true }
}
