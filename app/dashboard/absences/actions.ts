'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

export const MOTIFS_ABSENCE = [
  'Maladie / arrêt de travail',
  'Raison professionnelle (service, remplacement)',
  'Raison personnelle ou familiale',
  'Retard — présent en partie',
  'Abandon de la formation',
  'Absence injustifiée',
] as const

/**
 * Justifie une ou plusieurs absences d'un coup (indicateur 12) : le même
 * motif s'applique à toutes les lignes sélectionnées — typiquement les deux
 * créneaux d'une même journée, ou toutes les journées d'un même stagiaire.
 */
export async function justifierAbsencesAction(
  emargementIds: string[],
  motif: string,
): Promise<ActionResult & { data?: { justifiees: number } }> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  if (!emargementIds.length) return { success: false, error: 'Aucune absence sélectionnée' }
  if (!motif.trim()) return { success: false, error: 'Motif requis' }

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('emargements')
    .update({ motif_absence: motif.trim().slice(0, 200) })
    .in('id', emargementIds.slice(0, 500))
    .eq('organization_id', session.organization.id)
    .eq('est_present', false)
    .select('id')

  if (error) return { success: false, error: 'Enregistrement impossible' }

  await logAudit({
    action: 'update', entity_type: 'emargement', entity_id: emargementIds[0],
    details: { justification_absences: (data || []).length, motif },
  })
  revalidatePath('/dashboard/absences')
  return { success: true, data: { justifiees: (data || []).length } }
}
