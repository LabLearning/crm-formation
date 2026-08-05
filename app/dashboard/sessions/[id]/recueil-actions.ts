'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

/**
 * Enregistre / met à jour le recueil du besoin d'une session (indicateur 4).
 * Un seul recueil par session (upsert sur organization_id + session_id).
 */
export async function saveRecueilAction(params: {
  sessionId: string
  templateId: string | null
  theme: string | null
  reponses: Record<string, string>
  statut: 'brouillon' | 'complete'
}): Promise<ActionResult> {
  const session = await getSession()
  if (['formateur', 'apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { error } = await supabase.from('recueils_besoin').upsert({
    organization_id: session.organization.id,
    session_id: params.sessionId,
    template_id: params.templateId || null,
    theme: params.theme || null,
    reponses: params.reponses || {},
    statut: params.statut,
    rempli_par: session.user.id,
    date_recueil: params.statut === 'complete' ? new Date().toISOString().split('T')[0] : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,session_id' })

  if (error) { console.error('[recueil]', error); return { success: false, error: 'Erreur lors de l\'enregistrement' } }

  await logAudit({ action: 'save', entity_type: 'recueil_besoin', entity_id: params.sessionId, details: { statut: params.statut } })
  revalidatePath(`/dashboard/sessions/${params.sessionId}`)
  revalidatePath('/dashboard/qualiopi')
  return { success: true }
}
