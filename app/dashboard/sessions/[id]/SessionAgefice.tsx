'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui'
import { DossierAgeficeForm, type DossierAgefice } from '@/components/agefice/DossierAgeficeForm'
import { creerDossierDepuisSessionAction } from '@/app/dashboard/agefice/actions'

/**
 * Onglet AGEFICE de la session : tout le suivi du financement dirigeant se
 * gère ici — création du dossier, phases prise en charge / remboursement,
 * pièces, règlement du client. La page /dashboard/agefice n'est qu'une vue
 * d'ensemble inter-sessions (alertes de délais).
 */
export function SessionAgefice({ sessionId, dossier }: {
  sessionId: string
  dossier: DossierAgefice | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function creer() {
    setCreating(true)
    const r = await creerDossierDepuisSessionAction(sessionId)
    setCreating(false)
    if (r.success) { toast('success', 'Dossier AGEFICE créé pour cette session'); router.refresh() }
    else toast('error', r.error || 'Erreur')
  }

  if (!dossier) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-14 px-8 gap-3">
        <Landmark className="h-6 w-6 text-surface-400" />
        <div>
          <p className="text-sm font-medium text-surface-900">Client financé par l&apos;AGEFICE</p>
          <p className="text-sm text-surface-500 mt-1 max-w-md">
            Créez le dossier de prise en charge pour cette session : le dirigeant (premier inscrit),
            la formation et les dates seront repris automatiquement.
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
    <div className="card p-5">
      <DossierAgeficeForm dossier={dossier} />
    </div>
  )
}
