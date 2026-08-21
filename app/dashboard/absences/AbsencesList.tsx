'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserX, ChevronDown, ChevronRight, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { justifierAbsencesAction } from './actions'

const MOTIFS = [
  'Maladie / arrêt de travail',
  'Raison professionnelle (service, remplacement)',
  'Raison personnelle ou familiale',
  'Retard — présent en partie',
  'Abandon de la formation',
  'Absence injustifiée',
]

const CRENEAU: Record<string, string> = { matin: 'matin', apres_midi: 'après-midi', journee: 'journée' }

interface Groupe {
  sessionId: string
  reference: string
  formation: string
  client: string
  dateDebut: string
  absences: { id: string; apprenant: string; apprenantId: string; date: string; creneau: string }[]
}

interface GroupeJustifie {
  sessionId: string
  reference: string
  formation: string
  client: string
  dateDebut: string
  stagiaires: { apprenant: string; motif: string; dates: string[]; nb: number }[]
}

/**
 * Justification des absences en rafale (indicateur 12).
 *
 * La sélection se fait par stagiaire — une absence couvre généralement ses
 * deux créneaux, parfois plusieurs jours — puis un motif s'applique à tout ce
 * qui est coché.
 */
export function AbsencesList({ groupes, justifies = [] }: { groupes: Groupe[]; justifies?: GroupeJustifie[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({})
  const [coches, setCoches] = useState<Record<string, boolean>>({})
  const [motif, setMotif] = useState(MOTIFS[0])
  const [autre, setAutre] = useState('')
  const [enCours, setEnCours] = useState(false)

  // Le compte parlant est en stagiaires, pas en demi-journées : une absence
  // de trois jours ferait sinon six « absences » à l'écran.
  const total = useMemo(
    () => groupes.reduce((a, g) => a + new Set(g.absences.map((x) => x.apprenantId)).size, 0),
    [groupes])
  const selection = useMemo(() => Object.entries(coches).filter(([, v]) => v).map(([k]) => k), [coches])

  function cocherStagiaire(g: Groupe, apprenantId: string, valeur: boolean) {
    const maj = { ...coches }
    for (const a of g.absences) if (a.apprenantId === apprenantId) maj[a.id] = valeur
    setCoches(maj)
  }

  async function justifier() {
    const motifFinal = motif === 'Autre' ? autre.trim() : motif
    if (!motifFinal) { toast('error', 'Précisez le motif'); return }
    setEnCours(true)
    const r = await justifierAbsencesAction(selection, motifFinal)
    setEnCours(false)
    if (r.success) {
      toast('success', `${r.data?.justifiees ?? 0} absence(s) justifiée(s)`)
      setCoches({})
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Absences à justifier</h1>
        <p className="text-sm text-surface-500 mt-1">
          {total} stagiaire(s) absent(s) sans motif sur les sessions dont la présence est suivie dans le CRM.
          Toute absence doit être justifiée au dossier (indicateur 12) — cochez, choisissez le motif, appliquez.
        </p>
      </div>

      {/* Barre d'application du motif */}
      <div className="card p-3 flex items-center gap-3 flex-wrap sticky top-2 z-10">
        <span className={cn('text-sm tabular-nums', selection.length ? 'text-surface-900 font-medium' : 'text-surface-400')}>
          {selection.length} sélectionnée(s)
        </span>
        <select value={motif} onChange={(e) => setMotif(e.target.value)} className="input-base !w-auto text-sm">
          {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value="Autre">Autre…</option>
        </select>
        {motif === 'Autre' && (
          <input value={autre} onChange={(e) => setAutre(e.target.value)} placeholder="Motif"
            className="input-base !w-56 text-sm" />
        )}
        <button onClick={justifier} disabled={!selection.length || enCours}
          className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-50">
          {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Justifier
        </button>
      </div>

      {groupes.length === 0 && (
        <div className="card p-10 text-center text-sm text-surface-500">
          Aucune absence à justifier : toutes portent leur motif.
        </div>
      )}

      {groupes.map((g) => {
        const ouvert = ouverts[g.sessionId] !== false
        // Regroupement par stagiaire : c'est l'unité naturelle de la justification.
        const parStagiaire = new Map<string, typeof g.absences>()
        for (const a of g.absences) {
          if (!parStagiaire.has(a.apprenantId)) parStagiaire.set(a.apprenantId, [])
          parStagiaire.get(a.apprenantId)!.push(a)
        }
        return (
          <div key={g.sessionId} className="card overflow-hidden">
            <div className="w-full px-4 py-3 flex items-center gap-3">
              <UserX className="h-4 w-4 text-amber-500 shrink-0" />
              {/* La session est cliquable : on retrouve les mêmes absences
                  sur sa feuille de pointage — c'est la preuve croisée. */}
              <Link href={`/dashboard/sessions/${g.sessionId}`} className="flex-1 min-w-0 hover:opacity-75 transition-opacity">
                <span className="text-sm font-medium text-surface-900">{g.reference}</span>
                <span className="text-sm text-surface-500"> — {g.client}</span>
                <div className="text-xs text-surface-400 truncate">{g.formation} · {g.dateDebut ? formatDate(g.dateDebut) : ''}</div>
              </Link>
              <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0">{parStagiaire.size} stagiaire(s)</span>
              <button onClick={() => setOuverts((o) => ({ ...o, [g.sessionId]: !ouvert }))} className="p-1 -m-1">
                {ouvert ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
              </button>
            </div>
            {ouvert && (
              <div className="border-t border-surface-100 divide-y divide-surface-100">
                {[...parStagiaire.entries()].map(([apprenantId, absences]: [string, Groupe['absences']]) => {
                  const toutes = absences.every((a) => coches[a.id])
                  return (
                    <label key={apprenantId} className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-surface-50">
                      <input type="checkbox" checked={toutes}
                        onChange={(e) => cocherStagiaire(g, apprenantId, e.target.checked)}
                        className="h-4 w-4 accent-surface-900" />
                      <span className="text-sm text-surface-900 flex-1">{absences[0].apprenant}</span>
                      <span className="text-xs text-surface-500">
                        {absences.length <= 3
                          ? absences.map((a) => `${formatDate(a.date, { day: 'numeric', month: 'short' })} ${CRENEAU[a.creneau] || a.creneau}`).join(' · ')
                          : (() => {
                              const dates = absences.map((a) => String(a.date)).sort()
                              return `${absences.length} demi-journées · du ${formatDate(dates[0], { day: 'numeric', month: 'short' })} au ${formatDate(dates[dates.length - 1], { day: 'numeric', month: 'short' })}`
                            })()}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Trace des justifications : les absences motivées restent au dossier
          (indicateur 12) — stagiaire, dates, motif, par session. */}
      {justifies.length > 0 && (
        <div className="pt-4">
          <h2 className="text-lg font-heading font-bold text-surface-900 tracking-heading">Absences justifiées</h2>
          <p className="text-sm text-surface-500 mt-1 mb-4">
            {justifies.reduce((a, g) => a + g.stagiaires.length, 0)} justification(s) au dossier — la trace conservée pour l&apos;audit.
          </p>
          <div className="space-y-3">
            {justifies.map((g) => (
              <div key={g.sessionId} className="card overflow-hidden">
                <Link href={`/dashboard/sessions/${g.sessionId}`}
                  className="block px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <span className="text-sm font-medium text-surface-900">{g.reference}</span>
                  <span className="text-sm text-surface-500"> — {g.client}</span>
                  <div className="text-xs text-surface-400 truncate">{g.formation} · {g.dateDebut ? formatDate(g.dateDebut) : ''}</div>
                </Link>
                <div className="divide-y divide-surface-100">
                  {g.stagiaires.map((s, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-sm text-surface-900">{s.apprenant}</span>
                      <span className="text-xs text-surface-500">
                        {s.nb <= 2
                          ? s.dates.map((d) => formatDate(d, { day: 'numeric', month: 'short' })).join(' · ')
                          : `${s.nb} demi-journées · du ${formatDate(s.dates[0], { day: 'numeric', month: 'short' })} au ${formatDate(s.dates[s.dates.length - 1], { day: 'numeric', month: 'short' })}`}
                      </span>
                      <span className="ml-auto text-xs font-medium text-surface-700 bg-surface-100 rounded-full px-2.5 py-1">{s.motif}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
