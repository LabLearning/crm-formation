'use server'

import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { enregistrerReponses } from '@/lib/qcm-notation'

export async function submitQcmAction(
  token: string,
  qcmReponseId: string,
  // Map of question_id → answer (choix_id for qcm/vrai_faux, free text for texte_libre, note value for note types)
  answers: Record<string, string>
): Promise<{ success: boolean; score?: number; isReussi?: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'apprenant') {
    return { success: false, error: 'Accès non autorisé' }
  }

  const supabase = await createServiceRoleClient()

  // Fetch the qcm_reponse and verify ownership
  const { data: reponse, error: reponseError } = await supabase
    .from('qcm_reponses')
    .select('id, qcm_id, is_complete, apprenant_id, organization_id')
    .eq('id', qcmReponseId)
    .eq('apprenant_id', context.apprenant.id)
    .single()

  if (reponseError || !reponse) {
    return { success: false, error: 'Questionnaire introuvable' }
  }

  if (reponse.is_complete) {
    return { success: false, error: 'Déjà soumis' }
  }

  // La notation partagée fait foi (lib/qcm-notation) : pourcentage sur les
  // questions notables, moyenne des échelles sinon, null quand rien ne se
  // note — jamais un faux 0 % sur un positionnement d'auto-évaluation.
  const r = await enregistrerReponses(supabase, qcmReponseId, reponse.qcm_id, answers)
  if (!r.success) return { success: false, error: r.error }

  return {
    success: true,
    score: r.data?.score ?? undefined,
    isReussi: r.data?.isReussi ?? undefined,
  }
}
