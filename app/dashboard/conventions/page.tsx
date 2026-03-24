import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ConventionsList } from './ConventionsList'
import type { Convention } from '@/lib/types/dossier'

export default async function ConventionsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: conventions } = await supabase
    .from('conventions')
    .select('*, client:clients(raison_sociale), formation:formations(intitule)')
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, raison_sociale')
    .eq('organization_id', session.organization.id)
    .order('raison_sociale')

  const { data: formations } = await supabase
    .from('formations')
    .select('id, intitule, duree_heures')
    .eq('organization_id', session.organization.id)
    .eq('is_active', true)
    .order('intitule')

  return (
    <div className="animate-fade-in">
      <ConventionsList
        conventions={(conventions || []) as Convention[]}
        clients={clients || []}
        formations={formations || []}
      />
    </div>
  )
}
