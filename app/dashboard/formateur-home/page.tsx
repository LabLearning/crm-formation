import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AccountNotLinked } from '@/components/dashboard/AccountNotLinked'
import { PointageButton } from '@/app/dashboard/pointage/PointageButton'
import { Calendar, Users, ClipboardCheck, Clock, ChevronRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function FormateurHomePage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()

  // Trouver la fiche formateur liée
  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id, prenom, nom')
    .eq('user_id', session.user.id)
    .single()

  if (!formateur) {
    return (
      <div className="animate-fade-in">
        <AccountNotLinked roleName="Formateur" userName={session.user.first_name || 'Formateur'} />
      </div>
    )
  }

  // Sessions du formateur
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, reference, status, date_debut, date_fin, lieu, formation:formations(intitule)')
    .eq('formateur_id', formateur.id)
    .in('status', ['planifiee', 'confirmee', 'en_cours'])
    .order('date_debut', { ascending: true })
    .limit(10)

  // Nombre d'apprenants inscrits dans ses sessions
  const sessionIds = (sessions || []).map(s => s.id)
  let nbApprenants = 0
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from('inscriptions')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .not('status', 'in', '("annule","abandonne")')
    nbApprenants = count || 0
  }

  // Émargements à faire aujourd'hui
  const today = new Date().toISOString().split('T')[0]
  let emargementsPending = 0
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from('emargements')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .eq('date', today)
      .eq('est_present', false)
    emargementsPending = count || 0
  }

  const allSessions = sessions || []
  const prochaine = allSessions.find(s => new Date(s.date_debut) >= new Date())

  // Pointages du jour
  const { data: todayPointages } = await supabase
    .from('pointages_formateur')
    .select('id, heure_arrivee, heure_depart, photo_arrivee_url, photo_depart_url, session_id, session:sessions(reference, formation:formations(intitule))')
    .eq('formateur_id', formateur.id)
    .eq('date', today)

  // Sessions pointables : confirmées ou en cours (même si pas exactement aujourd'hui)
  const sessionsPointables = allSessions.filter(s => ['confirmee', 'en_cours'].includes(s.status))

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">
          Bonjour, {session.user.first_name}
        </h1>
        <p className="text-surface-500 mt-1 text-sm">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' — Espace formateur'}
        </p>
      </div>

      {/* Pointeuse */}
      {sessionsPointables.length > 0 && (
        <PointageButton
          todayPointages={(todayPointages || []) as any[]}
          sessionsToday={sessionsPointables.map(s => ({ id: s.id, reference: s.reference, formation: s.formation as any }))}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-5 bg-blue-50">
          <div className="text-3xl font-heading font-bold text-blue-600">{allSessions.length}</div>
          <div className="text-sm font-medium text-surface-700 mt-1">Sessions actives</div>
        </div>
        <div className="rounded-2xl p-5 bg-emerald-50">
          <div className="text-3xl font-heading font-bold text-emerald-600">{nbApprenants}</div>
          <div className="text-sm font-medium text-surface-700 mt-1">Apprenants inscrits</div>
        </div>
        <div className="rounded-2xl p-5 bg-amber-50">
          <div className="text-3xl font-heading font-bold text-amber-600">{emargementsPending}</div>
          <div className="text-sm font-medium text-surface-700 mt-1">Émargements aujourd'hui</div>
        </div>
        <div className="rounded-2xl p-5 bg-violet-50">
          <div className="text-3xl font-heading font-bold text-violet-600">
            {prochaine
              ? formatDate(prochaine.date_debut, { day: 'numeric', month: 'short' })
              : '—'}
          </div>
          <div className="text-sm font-medium text-surface-700 mt-1">Prochaine session</div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Mes sessions', href: '/dashboard/sessions', icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Mes apprenants', href: '/dashboard/apprenants', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Évaluations', href: '/dashboard/evaluations', icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50' },
          { label: 'QCM', href: '/dashboard/qcm', icon: CheckCircle2, color: 'text-violet-600 bg-violet-50' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="card p-4 flex items-center gap-3 hover:shadow-card transition-all active:scale-[0.98]">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${a.color}`}>
              <a.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-surface-800 flex-1">{a.label}</span>
            <ChevronRight className="h-4 w-4 text-surface-300" />
          </Link>
        ))}
      </div>

      {/* Sessions avec statut de pointage */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Mes sessions</div>
        </div>
        {allSessions.length > 0 ? (
          <div className="divide-y divide-surface-100">
            {allSessions.map((s: any) => {
              const pointage = (todayPointages || []).find((p: any) => p.session_id === s.id)
              const isPointable = ['confirmee', 'en_cours'].includes(s.status)
              const hasArrivee = pointage?.heure_arrivee
              const hasDepart = pointage?.heure_depart

              return (
                <div key={s.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      hasArrivee && hasDepart ? 'bg-emerald-100' :
                      hasArrivee ? 'bg-amber-100' :
                      isPointable ? 'bg-blue-100' : 'bg-surface-100'
                    }`}>
                      {hasArrivee && hasDepart ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Calendar className={`h-5 w-5 ${isPointable ? 'text-blue-600' : 'text-surface-500'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">
                        {(s.formation as any)?.intitule || s.reference}
                      </div>
                      <div className="text-xs text-surface-500">
                        {formatDate(s.date_debut, { day: 'numeric', month: 'long' })}
                        {s.lieu && ` — ${s.lieu}`}
                      </div>
                      {/* Heures de pointage */}
                      {hasArrivee && (
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-emerald-600 font-mono">
                            Arrivée : {new Date(pointage.heure_arrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {hasDepart && (
                            <>
                              <span className="text-red-600 font-mono">
                                Départ : {new Date(pointage.heure_depart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-surface-800 font-bold">
                                {(() => {
                                  const diff = new Date(pointage.heure_depart).getTime() - new Date(pointage.heure_arrivee).getTime()
                                  const h = Math.floor(diff / 3600000)
                                  const m = Math.floor((diff % 3600000) / 60000)
                                  return `${h}h${String(m).padStart(2, '0')}`
                                })()}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      hasArrivee && hasDepart ? 'bg-emerald-100 text-emerald-700' :
                      hasArrivee ? 'bg-amber-100 text-amber-700' :
                      s.status === 'en_cours' ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'confirmee' ? 'bg-blue-100 text-blue-700' :
                      'bg-surface-100 text-surface-600'
                    }`}>
                      {hasArrivee && hasDepart ? 'Pointé' :
                       hasArrivee ? 'En cours' :
                       s.status === 'en_cours' ? 'En cours' :
                       s.status === 'confirmee' ? 'Confirmée' : 'Planifiée'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-surface-400">
            <Clock className="h-8 w-8 mx-auto mb-2 text-surface-300" />
            Aucune session planifiée
          </div>
        )}
      </div>
    </div>
  )
}
