'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/lib/portal-auth'

/**
 * Signature de l'apprenant sur SON propre émargement, depuis son portail.
 * Mêmes règles que la signature sur le device du formateur : présence posée
 * avec la signature, bloquée si la feuille du créneau est déjà validée.
 * Un créneau futur ne se signe pas.
 */
export async function signerMonEmargementAction(
  token: string,
  emargementId: string,
  signatureBase64: string,
): Promise<{ success: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'apprenant') {
    return { success: false, error: 'Accès non autorisé' }
  }
  if (!signatureBase64?.startsWith('data:image/')) {
    return { success: false, error: 'Signature invalide' }
  }

  const supabase = await createServiceRoleClient()
  const { data: em } = await supabase
    .from('emargements')
    .select('id, session_id, date, creneau, apprenant_id, signature_data')
    .eq('id', emargementId)
    .eq('apprenant_id', context.apprenant.id)
    .single()

  if (!em) return { success: false, error: 'Émargement introuvable' }
  if (em.signature_data) return { success: false, error: 'Ce créneau est déjà signé' }
  if (String(em.date) > new Date().toISOString().slice(0, 10)) {
    return { success: false, error: 'Ce créneau n\'a pas encore eu lieu' }
  }

  const { data: feuille } = await supabase
    .from('emargement_feuilles')
    .select('validated_at')
    .eq('session_id', em.session_id)
    .eq('date', em.date)
    .eq('creneau', em.creneau)
    .maybeSingle()
  if (feuille?.validated_at) {
    return { success: false, error: 'La feuille de ce créneau est déjà validée' }
  }

  const { error } = await supabase
    .from('emargements')
    .update({
      est_present: true,
      signature_data: signatureBase64,
      signed_at: new Date().toISOString(),
      signed_via: 'portail_apprenant',
      motif_absence: null,
    })
    .eq('id', emargementId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/portail/${token}/mes-emargements`)
  revalidatePath(`/dashboard/sessions/${em.session_id}`)
  return { success: true }
}
