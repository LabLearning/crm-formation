'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Calendar, Plus, Users, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { togglePresenceAction, createEmargementAction } from './actions'

interface Emargement {
  id: string
  apprenant_id: string
  est_present: boolean
  creneau: string
  apprenant: { prenom: string; nom: string } | null
}

interface DateRow {
  date: string
  emargements: Emargement[]
}

interface Session {
  id: string
  reference: string
  date_debut: string
  date_fin: string
  formation: any
  dates: DateRow[]
}

interface EmargementSheetProps {
  token: string
  sessions: Session[]
}

function formatFullDate(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(dateStr))
}

function formatShortDate(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateStr))
}

function creneauLabel(creneau: string) {
  if (creneau === 'matin') return 'Matin'
  if (creneau === 'apres_midi') return 'Après-midi'
  return 'Journée'
}

function DateSection({
  token,
  dayData,
  onToggle,
}: {
  token: string
  dayData: DateRow
  onToggle: (emargementId: string, newValue: boolean) => void
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const handleToggle = async (em: Emargement) => {
    setLoadingId(em.id)
    const newValue = !em.est_present
    onToggle(em.id, newValue)
    const result = await togglePresenceAction(token, em.id, newValue)
    if (!result.success) {
      onToggle(em.id, !newValue)
    }
    setLoadingId(null)
  }

  const presentCount = dayData.emargements.filter((e) => e.est_present).length
  const total = dayData.emargements.length
  const allPresent = presentCount === total

  return (
    <div className="border-b border-surface-100 last:border-0">
      {/* Date header — tappable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-surface-50/60 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-surface-400 shrink-0" />
          <span className="text-sm font-medium text-surface-800 capitalize">
            {formatFullDate(dayData.date)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            allPresent
              ? 'bg-success-100 text-success-700'
              : 'bg-surface-200 text-surface-600'
          }`}>
            {presentCount}/{total}
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-surface-400" />
            : <ChevronDown className="h-4 w-4 text-surface-400" />}
        </div>
      </button>

      {/* Apprenant rows — big touch targets on mobile */}
      {expanded && (
        <div>
          {dayData.emargements.map((em) => {
            const isLoading = loadingId === em.id
            return (
              <button
                key={em.id}
                onClick={() => handleToggle(em)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors border-b border-surface-100/60 last:border-0 active:scale-[0.99] ${
                  em.est_present
                    ? 'bg-success-50/50 hover:bg-success-50'
                    : 'bg-white hover:bg-surface-50'
                } ${isLoading ? 'opacity-60' : ''}`}
              >
                {/* Status icon — large for touch */}
                <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                  em.est_present ? 'bg-success-100' : 'bg-surface-100'
                }`}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 text-surface-400 animate-spin" />
                  ) : em.est_present ? (
                    <CheckCircle2 className="h-5 w-5 text-success-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-surface-300" />
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${em.est_present ? 'text-surface-900' : 'text-surface-600'}`}>
                    {em.apprenant?.prenom} {em.apprenant?.nom}
                  </span>
                  <div className="text-xs text-surface-400 mt-0.5">{creneauLabel(em.creneau)}</div>
                </div>

                {/* Present / Absent label */}
                <span className={`shrink-0 text-xs font-semibold ${
                  em.est_present ? 'text-success-600' : 'text-surface-400'
                }`}>
                  {em.est_present ? 'Présent' : 'Absent'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CreateSheetForm({
  token,
  sessionId,
  onSuccess,
}: {
  token: string
  sessionId: string
  onSuccess: () => void
}) {
  const [date, setDate] = useState('')
  const [creneau, setCreneau] = useState<'matin' | 'apres_midi' | 'journee'>('journee')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setError(null)
    startTransition(async () => {
      const result = await createEmargementAction(token, sessionId, date, creneau)
      if (result.success) {
        setDate('')
        onSuccess()
      } else {
        setError(result.error || 'Erreur inconnue')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-surface-50 border-t border-surface-200">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
        Créer une feuille d'émargement
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-surface-500">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input-base text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-surface-500">Créneau</label>
          <select
            value={creneau}
            onChange={(e) => setCreneau(e.target.value as 'matin' | 'apres_midi' | 'journee')}
            className="input-base text-sm"
          >
            <option value="matin">Matin</option>
            <option value="apres_midi">Après-midi</option>
            <option value="journee">Journée entière</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-surface-500 invisible">Action</label>
          <button
            type="submit"
            disabled={isPending || !date}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Créer la feuille
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-danger-600 mt-2">{error}</p>}
    </form>
  )
}

function SessionCard({ token, session }: { token: string; session: Session }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [localDates, setLocalDates] = useState<DateRow[]>(session.dates)

  const handleToggle = (date: string, emargementId: string, newValue: boolean) => {
    setLocalDates((prev) =>
      prev.map((d) =>
        d.date !== date
          ? d
          : {
              ...d,
              emargements: d.emargements.map((em) =>
                em.id === emargementId ? { ...em, est_present: newValue } : em
              ),
            }
      )
    )
  }

  const handleCreated = () => {
    setShowForm(false)
    router.refresh()
  }

  // Global stats
  const totalPresent = localDates.reduce((s, d) => s + d.emargements.filter((e) => e.est_present).length, 0)
  const totalRows = localDates.reduce((s, d) => s + d.emargements.length, 0)

  return (
    <div className="card overflow-hidden">
      {/* Session header */}
      <div className="px-4 py-4 border-b border-surface-200 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-surface-900 leading-snug">
              {session.formation?.intitule || session.reference}
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              {formatShortDate(session.date_debut)} — {formatShortDate(session.date_fin)}
              <span className="ml-2 font-mono">{session.reference}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {totalRows > 0 && (
              <div className="text-right">
                <div className="text-lg font-heading font-bold text-surface-900">{totalPresent}/{totalRows}</div>
                <div className="text-[10px] text-surface-400 leading-none">présents</div>
              </div>
            )}
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle
            </button>
          </div>
        </div>
      </div>

      {/* Date sections */}
      {localDates.length > 0 ? (
        <div>
          {localDates.map((dayData) => (
            <DateSection
              key={dayData.date}
              token={token}
              dayData={dayData}
              onToggle={(id, val) => handleToggle(dayData.date, id, val)}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-surface-400">
          <Users className="h-8 w-8 mx-auto mb-2 text-surface-300" />
          Aucun émargement pour cette session
        </div>
      )}

      {/* Create sheet form */}
      {showForm && (
        <CreateSheetForm token={token} sessionId={session.id} onSuccess={handleCreated} />
      )}
    </div>
  )
}

export default function EmargementSheet({ token, sessions }: EmargementSheetProps) {
  if (sessions.length === 0) {
    return (
      <div className="card p-12 text-center text-sm text-surface-500">
        <Calendar className="h-8 w-8 mx-auto mb-3 text-surface-300" />
        Aucune session active
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard key={session.id} token={token} session={session} />
      ))}
    </div>
  )
}
