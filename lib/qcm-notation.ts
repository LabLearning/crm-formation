/**
 * Notation et enregistrement d'un questionnaire rempli.
 *
 * La logique était jusqu'ici enfermée dans l'action du portail apprenant. Elle
 * sert désormais à deux appelants — le stagiaire qui répond lui-même, et le
 * gestionnaire qui reporte un entretien conduit oralement — et un score doit
 * se calculer de la même façon quel que soit le chemin.
 */

export interface ResultatNotation {
  score: number
  scorePoints: number
  scoreTotal: number
  isReussi: boolean | null
}

/**
 * Calcule le score, enregistre le détail des réponses et clôt le
 * questionnaire.
 *
 * `saisiPar` distingue les deux cas : nul quand le stagiaire répond lui-même,
 * renseigné quand un tiers transcrit. Cette distinction est conservée en base
 * parce qu'elle change la valeur probante de la pièce.
 */
export async function enregistrerReponses(
  supabase: any,
  qcmReponseId: string,
  qcmId: string,
  reponses: Record<string, string>,
  saisiPar?: string | null,
): Promise<{ success: boolean; error?: string; data?: ResultatNotation }> {
  const { data: questions } = await supabase
    .from('qcm_questions')
    .select('id, texte, type, points, choix:qcm_choix(id, texte, est_correct, position)')
    .eq('qcm_id', qcmId)
    .order('position', { ascending: true })

  if (!questions) return { success: false, error: 'Impossible de charger les questions' }

  let pointsObtenusTotal = 0
  let pointsPossibles = 0
  const details: any[] = []

  for (const q of questions as any[]) {
    const pts = Number(q.points) || 1
    pointsPossibles += pts
    const reponse = reponses[q.id]

    let estCorrect: boolean | null = null
    let pointsObtenus = 0
    let choixIds: string[] | null = null
    let texteLibre: string | null = null
    let note: number | null = null

    if (q.type === 'choix_unique' || q.type === 'choix_multiple' || q.type === 'vrai_faux') {
      if (reponse) {
        choixIds = [reponse]
        const choix = (q.choix as any[]).find((c: any) => c.id === reponse)
        if (choix) {
          estCorrect = choix.est_correct === true
          if (estCorrect) { pointsObtenusTotal += pts; pointsObtenus = pts }
        }
      }
    } else if (q.type === 'texte_libre') {
      // Une réponse ouverte ne se note pas automatiquement.
      texteLibre = reponse || null
    } else {
      // Échelles et NPS : une satisfaction n'est ni juste ni fausse.
      note = reponse ? parseInt(reponse, 10) : null
    }

    details.push({
      reponse_id: qcmReponseId,
      question_id: q.id,
      choix_ids: choixIds,
      texte_libre: texteLibre,
      note_valeur: note,
      est_correct: estCorrect,
      points_obtenus: pointsObtenus,
    })
  }

  const score = pointsPossibles > 0 ? Math.round((pointsObtenusTotal / pointsPossibles) * 100) : 0

  const { data: qcm } = await supabase.from('qcm').select('score_min_reussite').eq('id', qcmId).single()
  const seuil = qcm?.score_min_reussite != null ? Number(qcm.score_min_reussite) : null
  const isReussi = seuil !== null ? score >= seuil : null

  if (details.length > 0) {
    await supabase.from('qcm_reponses_detail').insert(details)
  }

  const maj: any = {
    score,
    score_points: pointsObtenusTotal,
    score_total: pointsPossibles,
    is_reussi: isReussi,
    is_complete: true,
    completed_at: new Date().toISOString(),
  }
  if (saisiPar) {
    maj.saisi_par = saisiPar
    maj.saisi_le = new Date().toISOString()
  }

  const { error } = await supabase.from('qcm_reponses').update(maj).eq('id', qcmReponseId)
  if (error) {
    console.error('[notation qcm]', error.message)
    return { success: false, error: "Enregistrement impossible" }
  }

  return { success: true, data: { score, scorePoints: pointsObtenusTotal, scoreTotal: pointsPossibles, isReussi } }
}
