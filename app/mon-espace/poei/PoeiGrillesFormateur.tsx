'use client'

import { useState } from 'react'
import { ClipboardCheck, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PoeiEvaluations } from '@/app/dashboard/poei/[id]/PoeiEvaluations'
import { formatDate } from '@/lib/utils'

export function PoeiGrillesFormateur({ poeis, candidats, grilles }: { poeis: any[]; candidats: any[]; grilles: any[] }) {
  const [sel, setSel] = useState<string>(poeis[0]?.id || '')
  const poei = poeis.find((p) => p.id === sel)
  const cands = candidats.filter((c) => c.poei_id === sel).map((c) => ({
    id: c.id,
    apprenant_id: c.apprenant?.id || c.apprenant_id || null,
    nom: `${c.apprenant?.prenom || c.prenom || ''} ${c.apprenant?.nom || c.nom || ''}`.trim() || 'Candidat',
  }))
  const gr = grilles.filter((g) => g.poei_id === sel)
  const clientNom = (p: any) => p?.client?.nom_commercial || p?.client?.raison_sociale || ''

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-brand-500" /> Évaluations POEI
        </h1>
        <p className="text-surface-500 mt-1 text-sm">Remplissez la grille de chaque candidat semaine après semaine, puis l'évaluation finale.</p>
      </div>

      {poeis.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {poeis.map((p) => (
            <button key={p.id} onClick={() => setSel(p.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${sel === p.id ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
              {clientNom(p) || p.reference || p.intitule}
            </button>
          ))}
        </div>
      )}

      {poei && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-heading font-semibold text-surface-900">{clientNom(poei) || poei.intitule}</div>
              <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {poei.date_debut ? formatDate(poei.date_debut, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {poei.date_fin ? ` → ${formatDate(poei.date_fin, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                {poei.reference && <span className="text-surface-400">· {poei.reference}</span>}
              </div>
            </div>
            {poei.statut && <Badge variant="info">{poei.statut}</Badge>}
          </div>
        </div>
      )}

      <PoeiEvaluations poeiId={sel} candidats={cands} grilles={gr} />
    </div>
  )
}
