import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PaiementsList } from './PaiementsList'
import type { Paiement } from '@/lib/types/facture'

export default async function PaiementsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: paiements } = await supabase
    .from('paiements')
    .select(`
      *,
      facture:factures(numero, montant_ttc, client:clients(raison_sociale))
    `)
    .eq('organization_id', session.organization.id)
    .order('date_paiement', { ascending: false })

  return (
    <div className="animate-fade-in">
      <PaiementsList paiements={(paiements || []) as Paiement[]} />
    </div>
  )
}
