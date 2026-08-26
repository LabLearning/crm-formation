'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Download, Save, Loader2 } from '@/components/ui/icons'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { COMPETENCES_FORMATEUR } from '@/lib/evaluation-formateur'
import { enregistrerEvaluationFormateurAction } from '../evaluation-actions'

/**
 * Fiche d'évaluation du profil et des compétences (indicateur 21) — la trame
 * de l'audit blanc, saisissable en une minute : dix compétences notées de
 * 1 à 5 d'un clic, quatre champs libres, et le PDF au bout.
 */
export function EvaluationFormateur({ formateurId, initial }: {
  formateurId: string
  initial: any | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [notes, setNotes] = useState<Record<string, number>>(initial?.notes || {})
  const [enCours, setEnCours] = useState(false)

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnCours(true)
    const fd = new FormData(e.currentTarget)
    for (const [cle, v] of Object.entries(notes)) fd.set(`note_${cle}`, String(v))
    const r = await enregistrerEvaluationFormateurAction(formateurId, fd)
    setEnCours(false)
    if (r.success) { toast('success', 'Évaluation enregistrée'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  const noteMoyenne = (() => {
    const v = Object.values(notes)
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null
  })()

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Évaluation du profil et des compétences
          </span>
          {noteMoyenne && (
            <span className="text-xs font-bold text-surface-900 tabular-nums bg-surface-100 rounded-full px-2 py-0.5">
              {noteMoyenne} / 5
            </span>
          )}
        </div>
        {initial && (
          <a href={`/api/pdf/evaluation-formateur/${formateurId}`} target="_blank" rel="noreferrer"
            className="btn-secondary inline-flex items-center gap-1.5 !py-1 !px-2.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Fiche PDF
          </a>
        )}
      </div>

      <form onSubmit={enregistrer} className="p-4 space-y-4">
        <div className="divide-y divide-surface-100">
          {COMPETENCES_FORMATEUR.map((c) => (
            <div key={c.cle} className="py-2 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-surface-800 flex-1 min-w-[240px]">{c.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button"
                    onClick={() => setNotes((x) => ({ ...x, [c.cle]: n }))}
                    className={cn('h-7 w-7 rounded-lg text-xs font-semibold transition-colors',
                      notes[c.cle] === n
                        ? 'bg-surface-900 text-white'
                        : 'bg-surface-100 text-surface-500 hover:bg-surface-200')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-surface-500">
            Qualité de la documentation pédagogique
            <input name="qualite_documentation" defaultValue={initial?.qualite_documentation || ''} className="input-base mt-1" />
          </label>
          <label className="text-xs text-surface-500">
            Qualité des échanges avec les stagiaires
            <input name="qualite_echanges" defaultValue={initial?.qualite_echanges || ''} className="input-base mt-1" />
          </label>
          <label className="text-xs text-surface-500">
            Disponibilités
            <input name="disponibilites" defaultValue={initial?.disponibilites || ''} className="input-base mt-1" />
          </label>
          <label className="text-xs text-surface-500">
            Compétences techniques
            <input name="competences_techniques" defaultValue={initial?.competences_techniques || ''} className="input-base mt-1" />
          </label>
        </div>
        <label className="block text-xs text-surface-500">
          Synthèse
          <textarea name="synthese" rows={2} defaultValue={initial?.synthese || ''} className="input-base mt-1" />
        </label>
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs text-surface-500">
            Date d&apos;évaluation
            <input type="date" name="date_evaluation"
              defaultValue={initial?.date_evaluation || new Date().toISOString().slice(0, 10)}
              className="input-base mt-1" />
          </label>
          <button type="submit" disabled={enCours}
            className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-60">
            {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}
