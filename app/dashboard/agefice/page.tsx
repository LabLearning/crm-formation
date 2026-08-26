import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { AgeficeClient } from './AgeficeClient'

export const dynamic = 'force-dynamic'

/**
 * Dossiers AGEFICE — prise en charge des dirigeants non salariés.
 * Pipeline propre au circuit AGEFICE : constitution → dépôt au Point
 * d'Accueil → accord → formation → remboursement.
 */
export default async function AgeficePage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const [dossiersR, clientsR, formationsR] = await Promise.all([
    supabase.from('dossiers_agefice')
      .select('*, client:client_id(raison_sociale, nom_commercial, nom, prenom), apprenant:apprenant_id(prenom, nom), formation:formation_id(intitule, duree_heures)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.from('clients')
      .select('id, raison_sociale, nom_commercial, financeur_type, type, nom, prenom')
      .eq('organization_id', orgId)
      .order('raison_sociale'),
    supabase.from('formations')
      .select('id, intitule, duree_heures, prix_inter')
      .eq('organization_id', orgId)
      .order('intitule'),
  ])

  const tableAbsente = !!dossiersR.error && /dossiers_agefice/.test(dossiersR.error.message)

  // Les apprenants du client se chargent côté client à la sélection
  return (
    <AgeficeClient
      dossiers={(dossiersR.data || []) as any[]}
      clients={(clientsR.data || []) as any[]}
      formations={(formationsR.data || []) as any[]}
      tableAbsente={tableAbsente}
    />
  )
}
