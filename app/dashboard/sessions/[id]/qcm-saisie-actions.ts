'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { enregistrerReponses } from '@/lib/qcm-notation'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

/**
 * Charge un questionnaire pour saisie au nom d'un stagiaire.
 *
 * Le formateur dicte, le gestionnaire reporte : l'écran a donc besoin des
 * questions, mais aussi de savoir si la réponse a déjà été enregistrée pour
 * ne pas écraser une saisie existante sans le dire.
 */
export async function chargerQuestionnaireAction(reponseId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: reponse } = await supabase
    .from('qcm_reponses')
    .select('id, qcm_id, session_id, apprenant_id, is_complete, score, date_realisation, apprenant:apprenants(prenom, nom)')
    .eq('id', reponseId)
    .eq('organization_id', session.organization.id)
    .maybeSingle()
  if (!reponse) return { success: false, error: 'Questionnaire introuvable' }

  const { data: qcm } = await supabase
    .from('qcm')
    .select('id, titre, type, description, score_min_reussite')
    .eq('id', (reponse as any).qcm_id)
    .single()

  const { data: questions } = await supabase
    .from('qcm_questions')
    .select('id, texte, type, points, position, explication, choix:qcm_choix(id, texte, est_correct, position)')
    .eq('qcm_id', (reponse as any).qcm_id)
    .order('position', { ascending: true })

  return { success: true, data: { reponse, qcm, questions: questions || [] } }
}

/**
 * Enregistre les réponses recueillies auprès d'un stagiaire.
 *
 * Le score est calculé comme pour une réponse saisie par le stagiaire.
 */
export async function saisirQuestionnaireAction(
  reponseId: string,
  reponses: Record<string, string>,
): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: existante } = await supabase
    .from('qcm_reponses')
    .select('id, qcm_id, session_id, is_complete')
    .eq('id', reponseId)
    .eq('organization_id', session.organization.id)
    .maybeSingle()
  if (!existante) return { success: false, error: 'Questionnaire introuvable' }
  if ((existante as any).is_complete) {
    return { success: false, error: 'Ce questionnaire a déjà été renseigné.' }
  }

  const r = await enregistrerReponses(
    supabase,
    reponseId,
    (existante as any).qcm_id,
    reponses,
  )
  if (!r.success) return r

  await logAudit({
    action: 'update', entity_type: 'qcm_reponse', entity_id: reponseId,
    details: { score: r.data?.score },
  })
  revalidatePath(`/dashboard/sessions/${(existante as any).session_id}`)
  return r
}
