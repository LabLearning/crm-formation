'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Save } from '@/components/ui/icons'
import { Badge, BackLink, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { updateReclamationFieldsAction, updateReclamationStatusAction } from '../actions'

const STATUTS: Record<string, { label: string; variant: any }> = {
  recue: { label: 'Reçue', variant: 'warning' },
  en_analyse: { label: 'En analyse', variant: 'info' },
  action_corrective: { label: 'Action corrective', variant: 'info' },
  cloturee: { label: 'Clôturée', variant: 'success' },
}

/** La trace du traitement : chaque étape écrite, datée, et l'émetteur informé
 *  à la clôture — exactement ce qu'un auditeur ouvre. */
export function ReclamationDetail({ rec }: { rec: any }) {
  const { toast } = useToast()
  const router = useRouter()
  const [enCours, setEnCours] = useState<string | null>(null)

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnCours('champs')
    const r = await updateReclamationFieldsAction(rec.id, new FormData(e.currentTarget))
    setEnCours(null)
    if (r.success) { toast('success', 'Traitement enregistré'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  async function passer(statut: string, details?: Record<string, string>) {
    setEnCours(statut)
    const r = await updateReclamationStatusAction(rec.id, statut, details)
    setEnCours(null)
    if (r.success) { toast('success', 'Statut mis à jour'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  const etapes = [
    { label: 'Réception', date: rec.date_reception, fait: true },
    { label: 'Analyse', date: rec.date_analyse, fait: !!rec.date_analyse },
    { label: 'Action corrective', date: rec.date_resolution, fait: !!rec.date_resolution },
    { label: 'Clôture', date: rec.date_cloture, fait: !!rec.date_cloture },
  ]
  const st = STATUTS[rec.status] || STATUTS.recue

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <BackLink fallbackHref="/dashboard/reclamations" label="Réclamations" />
        <div className="flex items-center justify-between gap-3 flex-wrap mt-1">
          <h1 className="text-xl font-heading font-bold text-surface-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {rec.numero} — {rec.objet}
          </h1>
          <Badge variant={st.variant} dot>{st.label}</Badge>
        </div>
        <p className="text-sm text-surface-500 mt-1">
          {rec.origine ? `Origine : ${rec.origine}` : ''}
          {rec.emetteur_nom ? ` · ${rec.emetteur_nom}` : ''}
          {rec.emetteur_email ? ` · ${rec.emetteur_email}` : ''}
          {rec.session ? ` · session ${rec.session.reference || rec.session.intitule || ''}` : ''}
          {rec.client ? ` · ${rec.client.nom_commercial || rec.client.raison_sociale}` : ''}
        </p>
      </div>

      {/* Frise du traitement : chaque étape, sa date */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {etapes.map((e, i) => (
            <div key={e.label} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-surface-300" />}
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${
                e.fait ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-400'}`}>
                {e.fait && <CheckCircle2 className="h-3.5 w-3.5" />}
                {e.label}
                {e.date ? ` · ${formatDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={enregistrer} className="card p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-surface-800">Description de la réclamation</span>
          <textarea name="description" rows={3} defaultValue={rec.description || ''} className="input-base mt-1.5 font-normal" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Analyse des causes</span>
            <span className="block text-xs text-surface-400">Ce qui s&apos;est réellement passé, et pourquoi</span>
            <textarea name="analyse" rows={4} defaultValue={rec.analyse || ''} className="input-base mt-1.5 font-normal" />
            <input type="date" name="date_analyse" defaultValue={rec.date_analyse || ''} className="input-base mt-2 !py-1.5 text-xs w-fit" title="Date de l'analyse" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-surface-800">Action corrective menée</span>
            <span className="block text-xs text-surface-400">Ce qui a été fait, concrètement, pour corriger et éviter la récidive</span>
            <textarea name="action_corrective" rows={4} defaultValue={rec.action_corrective || ''} className="input-base mt-1.5 font-normal" />
            <input type="date" name="date_resolution" defaultValue={rec.date_resolution || ''} className="input-base mt-2 !py-1.5 text-xs w-fit" title="Date de l'action" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-surface-800">Commentaire de clôture</span>
          <span className="block text-xs text-surface-400">La réponse apportée à l&apos;émetteur — envoyée par email à la clôture</span>
          <textarea name="commentaire_cloture" rows={2} defaultValue={rec.commentaire_cloture || ''} className="input-base mt-1.5 font-normal" />
        </label>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="text-xs text-surface-500">
            Priorité
            <select name="priorite" defaultValue={rec.priorite || 'moyenne'} className="input-base mt-1 !py-1.5 text-sm">
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
            </select>
          </label>
          <button type="submit" disabled={!!enCours}
            className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-60">
            {enCours === 'champs' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer le traitement
          </button>
        </div>
      </form>

      {rec.status !== 'cloturee' && (
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-surface-600 flex-1">Faire avancer la réclamation :</span>
          {rec.status === 'recue' && (
            <button onClick={() => passer('en_analyse')} disabled={!!enCours}
              className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-60">
              {enCours === 'en_analyse' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Passer en analyse
            </button>
          )}
          {rec.status === 'en_analyse' && (
            <button onClick={() => passer('action_corrective', { action_corrective: rec.action_corrective || '' })} disabled={!!enCours}
              className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-60">
              {enCours === 'action_corrective' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Action corrective engagée
            </button>
          )}
          {['en_analyse', 'action_corrective'].includes(rec.status) && (
            <button onClick={() => passer('cloturee', { commentaire_cloture: rec.commentaire_cloture || '', resolution_satisfaisante: 'true' })} disabled={!!enCours}
              className="btn-primary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm disabled:opacity-60">
              {enCours === 'cloturee' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Clôturer et répondre à l&apos;émetteur
            </button>
          )}
        </div>
      )}
    </div>
  )
}
