'use client'

import { useRouter } from 'next/navigation'
import { Check, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui'
import { updatePoeiStatutAction } from '../actions'
import { POEI_STATUS_LABELS, POEI_WORKFLOW } from '@/lib/types/poei'
import { STATUTS_MANUELS } from '@/lib/poei-statut'
import type { PoeiStatus } from '@/lib/types/poei'

const statusOptions = Object.entries(POEI_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))

export function PoeiStatusBar({
  poeiId, statut, statutEnregistre, blocages = [],
}: {
  poeiId: string
  /** Statut déduit des faits — c'est lui qui est affiché. */
  statut: PoeiStatus
  /** Statut stocké, utile seulement pour les décisions humaines. */
  statutEnregistre?: PoeiStatus
  blocages?: string[]
}) {
  const { toast } = useToast()
  const router = useRouter()

  async function change(s: string) {
    const result = await updatePoeiStatutAction(poeiId, s)
    if (result.success) { toast('success', 'Statut mis à jour'); router.refresh() }
    else toast('error', result.error || 'Erreur')
  }

  const currentIdx = POEI_WORKFLOW.indexOf(statut)
  const isTerminal = statut === 'refuse' || statut === 'abandonne'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="section-label">Avancement</span>
          <div className="text-sm font-heading font-semibold text-surface-900 mt-0.5">
            {POEI_STATUS_LABELS[statut]}
            {!STATUTS_MANUELS.includes(statut) && (
              <span className="ml-2 text-xs font-normal text-surface-400">déduit du dossier</span>
            )}
          </div>
        </div>
        {/* Seules les décisions humaines se saisissent : refus, abandon,
            embauche. Le reste se déduit des candidats, du dépôt France Travail
            et des dates de session. */}
        <select
          value={STATUTS_MANUELS.includes(statutEnregistre as PoeiStatus) ? statutEnregistre : ''}
          onChange={(e) => change(e.target.value || 'montage')}
          className="input-base h-9 w-56 text-sm"
        >
          <option value="">Aucune décision particulière</option>
          {statusOptions.filter((o) => STATUTS_MANUELS.includes(o.value as PoeiStatus)).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {blocages.length > 0 && (
        <div className="rounded-xl border border-danger-200 bg-danger-50/40 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="h-4 w-4 text-danger-600" />
            <span className="text-sm font-medium text-surface-800">
              {blocages.length} point{blocages.length > 1 ? 's' : ''} à compléter
            </span>
          </div>
          <ul className="space-y-0.5 pl-6">
            {blocages.map((b) => (
              <li key={b} className="text-sm text-danger-700 list-disc">{b}</li>
            ))}
          </ul>
        </div>
      )}

      {!isTerminal && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {POEI_WORKFLOW.map((step, i) => {
            const done = currentIdx >= 0 && i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <div key={step} className="flex items-center shrink-0">
                <button
                  onClick={() => change(step)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isCurrent ? 'bg-sky-500 text-white' : done ? 'bg-sky-50 text-sky-700' : 'bg-surface-50 text-surface-400 hover:bg-surface-100'
                  }`}
                >
                  {done && !isCurrent && <Check className="h-3 w-3" />}
                  {POEI_STATUS_LABELS[step]}
                </button>
                {i < POEI_WORKFLOW.length - 1 && <div className={`h-px w-3 ${done ? 'bg-sky-300' : 'bg-surface-200'}`} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
