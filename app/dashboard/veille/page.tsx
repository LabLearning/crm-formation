import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { VeilleList } from './VeilleList'

export const dynamic = 'force-dynamic'

export interface VeilleRow {
  id: string
  type: 'legale' | 'metier' | 'pedagogique' | 'handicap'
  titre: string
  source: string | null
  date_veille: string
  resume: string | null
  impact: string | null
  action: string | null
  lien: string | null
  created_at: string
}

export default async function VeillePage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data } = await supabase
    .from('veilles')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('date_veille', { ascending: false })

  return (
    <div className="animate-fade-in">
      <VeilleList veilles={(data || []) as VeilleRow[]} />
    </div>
  )
}
