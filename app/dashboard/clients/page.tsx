import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ClientsList } from './ClientsList'
import type { Client } from '@/lib/types/crm'

export default async function ClientsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in">
      <ClientsList clients={(clients || []) as Client[]} />
    </div>
  )
}
