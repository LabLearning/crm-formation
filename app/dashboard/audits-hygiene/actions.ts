'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { synchroniserAuditHygiene } from '@/lib/audithygiene'
import type { ActionResult } from '@/lib/types'

const ROLES = ['super_admin', 'gestionnaire', 'directeur_commercial']

/** Lance la synchronisation depuis l'outil terrain AuditHygiène. */
export async function synchroniserAction(): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }

  const supabase = await createServiceRoleClient()
  const res = await synchroniserAuditHygiene(supabase, session.organization.id, session.user.id)
  if (!res.success) return { success: false, error: res.error }

  await logAudit({ action: 'sync', entity_type: 'audithygiene', details: res.resume as any })
  revalidatePath('/dashboard/audits-hygiene')
  return { success: true, data: res.resume }
}

/** Rattache manuellement un établissement audité à un client du CRM. */
export async function rattacherEtablissementAction(
  etablissementId: string,
  clientId: string | null,
): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('ah_etablissements')
    .update({
      client_id: clientId,
      match_methode: clientId ? 'manuel' : null,
      match_valide_par: session.user.id,
      match_valide_at: new Date().toISOString(),
      ignore_rapprochement: false,
    })
    .eq('id', etablissementId)
    .eq('organization_id', session.organization.id)

  if (error) {
    console.error('[rattacher etablissement]', error)
    return { success: false, error: 'Rattachement impossible' }
  }
  revalidatePath('/dashboard/audits-hygiene')
  return { success: true }
}

/** Marque un établissement comme volontairement non rattaché (hors clientèle). */
export async function ignorerEtablissementAction(etablissementId: string, ignore = true): Promise<ActionResult> {
  const session = await getSession()
  if (!ROLES.includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('ah_etablissements')
    .update({
      ignore_rapprochement: ignore,
      match_valide_par: session.user.id,
      match_valide_at: new Date().toISOString(),
    })
    .eq('id', etablissementId)
    .eq('organization_id', session.organization.id)

  if (error) {
    console.error('[ignorer etablissement]', error)
    return { success: false, error: 'Mise à jour impossible' }
  }
  revalidatePath('/dashboard/audits-hygiene')
  return { success: true }
}
