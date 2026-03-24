import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { FacturesList } from './FacturesList'
import type { Facture } from '@/lib/types/facture'

export default async function FacturesPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: factures } = await supabase
    .from('factures')
    .select(`
      *,
      client:clients(raison_sociale, nom, prenom, type, email),
      lignes:facture_lignes(*),
      paiements(*)
    `)
    .eq('organization_id', session.organization.id)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, raison_sociale, nom, prenom, type')
    .eq('organization_id', session.organization.id)
    .order('raison_sociale')

  return (
    <div className="animate-fade-in">
      <FacturesList
        factures={(factures || []) as Facture[]}
        clients={clients || []}
      />
    </div>
  )
}
