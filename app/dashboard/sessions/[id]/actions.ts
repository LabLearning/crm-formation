'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function updateSessionStatusAction(sessionId: string, newStatus: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('sessions')
    .update({ status: newStatus })
    .eq('id', sessionId)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/dashboard/sessions/${sessionId}`)
  return { success: true }
}

export async function togglePresenceAction(emargementId: string, estPresent: boolean): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('emargements')
    .update({ est_present: estPresent })
    .eq('id', emargementId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/sessions')
  return { success: true }
}

export async function createEmargementJourAction(sessionId: string, date: string, creneau: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Récupérer les apprenants inscrits
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('apprenant_id')
    .eq('session_id', sessionId)
    .not('status', 'in', '("annule","abandonne")')

  if (!inscriptions || inscriptions.length === 0) {
    return { success: false, error: 'Aucun apprenant inscrit' }
  }

  // Vérifier les doublons
  const apprenantIds = inscriptions.map(i => i.apprenant_id)
  const { data: existing } = await supabase
    .from('emargements')
    .select('apprenant_id')
    .eq('session_id', sessionId)
    .eq('date', date)
    .eq('creneau', creneau)
    .in('apprenant_id', apprenantIds)

  const existingIds = new Set((existing || []).map((e: any) => e.apprenant_id))

  const toInsert = inscriptions
    .filter(i => !existingIds.has(i.apprenant_id))
    .map(i => ({
      session_id: sessionId,
      apprenant_id: i.apprenant_id,
      date,
      creneau,
      est_present: false,
      organization_id: session.organization.id,
    }))

  if (toInsert.length === 0) {
    return { success: false, error: 'Feuille d\'émargement déjà créée pour ce jour' }
  }

  const { error } = await supabase.from('emargements').insert(toInsert)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/dashboard/sessions/${sessionId}`)
  return { success: true }
}
