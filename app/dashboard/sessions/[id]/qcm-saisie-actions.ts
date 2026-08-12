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

/**
 * Détail d'une réponse : ce que le stagiaire a effectivement répondu.
 *
 * Un pourcentage ne dit rien d'une satisfaction. Ce qui convainc un auditeur,
 * ce sont les réponses elles-mêmes — les notes attribuées et surtout les
 * verbatims, qui montrent que le recueil a réellement eu lieu.
 */
export async function detailReponseAction(reponseId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { data: reponse } = await supabase
    .from('qcm_reponses')
    .select('id, qcm_id, score, is_complete, date_realisation, completed_at, apprenant:apprenant_id(prenom, nom), qcm:qcm_id(titre, type)')
    .eq('id', reponseId).eq('organization_id', session.organization.id).maybeSingle()
  if (!reponse) return { success: false, error: 'Questionnaire introuvable' }

  const [{ data: questions }, { data: details }] = await Promise.all([
    supabase.from('qcm_questions')
      .select('id, texte, type, position, choix:qcm_choix(id, texte, est_correct)')
      .eq('qcm_id', (reponse as any).qcm_id).order('position', { ascending: true }),
    supabase.from('qcm_reponses_detail')
      .select('question_id, choix_ids, texte_libre, note_valeur, est_correct')
      .eq('reponse_id', reponseId),
  ])

  const parQuestion = new Map((details || []).map((d: any) => [d.question_id, d]))
  const lignes = (questions || []).map((q: any) => {
    const d: any = parQuestion.get(q.id)
    const choisis = (d?.choix_ids || [])
      .map((id: string) => (q.choix || []).find((c: any) => c.id === id)?.texte)
      .filter(Boolean)
    return {
      question: q.texte,
      type: q.type,
      // Une échelle porte son plafond : « 4 / 5 » se lit, « 4 » ne se lit pas.
      plafond: q.type === 'note_1_5' ? 5 : (q.type === 'note_1_10' || q.type === 'nps') ? 10 : null,
      note: d?.note_valeur ?? null,
      texte: d?.texte_libre || null,
      choisis,
      estCorrect: d?.est_correct ?? null,
      attendu: (q.choix || []).filter((c: any) => c.est_correct).map((c: any) => c.texte),
    }
  })

  return { success: true, data: { reponse, lignes } }
}
