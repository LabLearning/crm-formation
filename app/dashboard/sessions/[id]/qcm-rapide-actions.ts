'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

export interface SaisieRapide {
  reponseId: string
  /** Score sur 100. Absent pour un questionnaire de satisfaction, qui ne se note pas. */
  score?: number | null
}

/**
 * Saisie groupée des résultats d'une session.
 *
 * Le formateur arrive avec ses questionnaires papier déjà remplis. Retaper
 * chaque réponse question par question, pour chaque stagiaire, représente des
 * heures — et n'apporte rien : le document du formateur est la pièce
 * justificative, il se dépose au dossier. Ce qui manque au CRM, c'est le
 * constat que l'évaluation a eu lieu et son résultat.
 *
 * On enregistre donc le score et la complétion, sans détail par question. La
 * différence avec une saisie détaillée se voit d'ailleurs en base : pas de
 * lignes dans qcm_reponses_detail.
 */
export async function saisieRapideAction(
  sessionId: string,
  entrees: SaisieRapide[],
): Promise<ActionResult & { data?: { enregistrees: number } }> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  if (entrees.length === 0) return { success: false, error: 'Rien à enregistrer' }

  const supabase = await createServiceRoleClient()

  const { data: sess } = await supabase
    .from('sessions').select('date_debut, date_fin')
    .eq('id', sessionId).eq('organization_id', session.organization.id).maybeSingle()
  const fin = (sess as any)?.date_fin || (sess as any)?.date_debut
  // La satisfaction à froid se recueille à J+90 : c'est sa définition même.
  // La renseigner plus tôt produirait une pièce datée d'un jour où personne
  // n'a été interrogé.
  const froidPossible = fin
    ? (Date.now() - new Date(fin).getTime()) / 86400000 >= 90
    : false

  const { data: existantes } = await supabase
    .from('qcm_reponses')
    .select('id, is_complete, qcm_id, qcm:qcm_id(type, score_min_reussite)')
    .eq('organization_id', session.organization.id)
    .eq('session_id', sessionId)
    .in('id', entrees.map((e) => e.reponseId))

  const parId = new Map((existantes || []).map((r: any) => [r.id, r]))
  const maintenant = new Date().toISOString()
  let enregistrees = 0

  for (const e of entrees) {
    const r: any = parId.get(e.reponseId)
    if (!r || r.is_complete) continue
    if (r.qcm?.type === 'satisfaction_froid' && !froidPossible) continue

    const seuil = r.qcm?.score_min_reussite != null ? Number(r.qcm.score_min_reussite) : null
    const score = e.score == null ? null : Math.max(0, Math.min(100, Math.round(e.score)))

    const { error } = await supabase.from('qcm_reponses').update({
      score,
      // Sans détail par question, le total de points n'aurait pas de sens.
      score_points: null,
      score_total: null,
      is_reussi: score != null && seuil != null ? score >= seuil : null,
      is_complete: true,
      completed_at: maintenant,
    }).eq('id', e.reponseId)

    if (!error) enregistrees++
  }

  await logAudit({
    action: 'update', entity_type: 'session', entity_id: sessionId,
    details: { saisie_rapide: true, enregistrees },
  })
  revalidatePath(`/dashboard/sessions/${sessionId}`)
  return { success: true, data: { enregistrees } }
}
