'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? '').replace(',', '.').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export async function saveResultatsAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!['super_admin', 'gestionnaire'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const { error } = await supabase.from('indicateurs_resultats').upsert({
    organization_id: session.organization.id,
    periode: String(formData.get('periode') || '') || null,
    taux_satisfaction: num(formData.get('taux_satisfaction')),
    taux_reussite: num(formData.get('taux_reussite')),
    taux_assiduite: num(formData.get('taux_assiduite')),
    taux_insertion: num(formData.get('taux_insertion')),
    nb_stagiaires: num(formData.get('nb_stagiaires')),
    nb_sessions: num(formData.get('nb_sessions')),
    commentaire: String(formData.get('commentaire') || '') || null,
    publie: formData.get('publie') === 'true',
    updated_by: session.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' })

  if (error) { console.error('[resultats]', error); return { success: false, error: 'Erreur lors de l\'enregistrement' } }

  await logAudit({ action: 'save', entity_type: 'indicateurs_resultats', details: { publie: formData.get('publie') === 'true' } })
  revalidatePath('/dashboard/indicateurs-resultats')
  revalidatePath('/dashboard/qualiopi')
  revalidatePath('/site/resultats')
  return { success: true }
}
