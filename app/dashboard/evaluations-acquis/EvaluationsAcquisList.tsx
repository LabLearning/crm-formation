'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Download, Database, AlertTriangle } from 'lucide-react'
import { Button, Badge, Input, useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { importEvaluationsAcquisAction } from './actions'
import type { EvalAcquisRow } from './page'

export function EvaluationsAcquisList({ rows, tableReady }: { rows: EvalAcquisRow[]; tableReady: boolean }) {
  const { toast } = useToast()
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [q, setQ] = useState('')

  const stats = useMemo(() => {
    const noted = rows.filter((r) => r.note != null && r.note_max)
    const nb = noted.length
    const moy20 = nb > 0 ? noted.reduce((s, r) => s + (r.note! / (r.note_max || 20)) * 20, 0) / nb : 0
    const reussis = noted.filter((r) => r.note! >= (r.note_max || 20) / 2).length
    const tauxReussite = nb > 0 ? Math.round((reussis / nb) * 100) : 0
    return { nb, moy20, tauxReussite }
  }, [rows])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      const app = `${r.apprenant?.prenom || ''} ${r.apprenant?.nom || ''}`.toLowerCase()
      const ses = `${r.session?.reference || ''} ${r.session?.intitule || ''}`.toLowerCase()
      return app.includes(s) || ses.includes(s)
    })
  }, [rows, q])

  async function handleImport() {
    setImporting(true)
    const r = await importEvaluationsAcquisAction()
    if (r.success) {
      toast('success', `${r.data?.imported || 0} évaluation(s) importée(s)${r.data?.unmatched ? ` · ${r.data.unmatched} non rattachée(s)` : ''}`)
      router.refresh()
    } else toast('error', r.error || 'Erreur')
    setImporting(false)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-brand-500" /> Évaluations des acquis
          </h1>
          <p className="text-surface-500 mt-1 text-sm">Notes réelles des formateurs — preuve de l'indicateur Qualiopi 11. Importées de Dendreo.</p>
        </div>
        <Button onClick={handleImport} isLoading={importing} icon={<Download className="h-4 w-4" />}>
          Importer depuis Dendreo
        </Button>
      </div>

      {!tableReady && (
        <div className="card p-5 mb-6 border-warning-200 bg-warning-50/40 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
          <div className="text-sm text-surface-700">
            <div className="font-semibold text-surface-900">Migration à appliquer</div>
            Applique <code>supabase/migrations/104_evaluations_acquis.sql</code> dans Supabase, puis clique « Importer depuis Dendreo ».
          </div>
        </div>
      )}

      {tableReady && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card p-4 text-center">
              <div className="text-2xl font-heading font-bold text-surface-900">{stats.nb}</div>
              <div className="text-xs text-surface-500">évaluations notées</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-heading font-bold text-brand-600">{stats.moy20.toFixed(1)}<span className="text-sm text-surface-400">/20</span></div>
              <div className="text-xs text-surface-500">note moyenne</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-heading font-bold text-success-600">{stats.tauxReussite}%</div>
              <div className="text-xs text-surface-500">taux de réussite (≥ 10/20)</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="card p-10 text-center">
              <Database className="h-10 w-10 text-surface-300 mx-auto mb-3" />
              <div className="text-sm font-medium text-surface-700">Aucune évaluation importée</div>
              <p className="text-xs text-surface-500 mt-1">Clique « Importer depuis Dendreo » pour récupérer les notes réelles.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 max-w-sm">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un apprenant ou une session…" />
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-100 text-left text-xs text-surface-400">
                        <th className="px-4 py-3 font-medium">Apprenant</th>
                        <th className="px-4 py-3 font-medium">Session</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                        <th className="px-4 py-3 font-medium">Formateur</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => {
                        const note20 = r.note != null && r.note_max ? (r.note / r.note_max) * 20 : null
                        const ok = note20 != null && note20 >= 10
                        return (
                          <tr key={r.id} className="border-b border-surface-50 hover:bg-surface-50/40">
                            <td className="px-4 py-3 font-medium text-surface-800">{r.apprenant ? `${r.apprenant.prenom} ${r.apprenant.nom}` : <span className="text-surface-300">—</span>}</td>
                            <td className="px-4 py-3 text-surface-600">{r.session?.reference || r.session?.intitule || <span className="text-surface-300">—</span>}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? 'text-success-600' : note20 != null ? 'text-danger-600' : 'text-surface-400'}`}>
                                {r.note != null ? `${r.note}/${r.note_max || 20}` : '—'}
                                {r.validee && <Badge variant="success">validée</Badge>}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-surface-600">{r.formateur ? `${r.formateur.prenom} ${r.formateur.nom}` : <span className="text-surface-300">—</span>}</td>
                            <td className="px-4 py-3 text-surface-500 tabular-nums">{r.date_evaluation ? formatDate(r.date_evaluation, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
