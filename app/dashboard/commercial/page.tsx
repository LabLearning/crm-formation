import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CommercialClient } from './CommercialClient'

export default async function CommercialPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id
  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  const isDirecteur = session.user.role === 'directeur_commercial'
  const isApporteur = session.user.role === 'apporteur_affaires'

  // Leads — directeur sees all, apporteur sees sourced, commercial sees assigned
  let leadsQuery = supabase
    .from('leads')
    .select('id, contact_nom, contact_prenom, entreprise, contact_telephone, contact_email, status, montant_estime, source, created_at, updated_at, assigned_to, assigned_user:users!leads_assigned_to_fkey(first_name, last_name)')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (isApporteur) {
    const { data: apporteurRecord } = await supabase
      .from('apporteurs_affaires')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (apporteurRecord) {
      leadsQuery = leadsQuery.eq('apporteur_id', apporteurRecord.id)
    } else {
      leadsQuery = leadsQuery.eq('apporteur_id', '00000000-0000-0000-0000-000000000000')
    }
  } else if (!isDirecteur) {
    leadsQuery = leadsQuery.eq('assigned_to', userId)
  }
  const { data: leads } = await leadsQuery

  // Interactions today — directeur sees all team, commercial sees own
  let interactionsQuery = supabase
    .from('lead_interactions')
    .select('id, type, subject, content, date, lead_id, user:users(first_name, last_name)')
    .eq('organization_id', orgId)
    .gte('date', today + 'T00:00:00')
    .order('date', { ascending: false })
    .limit(30)
  if (!isDirecteur) {
    interactionsQuery = interactionsQuery.eq('user_id', userId)
  }
  const { data: interactions } = await interactionsQuery

  // Devis — directeur sees all active, commercial sees own
  let devisQuery = supabase
    .from('devis')
    .select('id, numero, status, montant_ht, client:clients(raison_sociale), created_by_user:users!devis_created_by_fkey(first_name, last_name)')
    .eq('organization_id', orgId)
    .in('status', ['brouillon', 'envoye'])
    .order('created_at', { ascending: false })
    .limit(20)
  if (!isDirecteur) {
    devisQuery = devisQuery.eq('created_by', userId)
  }
  const { data: devis } = await devisQuery

  // Données spécifiques apporteur
  let commissions: any[] = []
  let apporteurInfo: any = null
  let apporteurClients: any[] = []
  if (isApporteur) {
    const { data: apporteurRecord } = await supabase
      .from('apporteurs_affaires')
      .select('id, taux_commission, mode_commission')
      .eq('user_id', userId)
      .single()
    apporteurInfo = apporteurRecord
    if (apporteurRecord) {
      const { data: comms } = await supabase
        .from('commissions')
        .select('id, montant, status, date_validation, lead:leads(contact_nom, contact_prenom, entreprise, montant_estime, status)')
        .eq('apporteur_id', apporteurRecord.id)
        .order('date_validation', { ascending: false })
        .limit(30)
      commissions = comms || []

      // Clients liés aux leads de l'apporteur
      const { data: leadsWithClient } = await supabase
        .from('leads')
        .select('client_id')
        .eq('apporteur_id', apporteurRecord.id)
        .not('client_id', 'is', null)
      const clientIds = [...new Set((leadsWithClient || []).map((l: any) => l.client_id).filter(Boolean))]
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, raison_sociale, ville, secteur_activite')
          .in('id', clientIds)
        apporteurClients = clients || []
      }
    }
  }

  return (
    <div className="animate-fade-in">
      <CommercialClient
        userName={session.user.first_name}
        userRole={session.user.role}
        leads={leads || []}
        interactionsToday={interactions || []}
        devisEnCours={devis || []}
        commissions={commissions}
        apporteurInfo={apporteurInfo}
        apporteurClients={apporteurClients}
      />
    </div>
  )
}
