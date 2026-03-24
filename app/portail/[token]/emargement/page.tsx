import { getPortalContext } from '@/lib/portal-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, XCircle, Calendar, Users } from 'lucide-react'

export default async function PortalEmargementPage({ params }: { params: { token: string } }) {
  const context = await getPortalContext(params.token)
  if (!context || context.type !== 'formateur') redirect('/portail/expired')

  const supabase = await createServiceRoleClient()

  // Active sessions
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
      .select('*, apprenant:apprenants(prenom, nom)')
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
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Émargement</h1>
        <p className="text-surface-500 mt-1">Feuilles de présence de vos sessions</p>
      </div>

      {bySession.map((session) => (
        <div key={session.id} className="card overflow-hidden">
          <div className="px-6 py-4 bg-surface-50 border-b border-surface-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-surface-900">{session.formation?.intitule || session.reference}</div>
                <div className="text-xs text-surface-500">
                  {formatDate(session.date_debut, { day: 'numeric', month: 'short' })} — {formatDate(session.date_fin, { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
          </div>

          {session.dates.length > 0 ? (
            <div className="divide-y divide-surface-100">
              {session.dates.map((dayData) => (
                <div key={dayData.date} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-surface-400" />
                    <span className="text-sm font-medium text-surface-800">
                      {formatDate(dayData.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <span className="text-xs text-surface-400">
                      {dayData.emargements.filter((e: any) => e.est_present).length}/{dayData.emargements.length} présents
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {dayData.emargements.map((em: any) => (
                      <div key={em.id} className={`flex items-center gap-2 p-2.5 rounded-lg ${em.est_present ? 'bg-success-50' : 'bg-surface-50'}`}>
                        {em.est_present ? (
                          <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-surface-300 shrink-0" />
                        )}
                        <span className="text-sm text-surface-700">{em.apprenant?.prenom} {em.apprenant?.nom}</span>
                        <span className="text-2xs text-surface-400 ml-auto">{em.creneau === 'matin' ? 'AM' : em.creneau === 'apres_midi' ? 'PM' : 'Jour'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-surface-400">
              Aucun émargement enregistré pour cette session
            </div>
          )}
        </div>
      ))}

      {(sessions || []).length === 0 && (
        <div className="card p-12 text-center text-sm text-surface-500">Aucune session active</div>
      )}
    </div>
  )
}
