import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CommercialClient } from './CommercialClient'

export default async function CommercialPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id
  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  // My leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, contact_nom, contact_prenom, entreprise, contact_telephone, contact_email, status, montant_estime, source, created_at, updated_at')
    .eq('organization_id', orgId)
    .eq('assigned_to', userId)
    .order('updated_at', { ascending: false })
    .limit(100)

  // My interactions today
  const { data: interactions } = await supabase
    .from('lead_interactions')
    .select('id, type, subject, content, date, lead_id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .gte('date', today + 'T00:00:00')
    .order('date', { ascending: false })
    .limit(20)

  // My devis
  const { data: devis } = await supabase
    .from('devis')
    .select('id, numero, status, montant_ht, client:clients(raison_sociale)')
    .eq('organization_id', orgId)
    .eq('created_by', userId)
    .in('status', ['brouillon', 'envoye'])
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="animate-fade-in">
      <CommercialClient
        userName={session.user.first_name}
        leads={leads || []}
        interactionsToday={interactions || []}
        devisEnCours={devis || []}
      />
    </div>
  )
}
