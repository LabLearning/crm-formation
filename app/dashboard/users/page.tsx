import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isAdmin as checkAdmin, isSuperAdmin as checkSuperAdmin } from '@/lib/permissions'
import { UsersList } from './UsersList'
import type { User } from '@/lib/types'

export default async function UsersPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: true })

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', session.organization.id)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  // Franchises (apporteurs partenaires) pour rattacher un compte franchise
  const { data: franchises } = await supabase
    .from('apporteurs_affaires')
    .select('id, nom_enseigne, raison_sociale')
    .eq('organization_id', session.organization.id)
    .eq('categorie', 'partenaire')
    .eq('is_active', true)
    .order('nom_enseigne', { nullsFirst: false })

  return (
    <div className="animate-fade-in">
      <UsersList
        users={(users || []) as User[]}
        invitations={(invitations || []) as any[]}
        franchises={(franchises || []) as any[]}
        currentUserId={session.user.id}
        isAdmin={checkAdmin(session.user.role)}
        isSuperAdmin={checkSuperAdmin(session.user.role)}
      />
    </div>
  )
}
