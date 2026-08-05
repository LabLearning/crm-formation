'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

const TYPES = ['legale', 'metier', 'pedagogique', 'handicap']

export async function createVeilleAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const type = String(formData.get('type') || '')
  const titre = String(formData.get('titre') || '').trim()
  if (!TYPES.includes(type)) return { success: false, error: 'Type de veille invalide' }
  if (!titre) return { success: false, error: 'Titre requis' }

  const { data, error } = await supabase.from('veilles').insert({
    organization_id: session.organization.id,
    type,
    titre,
    source: String(formData.get('source') || '') || null,
    date_veille: String(formData.get('date_veille') || '') || new Date().toISOString().split('T')[0],
    resume: String(formData.get('resume') || '') || null,
    impact: String(formData.get('impact') || '') || null,
    action: String(formData.get('action') || '') || null,
    lien: String(formData.get('lien') || '') || null,
    created_by: session.user.id,
  }).select().single()

  if (error) { console.error('[create veille]', error); return { success: false, error: 'Erreur lors de l\'enregistrement' } }

  await logAudit({ action: 'create', entity_type: 'veille', entity_id: data.id, details: { type } })
  revalidatePath('/dashboard/veille')
  revalidatePath('/dashboard/qualiopi')
  return { success: true, data }
}

export async function deleteVeilleAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('veilles').delete()
    .eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Erreur' }
  await logAudit({ action: 'delete', entity_type: 'veille', entity_id: id })
  revalidatePath('/dashboard/veille')
  revalidatePath('/dashboard/qualiopi')
  return { success: true }
}
