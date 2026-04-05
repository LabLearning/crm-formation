import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmargementSheet from './EmargementSheet'

export default async function PortalEmargementPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()

  // Active sessions for this formateur
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, date_debut, date_fin, formation:formations(intitule)')
    .eq('formateur_id', context.formateur.id)
    .in('status', ['confirmee', 'en_cours'])
    .order('date_debut', { ascending: true })

  // Emargements for these sessions
  const sessionIds = (sessions || []).map((s) => s.id)
  let emargements: any[] = []
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('emargements')
      .select('id, session_id, apprenant_id, date, creneau, est_present, apprenant:apprenants(prenom, nom)')
      .in('session_id', sessionIds)
      .order('date', { ascending: true })
    emargements = data || []
  }

  // Group by session then date
  const bySession = (sessions || []).map((s) => {
    const sessionEmargements = emargements.filter((e) => e.session_id === s.id)
    const dates = [...new Set(sessionEmargements.map((e) => e.date))].sort()
    return {
      ...s,
      dates: dates.map((date) => ({
        date,
        emargements: sessionEmargements.filter((e) => e.date === date),
      })),
    }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-heading font-bold text-surface-900 tracking-heading">Émargement</h1>
        <p className="text-surface-500 mt-1">Feuilles de présence de vos sessions</p>
      </div>

      <EmargementSheet token={params.token} sessions={bySession as any} />
    </div>
  )
}
