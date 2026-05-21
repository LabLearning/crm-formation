import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import IncidentsClient from './IncidentsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Incidents — CRM Lab Learning' }

export default async function IncidentsPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  const [incidentsRes, clientsRes, sessionsRes] = await Promise.all([
    supabase
      .from('incidents')
      .select(`
        id, date_incident, type, gravite, titre, description, mesures_prises, statut, created_at,
        client:clients(id, raison_sociale),
        franchise:franchises(id, nom),
        session:sessions(id, reference),
        auteur:users(first_name, last_name)
      `)
      .eq('organization_id', orgId)
      .order('date_incident', { ascending: false })
      .limit(300),
    supabase.from('clients').select('id, raison_sociale, franchise_id').eq('organization_id', orgId).order('raison_sociale'),
    supabase.from('sessions').select('id, reference, formation:formation_id(intitule)').eq('organization_id', orgId).order('date_debut', { ascending: false }).limit(200),
  ])

  return (
    <IncidentsClient
      incidents={(incidentsRes.data || []) as any[]}
      clients={(clientsRes.data || []) as any[]}
      sessions={(sessionsRes.data || []) as any[]}
    />
  )
}
