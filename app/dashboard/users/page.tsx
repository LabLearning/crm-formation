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

  return (
    <div className="animate-fade-in">
      <UsersList
        users={(users || []) as User[]}
        currentUserId={session.user.id}
        isAdmin={checkAdmin(session.user.role)}
        isSuperAdmin={checkSuperAdmin(session.user.role)}
      />
    </div>
  )
}
