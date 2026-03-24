import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AgendaClient } from './AgendaClient'

export default async function AgendaPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Fetch lead interactions (as tasks)
  const { data: interactions } = await supabase
    .from('lead_interactions')
    .select('*, lead:leads(contact_nom, contact_prenom, entreprise)')
    .eq('organization_id', orgId)
    .order('date', { ascending: true })

  // Fetch sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut, date_fin, horaires, lieu, status, formation:formations(intitule)')
    .eq('organization_id', orgId)
    .in('status', ['planifiee', 'confirmee', 'en_cours'])

  return (
    <div className="animate-fade-in">
      <AgendaClient
        interactions={(interactions || []).map((i: any) => ({
          id: i.id,
          type: i.type || 'note',
          titre: i.contenu ? i.contenu.substring(0, 60) : i.type || 'Interaction',
          date: i.date ? i.date.split('T')[0] : '',
          heure: i.date ? i.date.split('T')[1]?.substring(0, 5) || '09:00' : '09:00',
          leadName: i.lead ? `${i.lead.contact_nom || ''} ${i.lead.contact_prenom || ''}`.trim() : '',
          leadEntreprise: i.lead?.entreprise || '',
          done: false,
        }))}
        sessions={(sessions || []).map((s: any) => ({
          id: s.id,
          titre: s.formation?.intitule || s.reference || 'Session',
          dateDebut: s.date_debut,
          dateFin: s.date_fin,
          horaires: s.horaires || '',
          lieu: s.lieu || '',
          status: s.status,
        }))}
      />
    </div>
  )
}
