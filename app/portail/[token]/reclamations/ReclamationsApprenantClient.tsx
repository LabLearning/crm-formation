'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast, Badge } from '@/components/ui'
import { deposerReclamationAction } from './actions'

const STATUS: Record<string, { label: string; variant: any }> = {
  recue: { label: 'Reçue', variant: 'warning' },
  en_analyse: { label: 'En analyse', variant: 'info' },
  action_corrective: { label: 'Action corrective en cours', variant: 'purple' },
  cloturee: { label: 'Clôturée', variant: 'success' },
}

interface Rec {
  id: string
  numero: string
  objet: string
  description: string | null
  status: string
  date_reception: string | null
  date_cloture: string | null
  commentaire_cloture: string | null
}

export function ReclamationsApprenantClient({ token, reclamations }: { token: string; reclamations: Rec[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [ouvert, setOuvert] = useState(reclamations.length === 0)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnCours(true)
    const r = await deposerReclamationAction(token, new FormData(e.currentTarget))
    setEnCours(false)
    if (r.success) {
      toast('success', 'Réclamation transmise — nous revenons vers vous rapidement')
      setOuvert(false)
      router.refresh()
    } else toast('error', r.error || 'Erreur')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-heading font-bold text-surface-900">Mes réclamations</h1>
          <p className="text-sm text-surface-500 mt-1">
            Un problème pendant ou après votre formation ? Déposez votre réclamation ici — chaque demande
            est analysée et reçoit une réponse.
          </p>
        </div>
        {!ouvert && (
          <button onClick={() => setOuvert(true)} className="btn-primary !py-2 !px-4 text-sm shrink-0">
            Déposer une réclamation
          </button>
        )}
      </div>

      {ouvert && (
        <form onSubmit={soumettre} className="card p-5 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Objet</span>
            <input name="objet" required placeholder="En quelques mots"
              className="input-base mt-1.5" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Description</span>
            <textarea name="description" required rows={4}
              placeholder="Décrivez ce qui s'est passé, la session concernée, ce que vous attendez"
              className="input-base mt-1.5" />
          </label>
          <div className="flex items-center gap-2 justify-end">
            {reclamations.length > 0 && (
              <button type="button" onClick={() => setOuvert(false)} className="btn-secondary !py-2 !px-4 text-sm">Annuler</button>
            )}
            <button type="submit" disabled={enCours} className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-50">
              {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </button>
          </div>
        </form>
      )}

      {reclamations.length > 0 && (
        <div className="space-y-3">
          {reclamations.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <AlertCircle className="h-4 w-4 text-brand-500 shrink-0" />
                {r.numero && <span className="text-sm font-mono text-brand-600">{r.numero}</span>}
                <span className="text-sm font-semibold text-surface-900">{r.objet}</span>
                <span className="ml-auto"><Badge variant={STATUS[r.status]?.variant || 'default'} dot>{STATUS[r.status]?.label || r.status}</Badge></span>
              </div>
              {r.description && <p className="text-sm text-surface-600 mt-2 whitespace-pre-line">{r.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-2xs text-surface-400">
                {r.date_reception && <span>Déposée le {formatDate(r.date_reception, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                {r.date_cloture && <span>Clôturée le {formatDate(r.date_cloture, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
              </div>
              {r.status === 'cloturee' && r.commentaire_cloture && (
                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-900 whitespace-pre-line">{r.commentaire_cloture}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
