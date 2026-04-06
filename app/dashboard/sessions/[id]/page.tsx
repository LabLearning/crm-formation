import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SessionDetailClient } from './SessionDetailClient'

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const today = new Date().toISOString().split('T')[0]

  // Session avec formation et formateur
  const { data: sessionData } = await supabase
    .from('sessions')
    .select('*, formation:formations(intitule, reference, duree_heures, categorie, modalite), formateur:formateurs(id, prenom, nom, email, telephone, user_id)')
    .eq('id', params.id)
    .eq('organization_id', session.organization.id)
    .single()

  if (!sessionData) redirect('/dashboard/sessions')

  // Inscriptions avec apprenants
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('id, status, date_inscription, apprenant:apprenants(id, prenom, nom, email, entreprise, telephone)')
    .eq('session_id', params.id)
    .not('status', 'in', '("annule","abandonne")')
    .order('date_inscription', { ascending: true })

  // Émargements
  const { data: emargements } = await supabase
    .from('emargements')
    .select('id, apprenant_id, date, creneau, est_present')
    .eq('session_id', params.id)
    .order('date', { ascending: true })

  // Pointages du formateur
  const { data: pointages } = await supabase
    .from('pointages_formateur')
    .select('id, date, heure_arrivee, heure_depart, photo_arrivee_url, photo_depart_url')
    .eq('session_id', params.id)
    .order('date', { ascending: true })

  // Rapport de session
  const formateurId = (sessionData.formateur as any)?.id
  let rapport = null
  if (formateurId) {
    const { data } = await supabase
      .from('rapports_session')
      .select('id, status, submitted_at')
      .eq('session_id', params.id)
      .eq('formateur_id', formateurId)
      .single()
    rapport = data
  }

  // Est-ce que le user est le formateur de cette session ?
  const isFormateur = session.user.role === 'formateur' && (sessionData.formateur as any)?.user_id === session.user.id

  return (
    <div className="animate-fade-in">
      <SessionDetailClient
        session={sessionData as any}
        inscriptions={(inscriptions || []) as any[]}
        emargements={(emargements || []) as any[]}
        pointages={(pointages || []) as any[]}
        rapport={rapport as any}
        isFormateur={isFormateur}
        userRole={session.user.role}
      />
    </div>
  )
}
