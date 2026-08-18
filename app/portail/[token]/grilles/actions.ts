'use server'

import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { enregistrerReponses } from '@/lib/qcm-notation'

/**
 * Enregistre les réponses d'une grille (un questionnaire × plusieurs
 * stagiaires) saisie par le formateur depuis son portail. Chaque stagiaire
 * passe par la notation partagée : score, détail question par question,
 * progression — exactement comme une saisie faite dans le dashboard.
 */
export async function enregistrerGrillePortailAction(
  token: string,
  sessionId: string,
  qcmId: string,
  parApprenant: Record<string, Record<string, string>>,
): Promise<{ success: boolean; error?: string; faits?: string[] }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'formateur') return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  // La session doit être à ce formateur.
  const { data: sess } = await supabase.from('sessions')
    .select('id, organization_id').eq('id', sessionId)
    .eq('formateur_id', (context as any).formateur.id).maybeSingle()
  if (!sess) return { success: false, error: 'Session introuvable' }

  const faits: string[] = []
  for (const [apprenantId, reponses] of Object.entries(parApprenant)) {
    const remplies = Object.values(reponses).filter((v) => String(v || '').trim() !== '').length
    if (!remplies) continue

    // Ligne de réponse en attente (créée si absente — inscription tardive).
    let { data: ligne } = await supabase.from('qcm_reponses')
      .select('id, is_complete').eq('session_id', sessionId).eq('qcm_id', qcmId)
      .eq('apprenant_id', apprenantId).maybeSingle()
    if (ligne?.is_complete) continue
    if (!ligne) {
      const { data: creee, error } = await supabase.from('qcm_reponses').insert({
        organization_id: (sess as any).organization_id,
        session_id: sessionId, qcm_id: qcmId, apprenant_id: apprenantId, is_complete: false,
      }).select('id, is_complete').single()
      if (error) { console.error('[grille portail]', error.message); continue }
      ligne = creee
    }

    const r = await enregistrerReponses(supabase, (ligne as any).id, qcmId, reponses)
    if (r.success) faits.push(apprenantId)
  }

  if (!faits.length) return { success: false, error: 'Aucune réponse à enregistrer — remplissez au moins un stagiaire.' }
  return { success: true, faits }
}
