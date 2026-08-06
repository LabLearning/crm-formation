'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export interface AuditPayload {
  id?: string | null
  lead_id?: string | null
  client_id?: string | null
  etablissement: string
  etab_type?: string
  convention?: string
  effectif?: string | number
  commercial_nom?: string
  axes: Record<string, { total: string | number; formed: string | number }>
  duerp_etat?: string
  score: number
  couverture: number
  opco?: string | null
  compte_actif?: string | null
  engagement?: string | null
  contact_nom?: string
  contact_email?: string
  contact_telephone?: string
  projection_periode?: string
  rdv_date?: string
  rdv_heure?: string
  notes?: string
}

const num = (v: any) => {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : null
}
const txt = (v: any) => {
  const s = String(v ?? '').trim()
  return s || null
}

/** Enregistre (ou met à jour) un audit de conformité. */
export async function saveAuditAction(payload: AuditPayload): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const etablissement = String(payload.etablissement || '').trim()
  if (!etablissement) return { success: false, error: "Le nom de l'établissement est requis" }

  const row = {
    organization_id: session.organization.id,
    lead_id: payload.lead_id || null,
    client_id: payload.client_id || null,
    etablissement,
    etab_type: txt(payload.etab_type),
    convention: txt(payload.convention),
    effectif: num(payload.effectif),
    commercial_nom: txt(payload.commercial_nom),
    axes: payload.axes || {},
    duerp_etat: txt(payload.duerp_etat),
    score: payload.score ?? null,
    couverture: payload.couverture ?? null,
    opco: txt(payload.opco),
    compte_actif: txt(payload.compte_actif),
    engagement: txt(payload.engagement),
    contact_nom: txt(payload.contact_nom),
    contact_email: txt(payload.contact_email),
    contact_telephone: txt(payload.contact_telephone),
    projection_periode: txt(payload.projection_periode),
    rdv_date: txt(payload.rdv_date),
    rdv_heure: txt(payload.rdv_heure),
    notes: txt(payload.notes),
    updated_at: new Date().toISOString(),
  }

  let data: any, error: any
  if (payload.id) {
    ;({ data, error } = await supabase
      .from('audits_conformite')
      .update(row)
      .eq('id', payload.id)
      .eq('organization_id', session.organization.id)
      .select()
      .single())
  } else {
    ;({ data, error } = await supabase
      .from('audits_conformite')
      .insert({ ...row, created_by: session.user.id })
      .select()
      .single())
  }

  if (error) {
    console.error('[save audit conformite]', error)
    if ((error as any).code === '42P01') {
      return { success: false, error: 'Table absente : appliquer la migration 113_audits_conformite.sql' }
    }
    return { success: false, error: "Erreur lors de l'enregistrement" }
  }

  await logAudit({
    action: payload.id ? 'update' : 'create',
    entity_type: 'audit_conformite',
    entity_id: data.id,
    details: { etablissement, score: payload.score },
  })
  revalidatePath('/dashboard/audit')
  if (payload.lead_id) revalidatePath(`/dashboard/leads`)
  return { success: true, data }
}

export async function deleteAuditAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('audits_conformite')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    console.error('[delete audit conformite]', error)
    return { success: false, error: 'Suppression impossible' }
  }
  await logAudit({ action: 'delete', entity_type: 'audit_conformite', entity_id: id })
  revalidatePath('/dashboard/audit')
  return { success: true }
}

/** Crée un lead à partir d'un audit réalisé chez un prospect non encore en base. */
export async function creerLeadDepuisAuditAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: audit, error: e1 } = await supabase
    .from('audits_conformite')
    .select('*')
    .eq('id', id)
    .eq('organization_id', session.organization.id)
    .single()

  if (e1 || !audit) return { success: false, error: 'Audit introuvable' }
  if (audit.lead_id) return { success: false, error: 'Cet audit est déjà rattaché à un lead' }

  const parts = String(audit.contact_nom || '').trim().split(/\s+/)
  const prenom = parts.length > 1 ? parts[0] : null
  const nom = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || audit.etablissement

  const manquants = Object.entries(audit.axes || {})
    .filter(([, v]: any) => (parseInt(v?.total) || 0) > (parseInt(v?.formed) || 0))
    .map(([k]) => k.toUpperCase())

  const { data: lead, error: e2 } = await supabase
    .from('leads')
    .insert({
      organization_id: session.organization.id,
      entreprise: audit.etablissement,
      contact_nom: nom,
      contact_prenom: prenom,
      contact_email: audit.contact_email,
      contact_telephone: audit.contact_telephone,
      source: 'audit_conformite',
      status: 'nouveau',
      nombre_stagiaires: audit.effectif,
      convention_collective: audit.convention,
      formation_souhaitee: manquants.join(', ') || null,
      commentaire: `Audit de conformité du ${new Date(audit.created_at).toLocaleDateString('fr-FR')} — score ${audit.score}/5 (couverture ${audit.couverture} %).`,
      assigned_to: session.user.id,
    })
    .select()
    .single()

  if (e2) {
    console.error('[creer lead depuis audit]', e2)
    return { success: false, error: 'Création du lead impossible' }
  }

  await supabase
    .from('audits_conformite')
    .update({ lead_id: lead.id, statut: 'converti' })
    .eq('id', id)

  await logAudit({ action: 'create', entity_type: 'lead', entity_id: lead.id, details: { depuis: 'audit_conformite' } })
  revalidatePath('/dashboard/audit')
  revalidatePath('/dashboard/leads')
  return { success: true, data: lead }
}
