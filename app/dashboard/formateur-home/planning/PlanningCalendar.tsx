'use client'

import { useState, useMemo, useTransition } from 'react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { toggleDisponibiliteAction } from './actions'
import { cn } from '@/lib/utils'

interface Dispo {
  id: string
  date: string
  type: 'disponible' | 'indisponible' | 'sous_reserve'
}

interface Session {
  id: string
  reference: string
  date_debut: string
  date_fin: string
  lieu: string | null
  status: string
  formation: { intitule: string } | null
}

interface PlanningCalendarProps {
  disponibilites: Dispo[]
  sessions: Session[]
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const DISPO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  disponible: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Disponible' },
  indisponible: { bg: 'bg-red-100', text: 'text-red-700', label: 'Indisponible' },
  sous_reserve: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Sous réserve' },
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7

  const days: { date: string; day: number; isCurrentMonth: boolean }[] = []

  // Jours du mois précédent
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false })
  }
  // Jours du mois courant
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i)
    days.push({ date: d.toISOString().split('T')[0], day: i, isCurrentMonth: true })
  }
  // Compléter la dernière semaine
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false })
    }
  }
  return days
}

export function PlanningCalendar({ disponibilites, sessions }: PlanningCalendarProps) {
  const today = new Date().toISOString().split('T')[0]
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [isPending, startTransition] = useTransition()
  const [localDispos, setLocalDispos] = useState<Record<string, string>>(
    Object.fromEntries(disponibilites.map(d => [d.date, d.type]))
  )

  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth])

  // Sessions par date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {}
    sessions.forEach(s => {
      const d = new Date(s.date_debut)
      const end = new Date(s.date_fin)
      while (d <= end) {
        const key = d.toISOString().split('T')[0]
        if (!map[key]) map[key] = []
        map[key].push(s)
        d.setDate(d.getDate() + 1)
      }
    })
    return map
  }, [sessions])

  function handlePrevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function handleNextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  function handleDayClick(date: string) {
    if (date < today) return // Pas de modif dans le passé
    if (sessionsByDate[date]) return // Pas de modif sur un jour de session

    const current = localDispos[date]
    let newType: 'disponible' | 'indisponible' | 'sous_reserve' | 'supprimer'
    if (!current) newType = 'disponible'
    else if (current === 'disponible') newType = 'indisponible'
    else if (current === 'indisponible') newType = 'sous_reserve'
    else newType = 'supprimer'

    if (newType === 'supprimer') {
      const { [date]: _, ...rest } = localDispos
      setLocalDispos(rest)
    } else {
      setLocalDispos({ ...localDispos, [date]: newType })
    }

    startTransition(async () => {
      await toggleDisponibiliteAction(date, newType)
    })
  }

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(DISPO_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded-sm', val.bg)} />
            <span className="text-surface-600">{val.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-brand-200" />
          <span className="text-surface-600">Session planifiée</span>
        </div>
      </div>

      {/* Navigation mois */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-surface-600" />
          </button>
          <h2 className="text-base font-heading font-semibold text-surface-900">
            {MOIS[currentMonth]} {currentYear}
          </h2>
          <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <ChevronRight className="h-5 w-5 text-surface-600" />
          </button>
        </div>

        {/* En-tête jours */}
        <div className="grid grid-cols-7 border-b border-surface-100">
          {JOURS.map(j => (
            <div key={j} className="text-center py-2 text-[11px] font-semibold text-surface-400 uppercase">{j}</div>
          ))}
        </div>

        {/* Grille jours */}
        <div className="grid grid-cols-7">
          {days.map(({ date, day, isCurrentMonth }) => {
            const isToday = date === today
            const isPast = date < today
            const dispo = localDispos[date]
            const daySessions = sessionsByDate[date]
            const dispoColor = dispo ? DISPO_COLORS[dispo] : null

            return (
              <button
                key={date}
                onClick={() => handleDayClick(date)}
                disabled={isPast || isPending}
                className={cn(
                  'relative min-h-[64px] p-1.5 border-b border-r border-surface-100 text-left transition-colors',
                  !isCurrentMonth && 'opacity-30',
                  isPast ? 'cursor-default' : 'cursor-pointer hover:bg-surface-50',
                  isToday && 'ring-2 ring-inset ring-brand-400',
                )}
              >
                <span className={cn(
                  'text-xs font-medium',
                  isToday ? 'text-brand-600 font-bold' : isCurrentMonth ? 'text-surface-700' : 'text-surface-400'
                )}>
                  {day}
                </span>

                {/* Disponibilité */}
                {dispoColor && !daySessions && (
                  <div className={cn('mt-0.5 rounded-sm px-1 py-0.5 text-[9px] font-semibold', dispoColor.bg, dispoColor.text)}>
                    {dispoColor.label.substring(0, 5)}
                  </div>
                )}

                {/* Session */}
                {daySessions && daySessions.map((s, i) => (
                  <div key={s.id + i} className="mt-0.5 rounded-sm px-1 py-0.5 bg-brand-100 text-[9px] font-semibold text-brand-700 truncate">
                    {s.formation?.intitule?.substring(0, 12) || s.reference}
                  </div>
                ))}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sessions du mois */}
      {sessions.filter(s => {
        const d = new Date(s.date_debut)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100">
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Sessions ce mois</span>
          </div>
          <div className="divide-y divide-surface-100">
            {sessions.filter(s => {
              const d = new Date(s.date_debut)
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear
            }).map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-surface-900 truncate">{s.formation?.intitule || s.reference}</div>
                  <div className="text-xs text-surface-500 flex items-center gap-2">
                    <span>
                      {new Date(s.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      {' — '}
                      {new Date(s.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    {s.lieu && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{s.lieu}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-surface-400 text-center">
        Cliquez sur un jour pour basculer entre : Disponible → Indisponible → Sous réserve → Vide
      </p>
    </div>
  )
}
