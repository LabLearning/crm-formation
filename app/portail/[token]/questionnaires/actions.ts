'use server'

import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

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

  // Fetch questions with their choices
  const { data: questions, error: questionsError } = await supabase
    .from('qcm_questions')
    .select('id, texte, type, points, choix:qcm_choix(id, texte, est_correct, position)')
    .eq('qcm_id', reponse.qcm_id)
    .order('position', { ascending: true })

  if (questionsError || !questions) {
    return { success: false, error: 'Impossible de charger les questions' }
  }

  // Calculate score
  let earnedPoints = 0
  let totalPoints = 0

  const detailRows: any[] = []

  for (const q of questions as any[]) {
    const pts = Number(q.points) || 1
    totalPoints += pts

    const answer = answers[q.id]
    let estCorrect: boolean | null = null
    let pointsObtenus = 0
    let choixIds: string[] | null = null
    let texteLibre: string | null = null
    let noteValeur: number | null = null

    if (q.type === 'choix_unique' || q.type === 'choix_multiple' || q.type === 'vrai_faux') {
      // answer is a choix_id
      if (answer) {
        choixIds = [answer]
        const choix = (q.choix as any[]).find((c: any) => c.id === answer)
        if (choix) {
          estCorrect = choix.est_correct === true
          if (estCorrect) {
            earnedPoints += pts
            pointsObtenus = pts
          }
        }
      }
    } else if (q.type === 'texte_libre') {
      texteLibre = answer || null
      estCorrect = null
      // No automatic scoring for open-ended
    } else if (q.type === 'note_1_5' || q.type === 'note_1_10' || q.type === 'nps') {
      noteValeur = answer ? parseInt(answer, 10) : null
      estCorrect = null
      // Satisfaction scores are not pass/fail
    }

    detailRows.push({
      reponse_id: qcmReponseId,
      question_id: q.id,
      choix_ids: choixIds,
      texte_libre: texteLibre,
      note_valeur: noteValeur,
      est_correct: estCorrect,
      points_obtenus: pointsObtenus,
    })
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

  // Fetch score_min_reussite from qcm
  const { data: qcmData } = await supabase
    .from('qcm')
    .select('score_min_reussite')
    .eq('id', reponse.qcm_id)
    .single()

  const scoreMin = qcmData?.score_min_reussite ? Number(qcmData.score_min_reussite) : null
  const isReussi = scoreMin !== null ? score >= scoreMin : null

  // Insert detail rows
  if (detailRows.length > 0) {
    await supabase.from('qcm_reponses_detail').insert(detailRows)
  }

  // Update the qcm_reponse
  const { error: updateError } = await supabase
    .from('qcm_reponses')
    .update({
      score,
      score_points: earnedPoints,
      score_total: totalPoints,
      is_reussi: isReussi,
      is_complete: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', qcmReponseId)

  if (updateError) {
    return { success: false, error: 'Erreur lors de la soumission' }
  }

  return { success: true, score, isReussi: isReussi ?? undefined }
}
