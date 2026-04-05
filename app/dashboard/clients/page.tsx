import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ClientsList } from './ClientsList'
import type { Client } from '@/lib/types/crm'

export default async function ClientsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  let clientsQuery = supabase
    .from('clients')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  // Apporteur d'affaires : uniquement les clients liés à ses leads
  if (session.user.role === 'apporteur_affaires') {
    const { data: apporteurRecord } = await supabase
      .from('apporteurs_affaires')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    if (apporteurRecord) {
      const { data: leadsWithClient } = await supabase
        .from('leads')
        .select('client_id')
        .eq('apporteur_id', apporteurRecord.id)
        .not('client_id', 'is', null)
      const clientIds = (leadsWithClient || []).map((l: any) => l.client_id).filter(Boolean)
      if (clientIds.length > 0) {
        clientsQuery = clientsQuery.in('id', clientIds)
      } else {
        clientsQuery = clientsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }
  }

  const { data: clients } = await clientsQuery

  return (
    <div className="animate-fade-in">
      <ClientsList clients={(clients || []) as Client[]} />
    </div>
  )
}
