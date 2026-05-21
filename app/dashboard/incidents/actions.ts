'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type Result<T = unknown> = { success: true; data?: T } | { success: false; error: string }

export async function createIncidentAction(formData: FormData): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const titre = (formData.get('titre') as string || '').trim()
  if (!titre) return { success: false, error: 'Le titre est requis' }

  const clientId = (formData.get('client_id') as string) || null
  const sessionId = (formData.get('session_id') as string) || null

  // Déduire la franchise depuis le client
  let franchiseId: string | null = null
  if (clientId) {
    const { data: client } = await supabase
      .from('clients').select('franchise_id').eq('id', clientId).eq('organization_id', session.organization.id).single()
    franchiseId = client?.franchise_id || null
  }

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      organization_id: session.organization.id,
      client_id: clientId,
      session_id: sessionId,
      franchise_id: franchiseId,
      date_incident: (formData.get('date_incident') as string) || new Date().toISOString().split('T')[0],
      type: (formData.get('type') as string) || 'autre',
      gravite: (formData.get('gravite') as string) || 'mineur',
      titre,
      description: (formData.get('description') as string) || null,
      mesures_prises: (formData.get('mesures_prises') as string) || null,
      statut: (formData.get('statut') as string) || 'ouvert',
      auteur_id: session.user.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Notifier les comptes franchise rattachés
  if (franchiseId) {
    try {
      const { createNotifications } = await import('@/lib/email')
      const { data: fUsers } = await supabase
        .from('users').select('id').eq('franchise_id', franchiseId).eq('role', 'franchise').eq('status', 'active')
      if (fUsers && fUsers.length > 0) {
        await createNotifications(fUsers.map((u: any) => ({
          organizationId: session.organization.id,
          userId: u.id,
          titre: 'Nouveau rapport d\'incident',
          message: `Un incident a été signalé : ${titre}`,
          type: 'warning',
          lienUrl: '/franchise/incidents',
          lienLabel: 'Voir l\'incident',
          entityType: 'incident',
          entityId: data.id,
        })))
      }
    } catch (e) { console.error('[incident notify]', e) }
  }

  await logAudit({ action: 'create', entity_type: 'incident', entity_id: data.id })
  revalidatePath('/dashboard/incidents')
  return { success: true, data }
}

export async function updateIncidentAction(id: string, formData: FormData): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const updates: Record<string, unknown> = {}
  for (const k of ['titre', 'description', 'mesures_prises', 'type', 'gravite', 'date_incident']) {
    if (formData.has(k)) updates[k] = (formData.get(k) as string) || null
  }
  if (formData.has('statut')) {
    const statut = formData.get('statut') as string
    updates.statut = statut
    updates.resolu_at = (statut === 'resolu' || statut === 'clos') ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', session.organization.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/incidents')
  return { success: true }
}

export async function updateIncidentStatutAction(id: string, statut: string): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('incidents')
    .update({ statut, resolu_at: (statut === 'resolu' || statut === 'clos') ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('organization_id', session.organization.id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/incidents')
  return { success: true }
}

export async function deleteIncidentAction(id: string): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/incidents')
  return { success: true }
}
