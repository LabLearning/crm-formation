import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import TachesBoard from './TachesBoard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tâches — CRM Lab Learning' }

export default async function TachesPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const [tachesRes, usersRes] = await Promise.all([
    supabase
      .from('crm_taches')
      .select(
        `id, titre, description, status, priorite, assignee_id, created_by, due_date,
         position, labels, entity_type, entity_id, entity_label, completed_at, created_at,
         assignee:users!crm_taches_assignee_id_fkey(id, first_name, last_name, email, role),
         author:users!crm_taches_created_by_fkey(id, first_name, last_name, email)`,
      )
      .eq('organization_id', session.organization.id)
      .is('archived_at', null)
      .order('status')
      .order('position'),
    supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('organization_id', session.organization.id)
      .eq('status', 'active')
      .order('first_name'),
  ])

  return (
    <TachesBoard
      taches={(tachesRes.data || []) as any[]}
      users={(usersRes.data || []) as any[]}
      currentUserId={session.user.id}
    />
  )
}
