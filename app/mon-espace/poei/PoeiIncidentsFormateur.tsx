'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PoeiIncidents } from '@/components/poei/PoeiIncidents'
import type { IncidentPoei } from '@/components/poei/PoeiIncidents'

/**
 * Déclaration d'incident par le formateur, sur l'un de ses dossiers POEI.
 * Il déclare et suit ; c'est le gestionnaire qui prend en charge et clôt.
 */
export function PoeiIncidentsFormateur({
  poeis, candidats, incidents,
}: {
  poeis: { id: string; numero: string | null; client?: { raison_sociale?: string | null } | null }[]
  candidats: { id: string; poei_id: string; apprenant_id: string | null; apprenant?: { id: string; nom: string | null; prenom: string | null } | null }[]
  incidents: IncidentPoei[]
}) {
  const [poeiId, setPoeiId] = useState(poeis[0]?.id || '')
  if (poeis.length === 0) return null

  const duDossier = incidents.filter((i: any) => i.poei_id === poeiId)
  const candidatsDuDossier = candidats
    .filter((c) => c.poei_id === poeiId)
    .map((c) => ({
      id: c.apprenant?.id || c.apprenant_id || '',
      nom: `${c.apprenant?.prenom || ''} ${c.apprenant?.nom || ''}`.trim() || 'Candidat',
    }))
    .filter((c) => c.id)

  return (
    <section className="mt-8">
      {poeis.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {poeis.map((p) => (
            <button
              key={p.id}
              onClick={() => setPoeiId(p.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                poeiId === p.id
                  ? 'bg-surface-900 text-white border-surface-900'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300',
              )}
            >
              {p.numero || 'POEI'}
              {p.client?.raison_sociale ? ` · ${p.client.raison_sociale}` : ''}
            </button>
          ))}
        </div>
      )}

      <PoeiIncidents
        poeiId={poeiId}
        incidents={duDossier}
        candidats={candidatsDuDossier}
        peutTraiter={false}
      />

      <p className="text-xs text-surface-400 mt-3 flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        Vos déclarations remontent immédiatement au gestionnaire, qui les prend en charge et les clôt.
      </p>
    </section>
  )
}
