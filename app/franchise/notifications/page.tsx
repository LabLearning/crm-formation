import { getFranchiseSession } from '@/lib/franchise-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NotificationsClient from '@/app/dashboard/notifications/NotificationsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notifications — Espace franchise' }

export default async function FranchiseNotificationsPage() {
  const { user, organization } = await getFranchiseSession()
  const supabase = await createServiceRoleClient()

  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(200)

  return <NotificationsClient initial={(notifs || []) as any[]} userId={user.id} />
}
