'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Plus, Loader2, User } from '@/components/ui/icons'
import { useToast } from '@/components/ui'
import { DossierAgeficeForm, type DossierAgefice } from '@/components/agefice/DossierAgeficeForm'
import { creerDossierDepuisSessionAction } from '@/app/dashboard/agefice/actions'
import { AGEFICE_STATUTS } from '@/lib/agefice'

/**
 * Onglet AGEFICE de la session : tout le suivi du financement dirigeant se
 * gère ici — UN DOSSIER PAR DIRIGEANT (plusieurs dirigeants peuvent se former
 * sur la même session, chacun a son accord, sa facture, son attestation).
 * La page /dashboard/agefice n'est qu'une vue d'ensemble (alertes de délais).
 */
export function SessionAgefice({ sessionId, dossiers }: {
  sessionId: string
  dossiers: (DossierAgefice & { apprenant?: { prenom?: string | null; nom?: string | null } })[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function creer() {
    setCreating(true)
    const r = await creerDossierDepuisSessionAction(sessionId)
    setCreating(false)
    if (r.success) { toast('success', 'Dossier AGEFICE créé'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  if (!dossiers.length) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-14 px-8 gap-3">
        <Landmark className="h-6 w-6 text-surface-400" />
        <div>
          <p className="text-sm font-medium text-surface-900">Financement AGEFICE</p>
          <p className="text-sm text-surface-500 mt-1 max-w-md">
            Créez le dossier de prise en charge du premier dirigeant inscrit : la formation
            et les dates seront reprises automatiquement. Un dossier par dirigeant.
          </p>
        </div>
        <button onClick={creer} disabled={creating}
          className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-4 text-sm disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer le dossier AGEFICE
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dossiers.map((d) => (
        <div key={d.id} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 flex items-center gap-3 flex-wrap">
            <span className="h-8 w-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-brand-600" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-heading font-semibold text-surface-900">
                {`${d.apprenant?.prenom || ''} ${d.apprenant?.nom || ''}`.trim() || 'Dirigeant'}
              </div>
              <div className="text-xs text-surface-500">
                {d.numero_dossier ? `Dossier AGEFICE n° ${d.numero_dossier}` : 'N° de dossier à renseigner'}
              </div>
            </div>
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 rounded-full px-2.5 py-1">
              {(AGEFICE_STATUTS as any)[d.statut as any] || d.statut}
            </span>
          </div>
          <div className="p-5">
            <DossierAgeficeForm dossier={d} />
          </div>
        </div>
      ))}
      <button onClick={creer} disabled={creating}
        className="inline-flex items-center gap-1.5 text-sm font-medium rounded-xl border border-surface-200 bg-white px-4 py-2 text-surface-700 hover:border-surface-300 transition-colors disabled:opacity-50">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Ajouter un dossier pour un autre inscrit
      </button>
    </div>
  )
}
