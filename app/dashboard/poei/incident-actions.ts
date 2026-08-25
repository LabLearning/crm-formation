'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { ActionResult } from '@/lib/types'

// Un module 'use server' ne peut exporter QUE des fonctions async : exporter
// une constante ici casse l'appel de l'action côté client (spinner infini).
// Les listes de types/gravités vivent dans components/poei/PoeiIncidents.tsx.

/**
 * Résout le formateur du compte connecté, et vérifie qu'il intervient bien sur
 * ce dossier POEI. L'équipe interne n'a pas cette contrainte.
 */
async function autoriser(supabase: any, poeiId: string, orgId: string, user: { id: string; role: string }) {
  if (['super_admin', 'gestionnaire', 'directeur_commercial'].includes(user.role)) {
    return { formateurId: null as string | null }
  }
  if (user.role !== 'formateur') return null

  const { data: f } = await supabase.from('formateurs').select('id').eq('user_id', user.id).maybeSingle()
  if (!f) return null

  const { data: itv } = await supabase
    .from('poei_interventions')
    .select('id')
    .eq('poei_id', poeiId)
    .eq('formateur_id', f.id)
    .eq('organization_id', orgId)
    .limit(1)
  if (!itv || itv.length === 0) return null

  return { formateurId: f.id as string }
}

/** Déclare un incident sur un dossier POEI. */
export async function declarerIncidentPoeiAction(poeiId: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const droit = await autoriser(supabase, poeiId, orgId, session.user as any)
  if (!droit) return { success: false, error: 'Ce dossier ne vous est pas rattaché' }

  const titre = String(formData.get('titre') || '').trim()
  if (!titre) return { success: false, error: 'Le titre est requis' }

  const { data: poei } = await supabase
    .from('poei').select('client_id, session_id').eq('id', poeiId).eq('organization_id', orgId).maybeSingle()

  let franchiseId: string | null = null
  if (poei?.client_id) {
    const { data: c } = await supabase.from('clients').select('franchise_id').eq('id', poei.client_id).maybeSingle()
    franchiseId = c?.franchise_id || null
  }

  const { data, error } = await supabase.from('incidents').insert({
    organization_id: orgId,
    poei_id: poeiId,
    client_id: poei?.client_id || null,
    session_id: poei?.session_id || null,
    franchise_id: franchiseId,
    formateur_id: droit.formateurId,
    apprenant_id: String(formData.get('apprenant_id') || '') || null,
    date_incident: String(formData.get('date_incident') || '') || new Date().toISOString().slice(0, 10),
    type: String(formData.get('type') || 'autre'),
    gravite: String(formData.get('gravite') || 'mineur'),
    titre,
    description: String(formData.get('description') || '') || null,
    mesures_prises: String(formData.get('mesures_prises') || '') || null,
    statut: 'ouvert',
    auteur_id: session.user.id,
  }).select('id').single()

  if (error) {
    console.error('[incident poei]', error)
    if ((error as any).code === '42703') {
      return { success: false, error: 'Colonnes absentes : appliquer la migration 123_incidents_poei.sql' }
    }
    return { success: false, error: "Enregistrement impossible" }
  }

  await logAudit({ action: 'create', entity_type: 'incident', entity_id: data.id, details: { poei: poeiId } })
  revalidatePath(`/dashboard/poei/${poeiId}`)
  revalidatePath('/mon-espace/poei')
  revalidatePath('/dashboard/incidents')
  return { success: true, data }
}

/** Fait avancer un incident : ouvert → en cours → résolu → clos. */
export async function changerStatutIncidentPoeiAction(id: string, statut: string): Promise<ActionResult> {
  const session = await getSession()
  if (!['super_admin', 'gestionnaire', 'directeur_commercial'].includes(session.user.role)) {
    return { success: false, error: 'Seule l’équipe interne peut clore un incident' }
  }
  const supabase = await createServiceRoleClient()

  const { data, error } = await supabase.from('incidents')
    .update({ statut, resolu_at: ['resolu', 'clos'].includes(statut) ? new Date().toISOString() : null })
    .eq('id', id).eq('organization_id', session.organization.id)
    .select('poei_id').single()

  if (error) return { success: false, error: 'Mise à jour impossible' }

  await logAudit({ action: 'update', entity_type: 'incident', entity_id: id, details: { statut } })
  if (data?.poei_id) revalidatePath(`/dashboard/poei/${data.poei_id}`)
  revalidatePath('/mon-espace/poei')
  return { success: true }
}
