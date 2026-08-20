'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import { generateVeilleSuggestions } from '@/lib/ai'
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

/**
 * Agent de veille : l'IA propose des brouillons sur des sujets réels, insérés
 * en statut « brouillon ». Ils ne comptent pour les indicateurs Qualiopi
 * qu'une fois VALIDÉS par un humain (exigence d'exploitation de la veille).
 */
export async function generateVeilleSuggestionsAction(perType = 1): Promise<ActionResult & { data?: { inserted: number } }> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const gen = await generateVeilleSuggestions({ perType })
  if (!gen.success) return { success: false, error: gen.error || 'Échec de la génération IA' }
  if (gen.items.length === 0) return { success: false, error: 'Aucune suggestion générée' }

  const today = new Date().toISOString().split('T')[0]
  const rows = gen.items.map((it) => ({
    organization_id: session.organization.id,
    type: it.type,
    titre: it.titre,
    source: it.source || null,
    date_veille: today,
    resume: it.resume || null,
    impact: it.impact || null,
    action: it.action || null,
    lien: it.lien || null,
    statut: 'brouillon' as const,
    genere_par_ia: true,
    created_by: session.user.id,
  }))

  const { data, error } = await supabase.from('veilles').insert(rows).select('id')
  if (error) { console.error('[veille ia]', error); return { success: false, error: 'Erreur lors de l\'enregistrement des brouillons' } }

  await logAudit({ action: 'ai_generate', entity_type: 'veille', details: { count: data?.length || 0 } })
  revalidatePath('/dashboard/veille')
  return { success: true, data: { inserted: data?.length || 0 } }
}

/** Valide un brouillon de veille → il compte alors pour les indicateurs. */
export async function validateVeilleAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('veilles')
    .update({ statut: 'validee', validee_par: session.user.id, validee_at: new Date().toISOString() })
    .eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Erreur' }
  await logAudit({ action: 'validate', entity_type: 'veille', entity_id: id })
  revalidatePath('/dashboard/veille')
  revalidatePath('/dashboard/qualiopi')
  return { success: true }
}

/** Modifie une entrée de veille (titre, source, résumé, impact, action, lien, date, type). */
export async function updateVeilleAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (['formateur', 'apprenant'].includes(session.user.role)) return { success: false, error: 'Accès non autorisé' }
  const supabase = await createServiceRoleClient()
  const champ = (n: string) => String(formData.get(n) || '').trim() || null
  const { error } = await supabase.from('veilles').update({
    type: champ('type') || 'legale',
    titre: champ('titre'),
    source: champ('source'),
    date_veille: champ('date_veille'),
    resume: champ('resume'),
    impact: champ('impact'),
    action: champ('action'),
    lien: champ('lien'),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('organization_id', session.organization.id)
  if (error) return { success: false, error: 'Modification impossible' }
  await logAudit({ action: 'update', entity_type: 'veille', entity_id: id })
  revalidatePath('/dashboard/veille')
  return { success: true }
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
