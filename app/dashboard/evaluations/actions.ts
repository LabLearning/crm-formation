'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function sendQCMToApprenantAction(
  qcmId: string,
  sessionId: string,
  apprenantId: string
): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Check if already sent
  const { data: existing } = await supabase
    .from('qcm_reponses')
    .select('id')
    .eq('qcm_id', qcmId)
    .eq('session_id', sessionId)
    .eq('apprenant_id', apprenantId)
    .single()

  if (existing) return { success: false, error: 'Ce QCM a déjà été envoyé à cet apprenant' }

  const { data, error } = await supabase
    .from('qcm_reponses')
    .insert({
      organization_id: session.organization.id,
      qcm_id: qcmId,
      session_id: sessionId,
      apprenant_id: apprenantId,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur' }

  // TODO: Send email with token link (Module emails)

  return { success: true, data: { token: data.token } }
}

export async function getSessionResultsAction(sessionId: string) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: reponses } = await supabase
    .from('qcm_reponses')
    .select(`
      *,
      apprenant:apprenants(prenom, nom, email),
      qcm:qcm(titre, type, score_min_reussite)
    `)
    .eq('session_id', sessionId)
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  return reponses || []
}
