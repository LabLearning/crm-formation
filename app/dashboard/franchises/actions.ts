'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { sendInvitationEmail } from '@/lib/email'
import { recalcDossierCommission, type CommissionType } from '@/lib/commission'

type Result<T = unknown> = { success: true; data?: T } | { success: false; error: string }

/**
 * Invite un utilisateur franchise (compte avec login, rôle 'franchise').
 * Crée l'auth user + la ligne users (role=franchise, franchise_id) + invitation + email brandé.
 */
export async function inviteFranchiseUserAction(franchiseId: string, emailRaw: string): Promise<Result> {
  const session = await getSession()
  if (!['super_admin', 'gestionnaire'].includes(session.user.role)) {
    return { success: false, error: 'Accès non autorisé' }
  }
  const email = (emailRaw || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Adresse email invalide' }
  }

  const supabase = await createServiceRoleClient()

  // Vérifier que la franchise existe
  const { data: franchise } = await supabase
    .from('apporteurs_affaires')
    .select('id, nom_enseigne, raison_sociale')
    .eq('id', franchiseId)
    .eq('organization_id', session.organization.id)
    .eq('categorie', 'partenaire')
    .single()
  if (!franchise) return { success: false, error: 'Franchise introuvable' }

  // Déjà membre ?
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', session.organization.id)
    .eq('email', email)
    .maybeSingle()
  if (existingUser) return { success: false, error: 'Cet email a déjà un compte dans l\'organisme' }

  // Invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: session.organization.id,
      email,
      role: 'franchise',
      invited_by: session.user.id,
    })
    .select()
    .single()
  if (inviteError) return { success: false, error: 'Erreur lors de la création de l\'invitation' }

  // Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { invitation_token: invitation.token },
  })
  if (authError && !authError.message.includes('already')) {
    console.error('[invite franchise]', authError)
  }
  let authUserId = authData?.user?.id || ''
  if (!authUserId) {
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers()
    authUserId = (allUsers || []).find((u: any) => u.email === email)?.id || ''
  }
  if (!authUserId) return { success: false, error: 'Impossible de créer le compte utilisateur' }

  // Ligne users avec rôle franchise + rattachement franchise
  await supabase.from('users').upsert({
    id: authUserId,
    organization_id: session.organization.id,
    email,
    first_name: '',
    last_name: '',
    role: 'franchise',
    franchise_id: franchiseId,
    status: 'invited',
  }, { onConflict: 'id' })

  // Email brandé
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'
  const inviteUrl = `${appUrl}/setup-account?token=${invitation.token}&uid=${authUserId}`
  const inviterName = `${session.user.first_name} ${session.user.last_name}`.trim() || session.user.email
  await sendInvitationEmail({
    toEmail: email,
    role: 'franchise',
    orgName: session.organization.name,
    orgEmail: 'noreply@lab-learning.fr',
    invitedByName: inviterName,
    inviteUrl,
  })

  await logAudit({ action: 'invite_franchise', entity_type: 'franchise', entity_id: franchiseId, details: { email } })
  revalidatePath(`/dashboard/franchises/${franchiseId}`)
  return { success: true, data: { email } }
}

/** Révoque l'accès d'un utilisateur franchise (status suspended). */
export async function revokeFranchiseUserAction(userId: string): Promise<Result> {
  const session = await getSession()
  if (!['super_admin', 'gestionnaire'].includes(session.user.role)) {
    return { success: false, error: 'Accès non autorisé' }
  }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('users')
    .update({ status: 'suspended' })
    .eq('id', userId)
    .eq('organization_id', session.organization.id)
    .eq('role', 'franchise')
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/franchises')
  return { success: true }
}

/**
 * Met à jour la config commission d'une franchise (mode + taux),
 * puis recalcule toutes les commissions "à venir" de ses dossiers.
 */
export async function updateFranchiseCommissionConfigAction(
  franchiseId: string,
  commissionType: CommissionType,
  taux: number,
): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('apporteurs_affaires')
    .update({ commission_type: commissionType, taux_commission: taux, mode_calcul: 'pourcentage' })
    .eq('id', franchiseId)
    .eq('organization_id', session.organization.id)
    .eq('categorie', 'partenaire')
  if (error) return { success: false, error: error.message }

  // Recalcul des dossiers non figés de cette franchise
  const { data: dossiers } = await supabase
    .from('dossiers_formation')
    .select('id, client_id')
    .eq('organization_id', session.organization.id)
    .or(`franchise_id.eq.${franchiseId},client_id.in.(${await clientIdsOfFranchise(supabase, franchiseId)})`)

  for (const d of dossiers || []) {
    await recalcDossierCommission(supabase, d.id, session.organization.id)
  }

  await logAudit({ action: 'update_commission_config', entity_type: 'franchise', entity_id: franchiseId })
  revalidatePath('/dashboard/franchises')
  revalidatePath(`/dashboard/franchises/${franchiseId}`)
  return { success: true }
}

async function clientIdsOfFranchise(supabase: any, franchiseId: string): Promise<string> {
  const { data } = await supabase.from('clients').select('id').eq('franchise_id', franchiseId)
  const ids = (data || []).map((c: any) => c.id)
  return ids.length > 0 ? ids.join(',') : '00000000-0000-0000-0000-000000000000'
}

/** Recalcule la commission d'un dossier précis (bouton manuel). */
export async function recalcCommissionAction(dossierId: string): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const r = await recalcDossierCommission(supabase, dossierId, session.organization.id)
  revalidatePath('/dashboard/franchises')
  return { success: true, data: r }
}

/** Change le statut d'une commission de dossier (valider / payer / annuler / remettre à venir). */
export async function updateCommissionStatusAction(
  dossierId: string,
  status: 'a_venir' | 'validee' | 'payee' | 'annulee',
): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const updates: Record<string, unknown> = { commission_status: status }
  if (status === 'payee') updates.commission_payee_at = new Date().toISOString()
  if (status === 'a_venir') updates.commission_payee_at = null

  const { error } = await supabase
    .from('dossiers_formation')
    .update(updates)
    .eq('id', dossierId)
    .eq('organization_id', session.organization.id)
  if (error) return { success: false, error: error.message }

  await logAudit({ action: `commission_${status}`, entity_type: 'dossier_formation', entity_id: dossierId })
  revalidatePath('/dashboard/franchises')
  revalidatePath(`/dashboard/dossiers/${dossierId}`)
  return { success: true }
}

/** Rattache (ou détache) un établissement (client) à une franchise. */
export async function linkClientToFranchiseAction(
  clientId: string,
  franchiseId: string | null,
): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('clients')
    .update({ franchise_id: franchiseId })
    .eq('id', clientId)
    .eq('organization_id', session.organization.id)
  if (error) return { success: false, error: error.message }

  // Recalcul des dossiers de ce client
  const { data: dossiers } = await supabase
    .from('dossiers_formation')
    .select('id')
    .eq('client_id', clientId)
    .eq('organization_id', session.organization.id)
  for (const d of dossiers || []) {
    await recalcDossierCommission(supabase, d.id, session.organization.id)
  }

  revalidatePath('/dashboard/franchises')
  return { success: true }
}

/** Marque toutes les commissions validées d'une franchise comme payées (paiement groupé). */
export async function payAllValidatedAction(franchiseId: string): Promise<Result> {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('dossiers_formation')
    .update({ commission_status: 'payee', commission_payee_at: new Date().toISOString() })
    .eq('organization_id', session.organization.id)
    .eq('franchise_id', franchiseId)
    .eq('commission_status', 'validee')
  if (error) return { success: false, error: error.message }

  await logAudit({ action: 'commission_pay_all', entity_type: 'franchise', entity_id: franchiseId })
  revalidatePath('/dashboard/franchises')
  revalidatePath(`/dashboard/franchises/${franchiseId}`)
  return { success: true }
}
