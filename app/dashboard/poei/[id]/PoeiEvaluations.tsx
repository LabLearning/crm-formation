'use client'

import { useState, useMemo } from 'react'
import { ClipboardCheck, Plus, CheckCircle2, Clock, Download } from 'lucide-react'
import { Badge, Modal } from '@/components/ui'
import { GrilleEvaluation } from '@/components/poei/GrilleEvaluation'
import { grilleProgress } from '@/lib/poei-grille'
import { formatDate } from '@/lib/utils'

interface Cand { id: string; apprenant_id: string | null; nom: string }
interface Grille { id: string; apprenant_id: string; semaine: number | null; statut: string; date_evaluation: string; items: any; [k: string]: any }

export function PoeiEvaluations({ poeiId, candidats, grilles }: { poeiId: string; candidats: Cand[]; grilles: Grille[] }) {
  const [open, setOpen] = useState<{ apprenantId: string; nom: string; semaine: number | null } | null>(null)

  // semaines déjà utilisées + prochaine
  const semaines = useMemo(() => {
    const s = new Set<number>()
    for (const g of grilles) if (g.semaine != null) s.add(g.semaine)
    return [...s].sort((a, b) => a - b)
  }, [grilles])
  const nextSem = (semaines[semaines.length - 1] || 0) + 1

  const gridOf = (aid: string, sem: number | null) => grilles.find((g) => g.apprenant_id === aid && g.semaine === sem)

  if (candidats.length === 0) {
    return <div className="card p-8 text-center text-sm text-surface-500">Ajoutez des candidats pour pouvoir les évaluer.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-heading font-semibold text-surface-900 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand-500" /> Évaluations des candidats
          </h3>
          <p className="text-sm text-surface-500 mt-0.5">Le formateur remplit la grille chaque semaine, puis l'évaluation finale.</p>
        </div>
        {grilles.length > 0 && (
          <a href={`/api/pdf/poei-grilles/${poeiId}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 shrink-0">
            <Download className="h-4 w-4" /> Télécharger tout (PDF)
          </a>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left text-xs text-surface-400">
                <th className="px-4 py-3 font-medium">Candidat</th>
                {semaines.map((s) => <th key={s} className="px-3 py-3 font-medium text-center whitespace-nowrap">S{s}</th>)}
                <th className="px-3 py-3 font-medium text-center whitespace-nowrap">+ S{nextSem}</th>
                <th className="px-4 py-3 font-medium text-center">Évaluation finale</th>
              </tr>
            </thead>
            <tbody>
              {candidats.map((c) => {
                if (!c.apprenant_id) return (
                  <tr key={c.id} className="border-b border-surface-50">
                    <td className="px-4 py-3 text-surface-800">{c.nom}</td>
                    <td colSpan={semaines.length + 2} className="px-4 py-3 text-xs text-surface-400">Candidat non rattaché à une fiche apprenant</td>
                  </tr>
                )
                const aid = c.apprenant_id
                const fin = gridOf(aid, null)
                return (
                  <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50/40">
                    <td className="px-4 py-3 font-medium text-surface-800">{c.nom}</td>
                    {semaines.map((s) => {
                      const g = gridOf(aid, s)
                      const p = g ? grilleProgress(g.items) : null
                      return (
                        <td key={s} className="px-3 py-3 text-center">
                          <button onClick={() => setOpen({ apprenantId: aid, nom: c.nom, semaine: s })}
                            className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-2xs transition-colors ${g ? (g.statut === 'validee' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100') : 'bg-surface-100 text-surface-400 hover:bg-surface-200'}`}>
                            {g ? (g.statut === 'validee' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />) : <Plus className="h-3.5 w-3.5" />}
                            {p && <span className="tabular-nums">{p.pctAcquis}%</span>}
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => setOpen({ apprenantId: aid, nom: c.nom, semaine: nextSem })}
                        className="p-1.5 rounded-lg bg-surface-100 text-surface-400 hover:bg-brand-50 hover:text-brand-600 transition-colors" title={`Ajouter la semaine ${nextSem}`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setOpen({ apprenantId: aid, nom: c.nom, semaine: null })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${fin ? (fin.statut === 'validee' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-50 text-amber-700 hover:bg-amber-100') : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                        {fin ? (fin.statut === 'validee' ? <><CheckCircle2 className="h-3.5 w-3.5" /> Validée</> : <><Clock className="h-3.5 w-3.5" /> Brouillon</>) : <><Plus className="h-3.5 w-3.5" /> Remplir</>}
                      </button>
                      {fin?.avis_final && <div className="text-2xs text-surface-500 mt-1">{fin.avis_final}</div>}
                      {fin && (
                        <a href={`/api/pdf/poei-grilles/${poeiId}?apprenant=${aid}&semaine=`} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-2xs text-brand-600 hover:underline mt-1">
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!open} onClose={() => setOpen(null)} size="lg"
        title={open ? `${open.nom} — ${open.semaine === null ? 'Évaluation finale' : `Semaine ${open.semaine}`}` : ''}>
        {open && (
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            <GrilleEvaluation poeiId={poeiId} apprenantId={open.apprenantId} apprenantNom={open.nom}
              semaine={open.semaine} initial={gridOf(open.apprenantId, open.semaine)} onSaved={() => setOpen(null)} />
          </div>
        )}
      </Modal>
    </div>
  )
}
