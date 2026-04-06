import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Clock, Camera, LogIn, LogOut, User, Calendar, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default async function PointagePage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  const { data: pointages } = await supabase
    .from('pointages_formateur')
    .select('*, formateur:formateurs(prenom, nom), session:sessions(reference, lieu, formation:formations(intitule))')
    .eq('organization_id', session.organization.id)
    .order('date', { ascending: false })
    .order('heure_arrivee', { ascending: false })
    .limit(100)

  const allPointages = pointages || []

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const todayPointages = allPointages.filter(p => p.date === today)
  const enCoursCount = todayPointages.filter(p => p.heure_arrivee && !p.heure_depart).length
  const completCount = todayPointages.filter(p => p.heure_arrivee && p.heure_depart).length

  function formatHeure(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function calcDuree(arrivee: string | null, depart: string | null): string {
    if (!arrivee || !depart) return '—'
    const diff = new Date(depart).getTime() - new Date(arrivee).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h${String(m).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Pointages formateurs</h1>
        <p className="text-surface-500 mt-1 text-sm">Suivi des heures d'arrivée et de départ avec preuve photo</p>
      </div>

      {/* KPIs du jour */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-5 bg-blue-50">
          <div className="text-3xl font-heading font-bold text-blue-600">{todayPointages.length}</div>
          <div className="text-sm font-medium text-surface-700 mt-1">Pointages aujourd'hui</div>
        </div>
        <div className="rounded-2xl p-5 bg-amber-50">
          <div className="text-3xl font-heading font-bold text-amber-600">{enCoursCount}</div>
          <div className="text-sm font-medium text-surface-700 mt-1">En cours (pas de départ)</div>
        </div>
        <div className="rounded-2xl p-5 bg-emerald-50">
          <div className="text-3xl font-heading font-bold text-emerald-600">{completCount}</div>
          <div className="text-sm font-medium text-surface-700 mt-1">Complétés</div>
        </div>
      </div>

      {/* Table des pointages */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Formateur</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Session</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Arrivée</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Départ</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Durée</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {allPointages.map((p: any) => {
                const isComplete = p.heure_arrivee && p.heure_depart
                const isEnCours = p.heure_arrivee && !p.heure_depart
                return (
                  <tr key={p.id} className={isEnCours ? 'bg-amber-50/30' : 'hover:bg-surface-50/50 transition-colors'}>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-surface-900">
                        {formatDate(p.date, { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-surface-900">
                        {p.formateur?.prenom} {p.formateur?.nom}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="text-sm text-surface-700 truncate max-w-[200px]">
                        {p.session?.formation?.intitule || p.session?.reference}
                      </div>
                      {p.session?.lieu && (
                        <div className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{p.session.lieu}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-sm font-mono text-emerald-600">{formatHeure(p.heure_arrivee)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.heure_depart ? (
                        <div className="flex items-center gap-1.5">
                          <LogOut className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-sm font-mono text-red-600">{formatHeure(p.heure_depart)}</span>
                        </div>
                      ) : (
                        <Badge variant="warning">En cours</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-surface-800">{calcDuree(p.heure_arrivee, p.heure_depart)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {p.photo_arrivee_url && (
                          <a href={p.photo_arrivee_url} target="_blank" rel="noopener noreferrer"
                            className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                            <Camera className="h-3.5 w-3.5 text-emerald-600" />
                          </a>
                        )}
                        {p.photo_depart_url && (
                          <a href={p.photo_depart_url} target="_blank" rel="noopener noreferrer"
                            className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                            <Camera className="h-3.5 w-3.5 text-red-600" />
                          </a>
                        )}
                        {!p.photo_arrivee_url && !p.photo_depart_url && (
                          <span className="text-xs text-surface-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {allPointages.length === 0 && (
          <div className="text-center py-16">
            <Clock className="h-8 w-8 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">Aucun pointage enregistré</p>
          </div>
        )}
      </div>
    </div>
  )
}
