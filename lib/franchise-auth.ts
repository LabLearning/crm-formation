import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { User, Organization } from '@/lib/types'

export interface Franchise {
  id: string
  raison_sociale: string | null
  nom_enseigne: string | null
  secteur: string | null
  nombre_points_vente: number | null
  objectif_annuel_ca: number | null
  objectif_annuel_dossiers: number | null
  commission_type: string | null
  taux_commission: number | null
}

export interface FranchiseSession {
  user: User
  organization: Organization
  franchise: Franchise
}

/**
 * Contexte d'un utilisateur franchise (role='franchise', users.franchise_id).
 * Redirige vers /login si non connecté, /dashboard si pas le bon rôle.
 */
export async function getFranchiseSession(): Promise<FranchiseSession> {
  const anonClient = await createServerSupabaseClient()
  const { data: { user: authUser } } = await anonClient.auth.getUser()
  if (!authUser) redirect('/login')

  const supabase = await createServiceRoleClient()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user) redirect('/login')
  if (user.role !== 'franchise') redirect('/dashboard')
  if (!user.franchise_id) redirect('/login')

  const [{ data: organization }, { data: franchise }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', user.organization_id).single(),
    supabase
      .from('apporteurs_affaires')
      .select('id, raison_sociale, nom_enseigne, secteur, nombre_points_vente, objectif_annuel_ca, objectif_annuel_dossiers, commission_type, taux_commission')
      .eq('id', user.franchise_id)
      .single(),
  ])

  if (!organization || !franchise) redirect('/login')

  return {
    user: user as User,
    organization: organization as Organization,
    franchise: franchise as Franchise,
  }
}

export function franchiseDisplayName(f: Franchise): string {
  return f.nom_enseigne || f.raison_sociale || 'Ma franchise'
}
