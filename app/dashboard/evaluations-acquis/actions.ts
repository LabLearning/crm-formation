'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import { importEvaluationsAcquis } from '@/lib/dendreo-eval-sync'
import type { ActionResult } from '@/lib/types'

export async function importEvaluationsAcquisAction(): Promise<ActionResult & { data?: { imported: number; unmatched: number } }> {
  const session = await getSession()
  if (!['super_admin', 'gestionnaire'].includes(session.user.role)) {
    return { success: false, error: 'Accès non autorisé' }
  }
  const supabase = await createServiceRoleClient()
  const res = await importEvaluationsAcquis(supabase, session.organization.id)
  if (!res.success) return { success: false, error: res.error || 'Échec de l\'import' }

  await logAudit({ action: 'import', entity_type: 'evaluation_acquis', details: { imported: res.imported, unmatched: res.unmatched } })
  revalidatePath('/dashboard/evaluations-acquis')
  revalidatePath('/dashboard/qualiopi')
  return { success: true, data: { imported: res.imported, unmatched: res.unmatched } }
}
