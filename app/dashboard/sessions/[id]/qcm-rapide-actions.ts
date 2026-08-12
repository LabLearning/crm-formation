'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

export interface SaisieRapide {
  reponseId: string
  /**
   * Résultat ramené sur 100. Une satisfaction est saisie sur 5 côté écran —
   * c'est l'échelle des questionnaires — et convertie avant d'arriver ici, pour
   * que tous les résultats se comparent sur la même base.
   */
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
 * On enregistre donc le résultat et la complétion, sans détail par question. La
 * différence avec une saisie détaillée se voit d'ailleurs en base : pas de
 * lignes dans qcm_reponses_detail — et l'écran de détail le dit, plutôt que de
 * laisser croire que le stagiaire n'a rien répondu.
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
    .select('id, is_complete, score, qcm_id, qcm:qcm_id(type, score_min_reussite)')
    .eq('organization_id', session.organization.id)
    .eq('session_id', sessionId)
    .in('id', entrees.map((e) => e.reponseId))

  const parId = new Map((existantes || []).map((r: any) => [r.id, r]))
  const maintenant = new Date().toISOString()
  let enregistrees = 0

  for (const e of entrees) {
    const r: any = parId.get(e.reponseId)
    if (!r) continue
    // Une réponse déjà notée ne se réécrit pas ici. Une réponse marquée
    // complétée mais sans note n'a rien enregistré : elle reste ouverte.
    if (r.is_complete && r.score != null) continue
    if (r.qcm?.type === 'satisfaction_froid' && !froidPossible) continue

    const seuil = r.qcm?.score_min_reussite != null ? Number(r.qcm.score_min_reussite) : null
    const score = e.score == null ? null : Math.max(0, Math.min(100, Math.round(e.score)))
    // Une satisfaction se note mais ne se réussit pas : la question « le seuil
    // est-il atteint » n'a pas de sens sur une appréciation.
    const notable = r.qcm?.type === 'positionnement' || r.qcm?.type === 'sortie'

    const { error } = await supabase.from('qcm_reponses').update({
      score,
      // Sans détail par question, le total de points n'aurait pas de sens.
      score_points: null,
      score_total: null,
      is_reussi: notable && score != null && seuil != null ? score >= seuil : null,
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
