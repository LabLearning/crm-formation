'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createApporteurSchema } from '@/lib/validations/crm'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/auth'
import type { ActionResult } from '@/lib/types'

export async function createApporteurAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createApporteurSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('apporteurs_affaires')
    .insert({
      organization_id: session.organization.id,
      type: parsed.data.type,
      raison_sociale: parsed.data.raison_sociale || null,
      siret: parsed.data.siret || null,
      nom: parsed.data.nom,
      prenom: parsed.data.prenom || null,
      email: parsed.data.email || null,
      telephone: parsed.data.telephone || null,
      adresse: parsed.data.adresse || null,
      code_postal: parsed.data.code_postal || null,
      ville: parsed.data.ville || null,
      taux_commission: parsed.data.taux_commission,
      commission_fixe: parsed.data.commission_fixe || null,
      mode_calcul: parsed.data.mode_calcul,
      conditions: parsed.data.conditions || null,
      date_debut_contrat: parsed.data.date_debut_contrat || null,
      date_fin_contrat: parsed.data.date_fin_contrat || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erreur lors de la création' }

  await logAudit({ action: 'create', entity_type: 'apporteur', entity_id: data.id })

  // Invitation de l'apporteur à créer son compte (email brandé), la fiche
  // qu'on vient de créer est liée au compte — jamais de fiche en double.
  let warning: string | undefined
  if (parsed.data.email) {
    const r = await inviterCompteApporteur(supabase, session, parsed.data.email, data.id)
    if (!r.success) warning = r.error
  } else {
    warning = "Sans email, l'apporteur ne recevra pas d'invitation à créer son compte."
  }

  revalidatePath('/dashboard/apporteurs')
  return warning ? { success: true, data, warning } : { success: true, data }
}

/**
 * Crée le compte (auth + users role apporteur_affaires) et envoie l'email
 * d'invitation brandé avec le lien de création de mot de passe — en liant la
 * fiche apporteur existante au compte (user_id).
 */
async function inviterCompteApporteur(
  supabase: any,
  session: { user: any; organization: any },
  email: string,
  apporteurId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Compte déjà existant dans l'organisation : on lie la fiche, sans email
    const { data: existingUser } = await supabase.from('users')
      .select('id').eq('organization_id', session.organization.id).eq('email', email).maybeSingle()
    if (existingUser) {
      await supabase.from('apporteurs_affaires').update({ user_id: existingUser.id }).eq('id', apporteurId)
      return { success: false, error: 'Un compte existe déjà pour cet email — fiche liée, aucune invitation envoyée.' }
    }

    // Invitation (réutilise une invitation en cours si elle existe)
    let { data: invitation } = await supabase.from('invitations')
      .select('id, token').eq('organization_id', session.organization.id).eq('email', email)
      .is('accepted_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()
    if (!invitation) {
      const { data: inv, error: eInv } = await supabase.from('invitations').insert({
        organization_id: session.organization.id,
        email, role: 'apporteur_affaires', invited_by: session.user.id,
      }).select('id, token').single()
      if (eInv) return { success: false, error: "Invitation impossible à créer — l'apporteur est enregistré sans compte." }
      invitation = inv
    }

    const { data: authData } = await supabase.auth.admin.createUser({
      email, email_confirm: false, user_metadata: { invitation_token: invitation.token },
    })
    let authUserId = authData?.user?.id || ''
    if (!authUserId) {
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers()
      authUserId = (allUsers || []).find((u: any) => u.email === email)?.id || ''
    }
    if (!authUserId) return { success: false, error: "Compte auth introuvable — invitation non envoyée." }

    await supabase.from('users').upsert({
      id: authUserId,
      organization_id: session.organization.id,
      email, first_name: '', last_name: '',
      role: 'apporteur_affaires', status: 'invited',
    }, { onConflict: 'id' })
    await supabase.from('apporteurs_affaires').update({ user_id: authUserId }).eq('id', apporteurId)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'
    const { sendInvitationEmail } = await import('@/lib/email')
    const r = await sendInvitationEmail({
      toEmail: email,
      role: 'apporteur_affaires',
      orgName: session.organization.name,
      orgEmail: (session.organization as any).email_contact || (session.organization as any).email || '',
      orgLogoUrl: (session.organization as any).logo_url || null,
      qualiopiCertified: (session.organization as any).is_qualiopi !== false,
      invitedByName: `${session.user.first_name} ${session.user.last_name}`.trim() || session.user.email,
      inviteUrl: `${appUrl}/setup-account?token=${invitation.token}&uid=${authUserId}`,
    })
    if (!r.success) return { success: false, error: `Compte créé mais email non envoyé : ${r.error || 'erreur Resend'}` }
    return { success: true }
  } catch (e: any) {
    console.error('[invitation apporteur]', e?.message)
    return { success: false, error: "L'invitation a échoué — l'apporteur est enregistré sans compte." }
  }
}

export async function updateApporteurAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) { raw[key] = value }

  const parsed = createApporteurSchema.safeParse(raw)
  if (!parsed.success) return { success: false, errors: parsed.error.flatten().fieldErrors }

  const { error } = await supabase
    .from('apporteurs_affaires')
    .update({
      type: parsed.data.type,
      raison_sociale: parsed.data.raison_sociale || null,
      siret: parsed.data.siret || null,
      nom: parsed.data.nom,
      prenom: parsed.data.prenom || null,
      email: parsed.data.email || null,
      telephone: parsed.data.telephone || null,
      adresse: parsed.data.adresse || null,
      code_postal: parsed.data.code_postal || null,
      ville: parsed.data.ville || null,
      taux_commission: parsed.data.taux_commission,
      commission_fixe: parsed.data.commission_fixe || null,
      mode_calcul: parsed.data.mode_calcul,
      conditions: parsed.data.conditions || null,
      date_debut_contrat: parsed.data.date_debut_contrat || null,
      date_fin_contrat: parsed.data.date_fin_contrat || null,
    })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur lors de la mise à jour' }

  await logAudit({ action: 'update', entity_type: 'apporteur', entity_id: id })
  revalidatePath('/dashboard/apporteurs')
  return { success: true }
}

export async function toggleApporteurAction(id: string, isActive: boolean): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('apporteurs_affaires')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Erreur' }

  revalidatePath('/dashboard/apporteurs')
  return { success: true }
}

export async function deleteApporteurAction(id: string): Promise<ActionResult> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('apporteurs_affaires')
    .delete()
    .eq('id', id)
    .eq('organization_id', session.organization.id)

  if (error) return { success: false, error: 'Impossible de supprimer (leads liés existants)' }

  await logAudit({ action: 'delete', entity_type: 'apporteur', entity_id: id })
  revalidatePath('/dashboard/apporteurs')
  return { success: true }
}
