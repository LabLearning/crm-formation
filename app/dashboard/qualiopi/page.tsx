import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { QualiopiDashboard } from './QualiopiDashboard'
import type { QualiopiIndicateur } from '@/lib/types/qualiopi'

export default async function QualiopiPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: indicateurs } = await supabase
    .from('qualiopi_indicateurs')
    .select('*, preuves:qualiopi_preuves(*)')
    .eq('organization_id', session.organization.id)
    .order('critere', { ascending: true })
    .order('indicateur', { ascending: true })

  return (
    <div className="animate-fade-in">
      <QualiopiDashboard
        indicateurs={(indicateurs || []) as QualiopiIndicateur[]}
        initialized={(indicateurs || []).length > 0}
      />
    </div>
  )
}
