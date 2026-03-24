import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { DossiersList } from './DossiersList'
import type { DossierFormation } from '@/lib/types/dossier'

export default async function DossiersPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: dossiers } = await supabase
    .from('dossiers_formation')
    .select(`
      *,
      client:clients(raison_sociale, type),
      formation:formations(intitule, reference),
      session:sessions(reference, date_debut, date_fin),
      checklist:dossier_checklist(*),
      timeline:dossier_timeline(*, user:users(first_name, last_name))
    `)
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, raison_sociale')
    .eq('organization_id', session.organization.id)
    .order('raison_sociale')

  const { data: formations } = await supabase
    .from('formations')
    .select('id, intitule, reference')
    .eq('organization_id', session.organization.id)
    .eq('is_active', true)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut')
    .eq('organization_id', session.organization.id)
    .in('status', ['planifiee', 'confirmee', 'en_cours'])

  return (
    <div className="animate-fade-in">
      <DossiersList
        dossiers={(dossiers || []) as DossierFormation[]}
        clients={clients || []}
        formations={formations || []}
        sessions={sessions || []}
      />
    </div>
  )
}
