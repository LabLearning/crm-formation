'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/lib/portal-auth'

/**
 * Message de l'apprenant à son formateur. Le formateur doit être celui d'une
 * session où l'apprenant est inscrit — pas de messagerie hors cadre.
 */
export async function envoyerMessageFormateurAction(
  token: string,
  formateurId: string,
  contenu: string,
): Promise<{ success: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'apprenant') return { success: false, error: 'Accès non autorisé' }
  const texte = contenu.trim().slice(0, 2000)
  if (!texte) return { success: false, error: 'Écrivez votre message' }

  const supabase = await createServiceRoleClient()
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('session:session_id(id, formateur_id)')
    .eq('apprenant_id', context.apprenant.id)
  const sessionDuFormateur = (inscriptions || [])
    .map((i: any) => i.session)
    .find((s: any) => s?.formateur_id === formateurId)
  if (!sessionDuFormateur) return { success: false, error: 'Formateur non autorisé' }

  const { error } = await supabase.from('portal_messages').insert({
    organization_id: (context as any).organization?.id || (context.apprenant as any).organization_id,
    apprenant_id: context.apprenant.id,
    formateur_id: formateurId,
    session_id: sessionDuFormateur.id,
    auteur: 'apprenant',
    contenu: texte,
  })
  if (error) return { success: false, error: 'Envoi impossible (migration 139 appliquée ?)' }

  revalidatePath(`/portail/${token}/contact`)
  return { success: true }
}

/** Réponse du formateur à un apprenant, depuis son portail. */
export async function repondreApprenantAction(
  token: string,
  apprenantId: string,
  contenu: string,
): Promise<{ success: boolean; error?: string }> {
  const context = await getPortalContext(token)
  if (!context || context.type !== 'formateur') return { success: false, error: 'Accès non autorisé' }
  const texte = contenu.trim().slice(0, 2000)
  if (!texte) return { success: false, error: 'Écrivez votre message' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('portal_messages').insert({
    organization_id: (context as any).organization?.id || (context.formateur as any).organization_id,
    apprenant_id: apprenantId,
    formateur_id: context.formateur.id,
    auteur: 'formateur',
    contenu: texte,
  })
  if (error) return { success: false, error: 'Envoi impossible' }

  revalidatePath(`/portail/${token}/messages`)
  return { success: true }
}
