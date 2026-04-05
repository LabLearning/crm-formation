import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/permissions'
import { FormationsList } from './FormationsList'
import type { Formation } from '@/lib/types/formation'

export default async function FormationsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: formations } = await supabase
    .from('formations')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  const canEdit = hasPermission(session.permissions, 'formations', 'create')

  return (
    <div className="animate-fade-in">
      <FormationsList formations={(formations || []) as Formation[]} readOnly={!canEdit} />
    </div>
  )
}
