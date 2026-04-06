'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function saveRapportAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase.from('formateurs').select('id').eq('user_id', session.user.id).single()
  if (!formateur) return { success: false, error: 'Fiche formateur introuvable' }

  const sessionId = formData.get('session_id') as string
  const submit = formData.get('submit') === 'true'

  const rapportData = {
    organization_id: session.organization.id,
    session_id: sessionId,
    formateur_id: formateur.id,
    contenu_aborde: (formData.get('contenu_aborde') as string)?.trim() || null,
    objectifs_atteints: (formData.get('objectifs_atteints') as string)?.trim() || null,
    objectifs_non_atteints: (formData.get('objectifs_non_atteints') as string)?.trim() || null,
    difficultes_rencontrees: (formData.get('difficultes_rencontrees') as string)?.trim() || null,
    recommandations: (formData.get('recommandations') as string)?.trim() || null,
    points_positifs: (formData.get('points_positifs') as string)?.trim() || null,
    commentaires_generaux: (formData.get('commentaires_generaux') as string)?.trim() || null,
    status: submit ? 'soumis' : 'brouillon',
    submitted_at: submit ? new Date().toISOString() : null,
  }

  // Commentaires par apprenant
  const commentairesStr = formData.get('commentaires_apprenants') as string
  if (commentairesStr) {
    try { (rapportData as any).commentaires_apprenants = JSON.parse(commentairesStr) } catch { /* ignore */ }
  }

  // Upsert
  const { data: existing } = await supabase
    .from('rapports_session')
    .select('id')
    .eq('session_id', sessionId)
    .eq('formateur_id', formateur.id)
    .single()

  if (existing) {
    const { error } = await supabase.from('rapports_session').update(rapportData).eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('rapports_session').insert(rapportData)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/formateur-home/rapports')
  return { success: true }
}
