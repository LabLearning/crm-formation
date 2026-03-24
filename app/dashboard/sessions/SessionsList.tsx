'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Users,
  Calendar, MapPin, Video, Clock, User as UserIcon,
} from 'lucide-react'
import { Button, Badge, Modal, useToast } from '@/components/ui'
import { SessionForm } from './SessionForm'
import { deleteSessionAction, updateSessionStatusAction } from './actions'
import {
  SESSION_STATUS_LABELS, SESSION_STATUS_COLORS,
  MODALITE_LABELS, MODALITE_COLORS,
} from '@/lib/types/formation'
import { formatDate } from '@/lib/utils'
import type { Session, SessionStatus, Formation, Formateur } from '@/lib/types/formation'

interface SessionsListProps {
  sessions: Session[]
  formations: Pick<Formation, 'id' | 'intitule' | 'reference' | 'modalite' | 'duree_heures'>[]
  formateurs: Pick<Formateur, 'id' | 'prenom' | 'nom'>[]
}

export function SessionsList({ sessions, formations, formateurs }: SessionsListProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const title = s.intitule || s.formation?.intitule || ''
      const matchSearch = title.toLowerCase().includes(search.toLowerCase()) ||
        (s.reference || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.lieu || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [sessions, search, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sessions.length }
    sessions.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1 })
    return counts
  }, [sessions])

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette session ?')) return
    const result = await deleteSessionAction(id)
    if (result.success) toast('success', 'Session supprimée')
    else toast('error', result.error || 'Erreur')
    setActiveMenu(null)
  }

  async function handleStatusChange(id: string, status: SessionStatus) {
    const result = await updateSessionStatusAction(id, status)
    if (result.success) toast('success', `Statut mis à jour : ${SESSION_STATUS_LABELS[status]}`)
    else toast('error', result.error || 'Erreur')
  }

  function getSessionTitle(s: Session): string {
    return s.intitule || s.formation?.intitule || 'Session sans titre'
  }

  function isUpcoming(s: Session): boolean {
    return new Date(s.date_debut) > new Date()
  }

  function isToday(s: Session): boolean {
    const today = new Date().toISOString().split('T')[0]
    return s.date_debut <= today && s.date_fin >= today
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Sessions de formation</h1>
          <p className="text-surface-500 mt-1 text-sm">{sessions.length} session{sessions.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Nouvelle session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-surface-200/60 flex-1 max-w-md">
          <Search className="h-4 w-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {['all', 'planifiee', 'confirmee', 'en_cours', 'terminee', 'annulee'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-surface-900 text-white shadow-xs' : 'bg-white text-surface-500 border border-surface-200/80 hover:border-surface-300 hover:text-surface-700'}`}>
              {s === 'all' ? 'Toutes' : SESSION_STATUS_LABELS[s as SessionStatus]}
              <span className="ml-1 text-surface-400">({statusCounts[s] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {filtered.map((s) => (
          <div key={s.id} className={`card p-5 hover:shadow-card transition-shadow ${isToday(s) ? 'ring-2 ring-brand-200' : ''}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Date badge */}
              <div className="shrink-0 text-center lg:w-20">
                <div className={`rounded-xl p-2.5 ${isToday(s) ? 'bg-brand-50' : 'bg-surface-50'}`}>
                  <div className={`text-2xs uppercase font-medium ${isToday(s) ? 'text-brand-500' : 'text-surface-400'}`}>
                    {new Date(s.date_debut).toLocaleDateString('fr-FR', { month: 'short' })}
                  </div>
                  <div className={`text-xl font-heading font-bold ${isToday(s) ? 'text-brand-700' : 'text-surface-800'}`}>
                    {new Date(s.date_debut).getDate()}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {s.reference && <div className="text-2xs font-mono text-surface-400">{s.reference}</div>}
                    <h3 className="text-sm font-semibold text-surface-900 truncate">{getSessionTitle(s)}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={SESSION_STATUS_COLORS[s.status]} dot>{SESSION_STATUS_LABELS[s.status]}</Badge>
                    {isToday(s) && <Badge variant="info">Aujourd&apos;hui</Badge>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-surface-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(s.date_debut, { day: 'numeric', month: 'short' })} — {formatDate(s.date_fin, { day: 'numeric', month: 'short' })}
                  </span>
                  {s.horaires && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.horaires}</span>
                  )}
                  {s.lieu && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.lieu}{s.ville ? `, ${s.ville}` : ''}</span>
                  )}
                  {s.lien_visio && (
                    <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5 text-brand-500" /> Visio</span>
                  )}
                  {s.formateur && (
                    <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> {s.formateur.prenom} {s.formateur.nom}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {s._nb_inscrits ?? 0} / {s.places_max} places
                  </span>
                  {s.formation && (
                    <Badge variant={MODALITE_COLORS[s.formation.modalite]}>{MODALITE_LABELS[s.formation.modalite]}</Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="relative shrink-0">
                <button onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)} className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {activeMenu === s.id && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border shadow-elevated py-1 z-20 animate-in-scale origin-top-right">
                    <button onClick={() => { setEditSession(s); setActiveMenu(null) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50">
                      <Pencil className="h-4 w-4 text-surface-400" /> Modifier
                    </button>
                    {s.status === 'planifiee' && (
                      <button onClick={() => { handleStatusChange(s.id, 'confirmee'); setActiveMenu(null) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50">
                        Confirmer la session
                      </button>
                    )}
                    {s.status === 'confirmee' && (
                      <button onClick={() => { handleStatusChange(s.id, 'en_cours'); setActiveMenu(null) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-success-600 hover:bg-success-50">
                        Démarrer la session
                      </button>
                    )}
                    {s.status === 'en_cours' && (
                      <button onClick={() => { handleStatusChange(s.id, 'terminee'); setActiveMenu(null) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-surface-700 hover:bg-surface-50">
                        Terminer la session
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50">
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <Calendar className="h-6 w-6 text-surface-400" />
          <p className="text-sm text-surface-500">
            {search || statusFilter !== 'all' ? 'Aucune session trouvée' : 'Aucune session planifiée. Créez votre première session !'}
          </p>
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle session" size="lg">
        <SessionForm formations={formations} formateurs={formateurs} onSuccess={() => { setCreateOpen(false); toast('success', 'Session créée') }} onCancel={() => setCreateOpen(false)} />
      </Modal>
      <Modal isOpen={!!editSession} onClose={() => setEditSession(null)} title="Modifier la session" size="lg">
        {editSession && <SessionForm session={editSession} formations={formations} formateurs={formateurs} onSuccess={() => { setEditSession(null); toast('success', 'Session mise à jour') }} onCancel={() => setEditSession(null)} />}
      </Modal>
    </div>
  )
}
