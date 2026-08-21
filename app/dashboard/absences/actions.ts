'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

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

  if (error) {
    console.error('[absences] justification:', error.message)
    return { success: false, error: `Enregistrement impossible : ${error.message}` }
  }

  await logAudit({
    action: 'update', entity_type: 'emargement', entity_id: emargementIds[0],
    details: { justification_absences: (data || []).length, motif },
  })
  revalidatePath('/dashboard/absences')
  return { success: true, data: { justifiees: (data || []).length } }
}

/**
 * Modifie des absences déjà justifiées : nouveau motif, retour dans la file
 * « à justifier » (motif effacé), ou requalification en présence (l'absence
 * était une erreur de saisie).
 */
export async function modifierAbsencesAction(
  emargementIds: string[],
  mode: 'motif' | 'sans_motif' | 'present',
  motif?: string,
): Promise<ActionResult & { data?: { modifiees: number } }> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  if (!emargementIds.length) return { success: false, error: 'Aucune ligne sélectionnée' }
  if (mode === 'motif' && !motif?.trim()) return { success: false, error: 'Motif requis' }

  const patch = mode === 'present'
    ? { est_present: true, motif_absence: null }
    : mode === 'sans_motif'
      ? { motif_absence: null }
      : { motif_absence: motif!.trim().slice(0, 200) }

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('emargements')
    .update(patch)
    .in('id', emargementIds.slice(0, 500))
    .eq('organization_id', session.organization.id)
    .select('id')

  if (error) {
    console.error('[absences] modification:', error.message)
    return { success: false, error: `Modification impossible : ${error.message}` }
  }

  await logAudit({
    action: 'update', entity_type: 'emargement', entity_id: emargementIds[0],
    details: { modification_absences: (data || []).length, mode, motif: motif || null },
  })
  revalidatePath('/dashboard/absences')
  return { success: true, data: { modifiees: (data || []).length } }
}
