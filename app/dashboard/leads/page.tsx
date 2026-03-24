import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { LeadsPipeline } from './LeadsPipeline'
import type { Lead } from '@/lib/types/crm'

export default async function LeadsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_user:users!leads_assigned_to_fkey(first_name, last_name),
      apporteur:apporteurs_affaires(nom, prenom)
    `)
    .eq('organization_id', session.organization.id)
    .order('updated_at', { ascending: false })

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('organization_id', session.organization.id)
    .eq('status', 'active')
    .in('role', ['super_admin', 'gestionnaire', 'commercial'])

  return (
    <div className="animate-fade-in">
      <LeadsPipeline
        leads={(leads || []) as Lead[]}
        users={users || []}
      />
    </div>
  )
}
