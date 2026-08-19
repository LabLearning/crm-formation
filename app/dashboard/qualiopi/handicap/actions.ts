'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

/** Ajoute ou met à jour un contact du réseau handicap (ind. 26). */
export async function enregistrerContactHandicapAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (['formateur', 'apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()

  const champ = (n: string) => String(formData.get(n) || '').trim() || null
  const id = champ('id')
  const donnees = {
    organization_id: session.organization.id,
    region: champ('region') || 'Occitanie',
    organisme: champ('organisme') || 'RHF Agefiph',
    nom: champ('nom'),
    prenom: champ('prenom'),
    telephone: champ('telephone'),
    email: champ('email'),
    notes: champ('notes'),
    verifie_le: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  }

  const { error } = id
    ? await supabase.from('reseau_handicap').update(donnees).eq('id', id).eq('organization_id', session.organization.id)
    : await supabase.from('reseau_handicap').insert({ ...donnees, created_by: session.user.id })
  if (error) { console.error('[reseau handicap]', error.message); return { success: false, error: 'Enregistrement impossible (migration 136 appliquée ?)' } }

  await logAudit({ action: id ? 'update' : 'create', entity_type: 'reseau_handicap', entity_id: id || 'nouveau' })
  revalidatePath('/dashboard/qualiopi/handicap')
  return { success: true }
}

/** Supprime un contact du réseau. */
export async function supprimerContactHandicapAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  if (['formateur', 'apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('reseau_handicap').delete().eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Suppression impossible' }
  revalidatePath('/dashboard/qualiopi/handicap')
  return { success: true }
}
