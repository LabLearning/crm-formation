'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, MapPin, Clock, Users, UserCheck, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, LogIn, LogOut, FileText, Plus, Loader2,
  GraduationCap, Mail, Phone, Building2, Camera,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { updateSessionStatusAction, togglePresenceAction, createEmargementJourAction } from './actions'

interface Props {
  session: any
  inscriptions: any[]
  emargements: any[]
  pointages: any[]
  rapport: any
  isFormateur: boolean
  userRole: string
}

const SESSION_STATUS: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
  planifiee: { label: 'Planifiée', variant: 'default' },
  confirmee: { label: 'Confirmée', variant: 'info' },
  en_cours: { label: 'En cours', variant: 'success' },
  terminee: { label: 'Terminée', variant: 'default' },
  annulee: { label: 'Annulée', variant: 'danger' },
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  planifiee: ['confirmee', 'annulee'],
  confirmee: ['en_cours', 'annulee'],
  en_cours: ['terminee'],
  terminee: [],
  annulee: [],
}

export function SessionDetailClient({ session, inscriptions, emargements, pointages, rapport, isFormateur, userRole }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const [createDate, setCreateDate] = useState('')
  const [createCreneau, setCreateCreneau] = useState('journee')

  const formation = session.formation
  const formateur = session.formateur
  const canChangeStatus = isFormateur || ['super_admin', 'gestionnaire', 'directeur_commercial'].includes(userRole)
  const nextStatuses = STATUS_TRANSITIONS[session.status] || []

  // Jours de la session
  function getSessionDays(): string[] {
    const days: string[] = []
    const d = new Date(session.date_debut)
    const end = new Date(session.date_fin)
    while (d <= end) {
      days.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    return days
  }
  const sessionDays = getSessionDays()
  const today = new Date().toISOString().split('T')[0]

  // Émargements groupés par date
  const emargementsByDate: Record<string, any[]> = {}
  emargements.forEach(e => {
    if (!emargementsByDate[e.date]) emargementsByDate[e.date] = []
    emargementsByDate[e.date].push(e)
  })

  // Pointages par date
  const pointagesByDate: Record<string, any> = {}
  pointages.forEach(p => { pointagesByDate[p.date] = p })

  function formatHeure(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function handleStatusChange(newStatus: string) {
    setShowStatusMenu(false)
    startTransition(async () => {
      await updateSessionStatusAction(session.id, newStatus)
    })
  }

  function handleTogglePresence(emargementId: string, current: boolean) {
    startTransition(async () => {
      await togglePresenceAction(emargementId, !current)
    })
  }

  function handleCreateEmargement() {
    if (!createDate) return
    startTransition(async () => {
      await createEmargementJourAction(session.id, createDate, createCreneau)
      setCreateDate('')
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/sessions" className="mt-1 p-2 rounded-xl hover:bg-surface-100 transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5 text-surface-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading truncate">
            {formation?.intitule || session.reference}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-surface-500 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />
              {formatDate(session.date_debut, { day: 'numeric', month: 'long' })} — {formatDate(session.date_fin, { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {session.lieu && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{session.lieu}</span>}
            {formation?.duree_heures && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formation.duree_heures}h</span>}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{inscriptions.length} apprenant{inscriptions.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        {/* Statut avec changement */}
        <div className="relative shrink-0">
          <button
            onClick={() => canChangeStatus && nextStatuses.length > 0 && setShowStatusMenu(!showStatusMenu)}
            className={cn('flex items-center gap-1.5', canChangeStatus && nextStatuses.length > 0 && 'cursor-pointer')}
          >
            <Badge variant={SESSION_STATUS[session.status]?.variant || 'default'}>
              {SESSION_STATUS[session.status]?.label || session.status}
            </Badge>
            {canChangeStatus && nextStatuses.length > 0 && <ChevronDown className="h-3.5 w-3.5 text-surface-400" />}
          </button>
          {showStatusMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border shadow-elevated py-1 z-20">
              {nextStatuses.map(s => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-700 hover:bg-surface-50">
                  <Badge variant={SESSION_STATUS[s]?.variant || 'default'}>{SESSION_STATUS[s]?.label}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formateur */}
      {formateur && (
        <div className="card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-surface-900">{formateur.prenom} {formateur.nom}</div>
            <div className="text-xs text-surface-500 flex items-center gap-3">
              {formateur.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{formateur.email}</span>}
              {formateur.telephone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formateur.telephone}</span>}
            </div>
          </div>
          <span className="text-xs text-surface-400">Formateur</span>
        </div>
      )}

      {/* Planning jour par jour */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Planning — {sessionDays.length} jour{sessionDays.length > 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-surface-100">
          {sessionDays.map((day, idx) => {
            const dayEmargements = emargementsByDate[day] || []
            const dayPointage = pointagesByDate[day]
            const isToday = day === today
            const presentCount = dayEmargements.filter((e: any) => e.est_present).length
            const isExpanded = expandedDays[day]

            return (
              <div key={day}>
                <button
                  onClick={() => setExpandedDays({ ...expandedDays, [day]: !isExpanded })}
                  className={cn('w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-50 transition-colors', isToday && 'bg-brand-50/30')}
                >
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    dayPointage?.heure_depart ? 'bg-emerald-100 text-emerald-700' :
                    dayPointage?.heure_arrivee ? 'bg-amber-100 text-amber-700' :
                    isToday ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-500'
                  )}>
                    J{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm', isToday ? 'font-semibold text-surface-900' : 'text-surface-700')}>
                      {new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {isToday && <span className="ml-2 text-[10px] text-brand-600 font-semibold uppercase">Aujourd'hui</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                      {dayPointage?.heure_arrivee && (
                        <span className="flex items-center gap-1 text-emerald-600"><LogIn className="h-3 w-3" />{formatHeure(dayPointage.heure_arrivee)}</span>
                      )}
                      {dayPointage?.heure_depart && (
                        <span className="flex items-center gap-1 text-red-600"><LogOut className="h-3 w-3" />{formatHeure(dayPointage.heure_depart)}</span>
                      )}
                      {dayEmargements.length > 0 && (
                        <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{presentCount}/{dayEmargements.length} présent{presentCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-surface-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-surface-400 shrink-0" />}
                </button>

                {/* Détail émargement du jour */}
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-surface-100 bg-surface-50/50">
                    {dayEmargements.length > 0 ? (
                      <div className="space-y-1 pt-2">
                        {dayEmargements.map((em: any) => {
                          const apprenant = inscriptions.find(i => (i.apprenant as any)?.id === em.apprenant_id)?.apprenant
                          return (
                            <button
                              key={em.id}
                              onClick={() => handleTogglePresence(em.id, em.est_present)}
                              disabled={isPending}
                              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                                em.est_present ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-white hover:bg-surface-50'
                              )}
                            >
                              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                                em.est_present ? 'bg-emerald-100' : 'bg-surface-100'
                              )}>
                                {em.est_present
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  : <XCircle className="h-4 w-4 text-surface-300" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-surface-900">{apprenant?.prenom} {apprenant?.nom}</div>
                                <div className="text-xs text-surface-400">{apprenant?.entreprise || ''}</div>
                              </div>
                              <span className={cn('text-xs font-semibold', em.est_present ? 'text-emerald-600' : 'text-surface-400')}>
                                {em.est_present ? 'Présent' : 'Absent'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-surface-400">
                        Aucune feuille d'émargement pour ce jour
                      </div>
                    )}

                    {/* Photos pointage */}
                    {dayPointage && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-200">
                        {dayPointage.photo_arrivee_url && (
                          <a href={dayPointage.photo_arrivee_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700">
                            <Camera className="h-3.5 w-3.5" /> Photo arrivée
                          </a>
                        )}
                        {dayPointage.photo_depart_url && (
                          <a href={dayPointage.photo_depart_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
                            <Camera className="h-3.5 w-3.5" /> Photo départ
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Créer émargement */}
      {(isFormateur || ['super_admin', 'gestionnaire'].includes(userRole)) && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Créer une feuille d'émargement</div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <select value={createDate} onChange={e => setCreateDate(e.target.value)} className="input-base text-sm">
                <option value="">Sélectionner un jour</option>
                {sessionDays.map((day, idx) => (
                  <option key={day} value={day}>
                    J{idx + 1} — {new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select value={createCreneau} onChange={e => setCreateCreneau(e.target.value)} className="input-base text-sm">
                <option value="journee">Journée entière</option>
                <option value="matin">Matin</option>
                <option value="apres_midi">Après-midi</option>
              </select>
            </div>
            <button
              onClick={handleCreateEmargement}
              disabled={!createDate || isPending}
              className="btn-primary flex items-center justify-center gap-2 text-sm whitespace-nowrap"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Apprenants */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100">
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Apprenants inscrits ({inscriptions.length})</span>
        </div>
        {inscriptions.length > 0 ? (
          <div className="divide-y divide-surface-100">
            {inscriptions.map((ins: any) => {
              const a = ins.apprenant
              // Calculer assiduité
              const appEmargements = emargements.filter((e: any) => e.apprenant_id === a?.id)
              const appPresent = appEmargements.filter((e: any) => e.est_present).length
              const appTotal = appEmargements.length
              const assiduity = appTotal > 0 ? Math.round((appPresent / appTotal) * 100) : null

              return (
                <div key={ins.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600">
                      {(a?.prenom?.[0] || '')}{(a?.nom?.[0] || '')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900">{a?.prenom} {a?.nom}</div>
                    <div className="text-xs text-surface-500 flex items-center gap-3">
                      {a?.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{a.email}</span>}
                      {a?.entreprise && <span className="flex items-center gap-1"><Building2 className="h-3 w-3 shrink-0" />{a.entreprise}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {assiduity !== null && (
                      <div className="text-right">
                        <div className={cn('text-sm font-bold', assiduity >= 80 ? 'text-emerald-600' : assiduity >= 50 ? 'text-amber-600' : 'text-red-600')}>
                          {assiduity}%
                        </div>
                        <div className="text-[10px] text-surface-400">assiduité</div>
                      </div>
                    )}
                    <Badge variant={ins.status === 'confirme' ? 'success' : ins.status === 'inscrit' ? 'info' : 'default'}>
                      {ins.status === 'confirme' ? 'Confirmé' : ins.status === 'inscrit' ? 'Inscrit' : ins.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-surface-400">Aucun apprenant inscrit</div>
        )}
      </div>

      {/* Rapport */}
      {rapport && (
        <div className="card p-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-surface-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-surface-900">Rapport de session</div>
            <div className="text-xs text-surface-500">
              {rapport.status === 'soumis' ? 'Soumis le ' + formatDate(rapport.submitted_at, { day: 'numeric', month: 'long' }) : 'Brouillon'}
            </div>
          </div>
          <Badge variant={rapport.status === 'valide' ? 'success' : rapport.status === 'soumis' ? 'warning' : 'default'}>
            {rapport.status === 'valide' ? 'Validé' : rapport.status === 'soumis' ? 'Soumis' : 'Brouillon'}
          </Badge>
          {isFormateur && (
            <Link href="/dashboard/formateur-home/rapports" className="text-xs text-brand-600 font-medium">
              Modifier
            </Link>
          )}
        </div>
      )}

      {/* Lien vers rapport si formateur et pas encore de rapport */}
      {!rapport && isFormateur && ['en_cours', 'terminee'].includes(session.status) && (
        <Link href="/dashboard/formateur-home/rapports"
          className="card p-4 flex items-center gap-3 border-2 border-dashed border-surface-200 hover:border-brand-300 transition-colors">
          <FileText className="h-5 w-5 text-brand-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-surface-900">Rédiger le rapport de session</div>
            <div className="text-xs text-surface-500">Bilan pédagogique à remplir après la formation</div>
          </div>
        </Link>
      )}
    </div>
  )
}
