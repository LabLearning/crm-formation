import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { VivierList } from './VivierList'

export const dynamic = 'force-dynamic'

export default async function VivierPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const [{ data: candidats }, { data: clients }, { data: poeis }] = await Promise.all([
    supabase
      .from('candidats_vivier')
      .select('*, client:clients(raison_sociale), poei:poei(numero, formation:formations(intitule))')
      .eq('organization_id', session.organization.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, raison_sociale')
      .eq('organization_id', session.organization.id)
      .order('raison_sociale', { ascending: true }),
    supabase
      .from('poei')
      .select('id, numero, formation:formations(intitule), client:clients(raison_sociale)')
      .eq('organization_id', session.organization.id)
      .order('created_at', { ascending: false }),
  ])

  return <VivierList candidats={(candidats || []) as any[]} clients={(clients || []) as any[]} poeis={(poeis || []) as any[]} />
}
