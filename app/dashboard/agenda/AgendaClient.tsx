'use client'

import { useState, useMemo } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight, List, LayoutGrid,
  Calendar as CalIcon, Clock, MapPin, Phone, Mail,
  FileText, Bell, Clipboard, CheckCircle2, Circle,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Task {
  id: string; type: string; titre: string; date: string
  heure: string; leadName: string; leadEntreprise: string; done: boolean
}
interface Session {
  id: string; titre: string; dateDebut: string; dateFin: string
  horaires: string; lieu: string; status: string
}

const TASK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  appel: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  email: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  rdv: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  relance: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  devis: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  note: { bg: 'bg-surface-50', text: 'text-surface-700', border: 'border-surface-200' },
}
const TASK_ICONS: Record<string, React.ReactNode> = {
  appel: <Phone className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  rdv: <CalIcon className="h-3 w-3" />,
  relance: <Bell className="h-3 w-3" />,
  devis: <FileText className="h-3 w-3" />,
  note: <Clipboard className="h-3 w-3" />,
}
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const HEURES = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function getWeekDates(ref: Date): string[] {
  const d = new Date(ref); const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d); mon.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => { const dd = new Date(mon); dd.setDate(mon.getDate() + i); return toDateStr(dd) })
}
function getMonthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay(); const offset = startDay === 0 ? -6 : 1 - startDay
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(year, month, 1 + offset + i); return toDateStr(d) })
}

interface AgendaClientProps { interactions: Task[]; sessions: Session[] }

export function AgendaClient({ interactions, sessions }: AgendaClientProps) {
  const [view, setView] = useState<'semaine' | 'mois' | 'liste'>('semaine')
  const [refDate, setRefDate] = useState(new Date())
  const today = toDateStr(new Date())

  const weekDates = useMemo(() => getWeekDates(refDate), [refDate])
  const monthGrid = useMemo(() => getMonthGrid(refDate.getFullYear(), refDate.getMonth()), [refDate])

  function navigate(dir: number) {
    const d = new Date(refDate)
    if (view === 'semaine') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setRefDate(d)
  }

  function getTasksForDate(date: string) {
    return interactions.filter(t => t.date === date)
  }
  function getSessionsForDate(date: string) {
    return sessions.filter(s => s.dateDebut <= date && s.dateFin >= date)
  }

  // List view: upcoming tasks
  const listItems = useMemo(() => {
    const all: (Task & { isSession?: boolean })[] = [
      ...interactions.filter(t => t.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure)),
    ]
    return all.slice(0, 30)
  }, [interactions, today])

  const overdue = interactions.filter(t => !t.done && t.date < today).length
  const todayCount = interactions.filter(t => t.date === today).length
  const upcoming = interactions.filter(t => t.date > today).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Agenda</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {overdue > 0 && <span className="text-danger-600 font-medium">{overdue} en retard</span>}
            {overdue > 0 && todayCount > 0 && ' · '}
            {todayCount > 0 && <span>{todayCount} aujourd'hui</span>}
            {(overdue > 0 || todayCount > 0) && upcoming > 0 && ' · '}
            {upcoming > 0 && <span>{upcoming} à venir</span>}
            {overdue === 0 && todayCount === 0 && upcoming === 0 && 'Aucune tâche planifiée'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-surface-100 rounded-lg p-0.5">
            {([
              { id: 'semaine', icon: <LayoutGrid className="h-4 w-4" />, label: 'Semaine' },
              { id: 'mois', icon: <CalIcon className="h-4 w-4" />, label: 'Mois' },
              { id: 'liste', icon: <List className="h-4 w-4" />, label: 'Liste' },
            ] as const).map(v => (
              <button key={v.id} onClick={() => setView(v.id)} title={v.label}
                className={cn('p-2 rounded-md transition-colors', view === v.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-400 hover:text-surface-600')}>
                {v.icon}
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setRefDate(new Date())} className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-600 hover:bg-surface-100 transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Current period label */}
      <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">
        {view === 'semaine' && weekDates.length > 0 && (
          <>Semaine du {new Date(weekDates[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au {new Date(weekDates[6]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
        )}
        {view === 'mois' && `${MOIS[refDate.getMonth()]} ${refDate.getFullYear()}`}
        {view === 'liste' && 'Prochaines tâches'}
      </div>

      {/* ─── SEMAINE ─── */}
      {view === 'semaine' && (
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-8 border-b border-surface-100">
            <div className="p-3 text-xs text-surface-400" />
            {weekDates.map((d, i) => {
              const isToday = d === today
              const date = new Date(d)
              return (
                <div key={d} className={cn('p-3 text-center border-l border-surface-100', isToday && 'bg-brand-50/30')}>
                  <div className="text-[11px] text-surface-400 font-medium">{JOURS[i]}</div>
                  <div className={cn('text-lg font-heading font-bold mt-0.5', isToday ? 'text-brand-600' : 'text-surface-800')}>
                    {date.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          {HEURES.map(h => (
            <div key={h} className="grid grid-cols-8 border-b border-surface-100 last:border-0 min-h-[48px]">
              <div className="p-2 text-[11px] text-surface-400 font-mono text-right pr-3 pt-1">{h}</div>
              {weekDates.map(d => {
                const tasks = getTasksForDate(d).filter(t => t.heure.startsWith(h.split(':')[0]))
                const sess = getSessionsForDate(d)
                const isToday = d === today
                return (
                  <div key={d} className={cn('border-l border-surface-100 p-0.5 min-h-[48px]', isToday && 'bg-brand-50/10')}>
                    {tasks.map(t => {
                      const colors = TASK_COLORS[t.type] || TASK_COLORS.note
                      return (
                        <div key={t.id} className={cn('px-1.5 py-1 rounded text-[10px] mb-0.5 border', colors.bg, colors.text, colors.border)}>
                          <div className="flex items-center gap-1 font-medium truncate">
                            {TASK_ICONS[t.type] || TASK_ICONS.note}
                            {t.titre.substring(0, 20)}
                          </div>
                          {t.leadName && <div className="truncate text-[9px] opacity-70">{t.leadName}</div>}
                        </div>
                      )
                    })}
                    {sess.length > 0 && h === '09:00' && sess.map(s => (
                      <div key={s.id} className="px-1.5 py-1 rounded text-[10px] mb-0.5 bg-brand-50 text-brand-700 border border-brand-200 font-medium truncate">
                        {s.titre.substring(0, 20)}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ─── MOIS ─── */}
      {view === 'mois' && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7">
            {JOURS.map(j => (
              <div key={j} className="p-2 text-center text-[11px] font-semibold text-surface-400 border-b border-surface-100">{j}</div>
            ))}
            {monthGrid.map((d, i) => {
              const date = new Date(d)
              const isCurrentMonth = date.getMonth() === refDate.getMonth()
              const isToday = d === today
              const tasks = getTasksForDate(d)
              const sess = getSessionsForDate(d)
              return (
                <div key={i} className={cn(
                  'border-b border-r border-surface-100 p-1.5 min-h-[90px] transition-colors',
                  !isCurrentMonth && 'bg-surface-50/50',
                  isToday && 'bg-brand-50/20',
                )}>
                  <div className={cn(
                    'text-xs mb-1',
                    isToday ? 'font-bold text-brand-600' : isCurrentMonth ? 'text-surface-700' : 'text-surface-300',
                  )}>
                    {date.getDate()}
                  </div>
                  {tasks.slice(0, 3).map(t => {
                    const colors = TASK_COLORS[t.type] || TASK_COLORS.note
                    return (
                      <div key={t.id} className={cn('px-1 py-0.5 rounded text-[9px] mb-0.5 truncate font-medium', colors.bg, colors.text)}>
                        {t.heure} {t.titre.substring(0, 15)}
                      </div>
                    )
                  })}
                  {tasks.length > 3 && <div className="text-[9px] text-surface-400 px-1">+{tasks.length - 3}</div>}
                  {sess.map(s => (
                    <div key={s.id} className="px-1 py-0.5 rounded text-[9px] mb-0.5 truncate font-medium bg-brand-50 text-brand-700">
                      {s.titre.substring(0, 15)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── LISTE ─── */}
      {view === 'liste' && (
        <div className="space-y-2">
          {/* Overdue */}
          {interactions.filter(t => !t.done && t.date < today).length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-danger-600 mb-2">En retard</div>
              {interactions.filter(t => !t.done && t.date < today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map(t => (
                <TaskRow key={t.id} task={t} isOverdue />
              ))}
            </div>
          )}

          {/* Today */}
          {interactions.filter(t => t.date === today).length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-brand-600 mb-2">Aujourd'hui</div>
              {interactions.filter(t => t.date === today).sort((a, b) => a.heure.localeCompare(b.heure)).map(t => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}

          {/* Upcoming */}
          <div>
            <div className="text-xs font-semibold text-surface-500 mb-2">A venir</div>
            {listItems.filter(t => t.date > today).map(t => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>

          {listItems.length === 0 && (
            <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
              <CalendarDays className="h-6 w-6 text-surface-400 mb-3" />
              <p className="text-sm text-surface-500">Aucune tâche planifiée</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, isOverdue }: { task: Task; isOverdue?: boolean }) {
  const colors = TASK_COLORS[task.type] || TASK_COLORS.note
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl mb-1.5 border', isOverdue ? 'bg-danger-50/50 border-danger-100' : 'bg-white border-surface-200/80')}>
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
        <span className={colors.text}>{TASK_ICONS[task.type] || TASK_ICONS.note}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-surface-800 truncate">{task.titre}</div>
        <div className="text-xs text-surface-500 mt-0.5">
          {task.leadName && `${task.leadName} `}
          {task.leadEntreprise && `· ${task.leadEntreprise}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn('text-xs font-medium', isOverdue ? 'text-danger-600' : 'text-surface-700')}>
          {new Date(task.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </div>
        <div className="text-[11px] text-surface-400">{task.heure}</div>
      </div>
    </div>
  )
}
