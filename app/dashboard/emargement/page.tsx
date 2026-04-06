import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmargementSheet from '@/app/portail/[token]/emargement/EmargementSheet'

export default async function DashboardEmargementPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Trouver la fiche formateur
  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) redirect('/dashboard/formateur-home')

  // Sessions actives du formateur
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut, date_fin, formation:formations(intitule)')
    .eq('formateur_id', formateur.id)
    .in('status', ['confirmee', 'en_cours'])
    .order('date_debut', { ascending: true })

  // Émargements de ces sessions
  const sessionIds = (sessions || []).map(s => s.id)
  let emargements: any[] = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('emargements')
      .select('id, session_id, apprenant_id, date, creneau, est_present, apprenant:apprenants(prenom, nom)')
      .in('session_id', sessionIds)
      .order('date', { ascending: true })
    emargements = data || []
  }

  // Grouper par session puis date
  const bySession = (sessions || []).map(s => {
    const sessionEmargements = emargements.filter(e => e.session_id === s.id)
    const dates = [...new Set(sessionEmargements.map(e => e.date))].sort()
    return {
      ...s,
      dates: dates.map(date => ({
        date,
        emargements: sessionEmargements.filter(e => e.date === date),
      })),
    }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Émargement</h1>
        <p className="text-surface-500 mt-1 text-sm">Feuilles de présence de vos sessions</p>
      </div>

      <EmargementSheet token="__dashboard__" sessions={bySession as any} />
    </div>
  )
}
