'use client'

import { useState, useMemo } from 'react'
import { ClipboardCheck, CheckCircle2, Clock, Download, Minus } from 'lucide-react'
import { Badge, Modal } from '@/components/ui'
import { GrilleEvaluation } from '@/components/poei/GrilleEvaluation'
import { grilleProgress } from '@/lib/poei-grille'
import { formatDate } from '@/lib/utils'
import { PoeiSection, PoeiVide } from './PoeiSection'

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
  const gridOf = (aid: string, sem: number | null) => grilles.find((g) => g.apprenant_id === aid && g.semaine === sem)

  if (candidats.length === 0) {
    return <PoeiVide icone={ClipboardCheck} texte="Ajoutez des candidats au dossier pour suivre leurs évaluations." />
  }

  return (
    <PoeiSection
      icone={ClipboardCheck}
      titre="Évaluations des candidats"
      sous="Remplies par le formateur depuis son espace, semaine après semaine puis en bilan final."
      actions={grilles.length > 0 ? (
        <a href={`/api/pdf/poei-grilles/${poeiId}`} target="_blank" rel="noreferrer"
          className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-sm">
          <Download className="h-4 w-4" /> Télécharger tout (PDF)
        </a>
      ) : undefined}
    >

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left text-xs text-surface-400">
                <th className="px-4 py-3 font-medium">Candidat</th>
                {semaines.map((s) => <th key={s} className="px-3 py-3 font-medium text-center whitespace-nowrap">S{s}</th>)}
                <th className="px-4 py-3 font-medium text-center">Évaluation finale</th>
              </tr>
            </thead>
            <tbody>
              {candidats.map((c) => {
                if (!c.apprenant_id) return (
                  <tr key={c.id} className="border-b border-surface-50">
                    <td className="px-4 py-3 text-surface-800">{c.nom}</td>
                    <td colSpan={semaines.length + 1} className="px-4 py-3 text-xs text-surface-400">Candidat non rattaché à une fiche apprenant</td>
                  </tr>
                )
                const aid = c.apprenant_id
                const fin = gridOf(aid, null)
                return (
                  <tr key={c.id} className="border-b border-surface-50 hover:bg-surface-50/40">
                    <td className="px-4 py-2 font-medium text-surface-800">{c.nom}</td>
                    {semaines.map((s) => {
                      const g = gridOf(aid, s)
                      const p = g ? grilleProgress(g.items) : null
                      return (
                        <td key={s} className="px-3 py-2 text-center">
                          {g ? (
                            <button onClick={() => setOpen({ apprenantId: aid, nom: c.nom, semaine: s })}
                              className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-2xs transition-colors ${g.statut === 'validee' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                              {g.statut === 'validee' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                              {p && <span className="tabular-nums">{p.pctAcquis}%</span>}
                            </button>
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-surface-200 mx-auto" />
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {fin?.avis_final && (
                          <span className={`hidden sm:inline text-2xs font-medium ${fin.avis_final.includes('DÉFAVORABLE') ? 'text-danger-600' : fin.avis_final.includes('RÉSERVES') ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {fin.avis_final.replace('AVIS ', '')}
                          </span>
                        )}
                        {fin ? (
                          <button onClick={() => setOpen({ apprenantId: aid, nom: c.nom, semaine: null })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${fin.statut === 'validee' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                            {fin.statut === 'validee' ? <><CheckCircle2 className="h-3.5 w-3.5" /> Validée</> : <><Clock className="h-3.5 w-3.5" /> Brouillon</>}
                          </button>
                        ) : (
                          <span className="text-xs text-surface-400">En attente du formateur</span>
                        )}
                        {fin && (
                          <a href={`/api/pdf/poei-grilles/${poeiId}?apprenant=${aid}&semaine=`} target="_blank" rel="noreferrer"
                            title="Télécharger la grille en PDF"
                            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
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
    </PoeiSection>
  )
}
