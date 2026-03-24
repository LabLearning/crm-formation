import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { User, Organization, Permission } from '@/lib/types'

export interface SessionContext {
  user: User
  organization: Organization
  permissions: Permission[]
}

export async function getSession(): Promise<SessionContext> {
  // Anon client for auth (needs cookies)
  const anonClient = await createServerSupabaseClient()
  const { data: { user: authUser } } = await anonClient.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Service role client for data (bypasses RLS)
  const supabase = await createServiceRoleClient()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user) {
    redirect('/login')
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', user.organization_id)
    .single()

  if (!organization) {
    redirect('/login')
  }

  const { data: permissions } = await supabase
    .from('permissions')
    .select('*')
    .eq('organization_id', user.organization_id)
    .eq('role', user.role)

  return {
    user: user as User,
    organization: organization as Organization,
    permissions: (permissions || []) as Permission[],
  }
}

export async function getOptionalSession() {
  const anonClient = await createServerSupabaseClient()
  const { data: { user: authUser } } = await anonClient.auth.getUser()

  if (!authUser) return null

  const supabase = await createServiceRoleClient()
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  return user as User | null
}
