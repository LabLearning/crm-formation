'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function toggleDisponibiliteAction(date: string, type: 'disponible' | 'indisponible' | 'sous_reserve' | 'supprimer'): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) return { success: false, error: 'Fiche formateur introuvable' }

  if (type === 'supprimer') {
    await supabase
      .from('formateur_disponibilites')
      .delete()
      .eq('formateur_id', formateur.id)
      .eq('date', date)
  } else {
    // Upsert
    const { data: existing } = await supabase
      .from('formateur_disponibilites')
      .select('id')
      .eq('formateur_id', formateur.id)
      .eq('date', date)
      .eq('creneau', 'journee')
      .single()

    if (existing) {
      await supabase
        .from('formateur_disponibilites')
        .update({ type })
        .eq('id', existing.id)
    } else {
      await supabase.from('formateur_disponibilites').insert({
        organization_id: session.organization.id,
        formateur_id: formateur.id,
        date,
        type,
        creneau: 'journee',
      })
    }
  }

  revalidatePath('/dashboard/formateur-home/planning')
  return { success: true }
}
