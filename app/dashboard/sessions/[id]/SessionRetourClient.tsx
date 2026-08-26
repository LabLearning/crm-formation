'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PhoneCall, Save, Star } from '@/components/ui/icons'
import { useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { enregistrerRetourClientAction } from './retour-client-actions'

/**
 * Retour client par téléphone : l'appel post-formation, noté tel quel —
 * affiché sous le rapport du formateur (les deux regards sur la même
 * session), et compté comme appréciation d'entreprise (ind. 30).
 */
export function SessionRetourClient({ sessionId, retours }: {
  sessionId: string
  retours: { id: string; note_globale: number | null; commentaire: string | null; repondant_nom: string | null; repondant_fonction: string | null; created_at: string }[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [enCours, setEnCours] = useState(false)
  const [note, setNote] = useState<number | null>(null)
  const [ouvert, setOuvert] = useState(retours.length === 0)

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnCours(true)
    const fd = new FormData(e.currentTarget)
    if (note) fd.set('note', String(note))
    const r = await enregistrerRetourClientAction(sessionId, fd)
    setEnCours(false)
    if (r.success) { toast('success', 'Retour client enregistré'); setOuvert(false); setNote(null); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-brand-500" />
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Retour client (appel)</span>
        </div>
        {!ouvert && (
          <button onClick={() => setOuvert(true)} className="btn-secondary !py-1 !px-2.5 text-xs">
            Ajouter un retour
          </button>
        )}
      </div>

      {retours.length > 0 && (
        <div className="divide-y divide-surface-50">
          {retours.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                {r.note_globale != null && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-surface-900">
                    <Star className="h-4 w-4 text-amber-400" /> {r.note_globale}/5
                  </span>
                )}
                {r.repondant_nom && <span className="text-sm text-surface-700">{r.repondant_nom}</span>}
                <span className="text-xs text-surface-400 ml-auto">
                  Appel du {formatDate(r.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {r.commentaire && <p className="text-sm text-surface-600 mt-1.5 whitespace-pre-line">{r.commentaire}</p>}
            </div>
          ))}
        </div>
      )}

      {ouvert && (
        <form onSubmit={soumettre} className="p-4 space-y-3 border-t border-surface-100 bg-surface-50/40">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-surface-500">Interlocuteur
              <input name="interlocuteur" placeholder="Prénom Nom" className="input-base mt-1" />
            </label>
            <label className="text-xs text-surface-500">Fonction
              <input name="fonction" placeholder="Gérant, responsable…" className="input-base mt-1" />
            </label>
          </div>
          {/* Les appels sont notés sur papier à chaud puis reportés ici : la
              date saisie est celle de l'appel réel, pas celle de la saisie. */}
          <label className="text-xs text-surface-500 block sm:max-w-[240px]">Date de l&apos;appel
            <input name="date_appel" type="date" defaultValue={new Date().toISOString().slice(0, 10)}
              className="input-base mt-1" required />
          </label>
          <div>
            <div className="text-xs text-surface-500 mb-1.5">Satisfaction exprimée (facultatif)</div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setNote(note === n ? null : n)}
                  className={`h-8 w-8 rounded-lg text-sm font-semibold transition-colors ${
                    note === n ? 'bg-surface-900 text-white' : 'bg-white border border-surface-200 text-surface-500 hover:border-surface-400'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs text-surface-500">Ce que le client a dit
            <textarea name="verbatim" rows={3} required
              placeholder="Ses mots, tels quels : ce qui a plu, ce qui a manqué, les suites envisagées…"
              className="input-base mt-1 font-normal" />
          </label>
          <div className="flex justify-end gap-2">
            {retours.length > 0 && (
              <button type="button" onClick={() => setOuvert(false)} className="btn-secondary !py-1.5 !px-3 text-sm">Annuler</button>
            )}
            <button type="submit" disabled={enCours}
              className="btn-primary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-60">
              {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer le retour
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
