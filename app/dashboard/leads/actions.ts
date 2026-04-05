'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createLeadSchema, updateLeadStatusSchema, createInteractionSchema } from '@/lib/validations/crm'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createLeadAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key !== 'formation_id') raw[key] = value
  }

  // Pour l'apporteur, forcer la source
  if (session.user.role === 'apporteur_affaires') {
    raw.source = 'apporteur_affaires'
  }

  const parsed = createLeadSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()

  // Si c'est un apporteur, auto-lier le lead à sa fiche
  let apporteurId = parsed.data.apporteur_id || null
  if (session.user.role === 'apporteur_affaires' && !apporteurId) {
    const { data: apporteurRecord } = await supabase
      .from('apporteurs_affaires')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    apporteurId = apporteurRecord?.id || null
  }

  const insertData = {
    ...parsed.data,
    organization_id: session.organization.id,
    contact_email: parsed.data.contact_email || null,
    montant_estime: parsed.data.montant_estime || null,
    nombre_stagiaires: parsed.data.nombre_stagiaires || null,
    date_souhaitee: parsed.data.date_souhaitee || null,
    apporteur_id: apporteurId,
    assigned_to: parsed.data.assigned_to || (session.user.role === 'apporteur_affaires' ? null : session.user.id),
    source: session.user.role === 'apporteur_affaires' ? 'apporteur_affaires' : (parsed.data.source || 'autre'),
    status: 'nouveau' as const,
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[Create Lead]', error)
    return { success: false, error: 'Erreur lors de la création du lead' }
  }

  await logAudit({
    action: 'create',
    entity_type: 'lead',
    entity_id: data.id,
    details: { contact: parsed.data.contact_nom, entreprise: parsed.data.entreprise },
  })

  // Si soumis par un apporteur → notifier le(s) directeur(s) commercial(aux)
  if (session.user.role === 'apporteur_affaires') {
    const { sendNewLeadFromApporteurEmail, createNotification } = await import('@/lib/email')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'

    // Trouver les directeurs commerciaux (et super_admin en fallback)
    const { data: dircos } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('organization_id', session.organization.id)
      .eq('status', 'active')
      .in('role', ['directeur_commercial', 'super_admin'])

    const apporteurName = `${session.user.first_name} ${session.user.last_name}`.trim()

    for (const dirco of (dircos || [])) {
      // Email
      await sendNewLeadFromApporteurEmail({
        adminEmail: dirco.email,
        orgName: session.organization.name,
        apporteurName,
        apporteurEmail: session.user.email,
        lead: {
          contact_prenom: parsed.data.contact_prenom || '',
          contact_nom: parsed.data.contact_nom || '',
          contact_email: parsed.data.contact_email || '',
          contact_telephone: parsed.data.contact_telephone || '',
          entreprise: parsed.data.entreprise || '',
          formation_souhaitee: parsed.data.formation_souhaitee || '',
          nombre_stagiaires: String(parsed.data.nombre_stagiaires || ''),
          date_souhaitee: parsed.data.date_souhaitee || '',
          commentaire: parsed.data.commentaire || '',
        },
        dashboardUrl: `${appUrl}/dashboard/leads`,
      })

      // Notification in-app
      await createNotification({
        organizationId: session.organization.id,
        userId: dirco.id,
        titre: 'Nouveau lead apporteur',
        message: `${apporteurName} a soumis un lead : ${parsed.data.contact_prenom || ''} ${parsed.data.contact_nom} — ${parsed.data.entreprise || 'Pas d\'entreprise'}`,
        type: 'lead',
        lienUrl: '/dashboard/leads',
        lienLabel: 'Voir le lead',
        entityType: 'lead',
        entityId: data.id,
      })
    }

    // Assigner le lead au premier directeur commercial trouvé
    const dirco = (dircos || []).find(d => d.email !== session.user.email)
    if (dirco) {
      await supabase.from('leads').update({ assigned_to: dirco.id }).eq('id', data.id)
    }
  }

  revalidatePath('/dashboard/leads')
  return { success: true, data }
}

export async function updateLeadAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value
  }

  const parsed = createLeadSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const updateData = {
    ...parsed.data,
    contact_email: parsed.data.contact_email || null,
    montant_estime: parsed.data.montant_estime || null,
    nombre_stagiaires: parsed.data.nombre_stagiaires || null,
    date_souhaitee: parsed.data.date_souhaitee || null,
    apporteur_id: parsed.data.apporteur_id || null,
    assigned_to: parsed.data.assigned_to || null,
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la mise à jour' }
  }

  await logAudit({ action: 'update', entity_type: 'lead', entity_id: id })
  revalidatePath('/dashboard/leads')
  return { success: true }
}

export async function updateLeadStatusAction(
  id: string,
  status: string,
  lostReason?: string
): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const parsed = updateLeadStatusSchema.safeParse({ id, status, lost_reason: lostReason })
  if (!parsed.success) {
    return { success: false, error: 'Données invalides' }
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'perdu' && lostReason) {
    updateData.lost_reason = lostReason
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors du changement de statut' }
  }

  // ── AUTO: Lead gagné → créer dossier Suivi Admin ──
  if (parsed.data.status === 'gagne') {
    try {
      const { data: leadData } = await supabase
        .from('leads')
        .select('contact_nom, contact_prenom, entreprise, contact_telephone, montant_estime, nombre_stagiaires, formation_souhaitee')
        .eq('id', id)
        .single()

      if (leadData) {
        // Create dossier_formation entry
        await supabase.from('dossiers_formation').insert({
          organization_id: session.organization.id,
          status: 'en_creation',
          notes: [
            'Dossier cree automatiquement depuis le lead: ' + (leadData.contact_prenom || '') + ' ' + leadData.contact_nom,
            leadData.entreprise ? 'Entreprise: ' + leadData.entreprise : '',
            leadData.contact_telephone ? 'Tel: ' + leadData.contact_telephone : '',
            leadData.montant_estime ? 'Montant: ' + leadData.montant_estime + ' EUR' : '',
            leadData.nombre_stagiaires ? 'Stagiaires: ' + leadData.nombre_stagiaires : '',
            leadData.formation_souhaitee ? 'Formation: ' + leadData.formation_souhaitee : '',
          ].filter(Boolean).join('\n'),
          created_by: session.user.id,
        })
      }
    } catch (e) {
      console.error('[Auto dossier]', e)
    }
  }

  await logAudit({
    action: 'update_status',
    entity_type: 'lead',
    entity_id: id,
    details: { new_status: status },
  })

  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard/dossiers')
  return { success: true }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) {
    return { success: false, error: 'Erreur lors de la suppression' }
  }

  await logAudit({ action: 'delete', entity_type: 'lead', entity_id: id })
  revalidatePath('/dashboard/leads')
  return { success: true }
}

export async function convertLeadToClientAction(leadId: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Fetch lead
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('organization_id', session.organization.id)
    .single()

  if (fetchError || !lead) {
    return { success: false, error: 'Lead introuvable' }
  }

  // Create client from lead
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      organization_id: session.organization.id,
      type: 'entreprise',
      raison_sociale: lead.entreprise,
      siret: lead.siret,
      telephone: lead.contact_telephone,
      email: lead.contact_email,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (clientError) {
    return { success: false, error: 'Erreur lors de la création du client' }
  }

  // Create contact from lead info
  await supabase.from('contacts').insert({
    organization_id: session.organization.id,
    client_id: client.id,
    prenom: lead.contact_prenom || '',
    nom: lead.contact_nom,
    email: lead.contact_email,
    telephone: lead.contact_telephone,
    poste: lead.contact_poste,
    est_principal: true,
  })

  // Update lead as converted
  await supabase
    .from('leads')
    .update({
      status: 'gagne',
      converted_client_id: client.id,
      converted_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  await logAudit({
    action: 'convert',
    entity_type: 'lead',
    entity_id: leadId,
    details: { client_id: client.id },
  })

  revalidatePath('/dashboard/leads')
  revalidatePath('/dashboard/clients')
  return { success: true, data: { client_id: client.id } }
}

export async function addInteractionAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value
  }

  const parsed = createInteractionSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()

  const { error } = await supabase.from('lead_interactions').insert({
    organization_id: session.organization.id,
    lead_id: parsed.data.lead_id,
    type: parsed.data.type,
    subject: parsed.data.subject || null,
    content: parsed.data.content,
    duration_minutes: parsed.data.duration_minutes || null,
    user_id: session.user.id,
  })

  if (error) {
    return { success: false, error: 'Erreur lors de l\'ajout de l\'interaction' }
  }

  revalidatePath('/dashboard/leads')
  return { success: true }
}

export async function bulkImportLeadsAction(leads: Array<{
  contact_nom: string; contact_prenom?: string; contact_email?: string
  contact_telephone?: string; entreprise?: string; source?: string
}>): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const toInsert = leads.map(l => ({
    organization_id: session.organization.id,
    contact_nom: l.contact_nom,
    contact_prenom: l.contact_prenom || null,
    contact_email: l.contact_email || null,
    contact_telephone: l.contact_telephone || null,
    entreprise: l.entreprise || null,
    source: (l.source || 'autre') as 'autre',
    status: 'nouveau' as const,
    assigned_to: session.user.id,
    score: 0,
    tags: [] as string[],
  }))

  const { data, error } = await supabase.from('leads').insert(toInsert).select()

  if (error) {
    return { success: false, error: 'Erreur lors de l\'import : ' + error.message }
  }

  await logAudit({
    action: 'bulk_import',
    entity_type: 'lead',
    entity_id: 'bulk',
    details: { count: toInsert.length },
  })

  revalidatePath('/dashboard/leads')
  return { success: true, data: { imported: data?.length || 0 } }
}
