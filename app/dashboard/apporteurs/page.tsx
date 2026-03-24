import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ApporteursList } from './ApporteursList'
import type { ApporteurAffaires } from '@/lib/types/crm'

export default async function ApporteursPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: apporteurs } = await supabase
    .from('apporteurs_affaires')
    .select('*')
    .eq('organization_id', session.organization.id)
    .order('nom', { ascending: true })

  return (
    <div className="animate-fade-in">
      <ApporteursList apporteurs={(apporteurs || []) as ApporteurAffaires[]} />
    </div>
  )
}
