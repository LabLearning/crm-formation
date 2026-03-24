import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ManagerClient } from './ManagerClient'

export default async function ManagerPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Leads stats
  const { data: leads } = await supabase
    .from('leads')
    .select('id, status, montant_estime, created_at, converted_at')
    .eq('organization_id', orgId)

  // Sessions stats
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, status, date_debut, date_fin, capacite_max')
    .eq('organization_id', orgId)

  // Devis stats
  const { data: devis } = await supabase
    .from('devis')
    .select('id, status, montant_ht, created_at')
    .eq('organization_id', orgId)

  // Factures stats
  const { data: factures } = await supabase
    .from('factures')
    .select('id, status, montant_ht, montant_ttc, date_emission')
    .eq('organization_id', orgId)

  // Apprenants count
  const { count: apprenantsCount } = await supabase
    .from('apprenants')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  // Inscriptions
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('id, status, session_id')
    .eq('organization_id', orgId)

  // Dossiers
  const { data: dossiers } = await supabase
    .from('dossiers_formation')
    .select('id, status, created_at')
    .eq('organization_id', orgId)

  // Reclamations
  const { count: reclamationsOuvertes } = await supabase
    .from('reclamations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('status', ['recue', 'en_analyse'])

  return (
    <div className="animate-fade-in">
      <ManagerClient
        leads={leads || []}
        sessions={sessions || []}
        devis={devis || []}
        factures={factures || []}
        apprenants={apprenantsCount || 0}
        inscriptions={inscriptions || []}
        dossiers={dossiers || []}
        reclamationsOuvertes={reclamationsOuvertes || 0}
      />
    </div>
  )
}
