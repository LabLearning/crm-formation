'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

/** Affecte un formateur à une session qui n'en avait pas (écran de rattrapage). */
export async function assignerFormateurAction(sessionId: string, formateurId: string): Promise<ActionResult> {
  const session = await getSession()
  if (['formateur', 'apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { error } = await supabase.from('sessions')
    .update({ formateur_id: formateurId, updated_at: new Date().toISOString() })
    .eq('id', sessionId).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Erreur lors de l\'affectation' }

  await logAudit({ action: 'assign_formateur', entity_type: 'session', entity_id: sessionId, details: { formateur_id: formateurId } })
  revalidatePath('/dashboard/sessions/sans-formateur')
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  return { success: true }
}
