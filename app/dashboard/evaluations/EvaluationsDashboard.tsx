'use client'

import { useState, useMemo } from 'react'
import {
  Search, ClipboardCheck, Star, TrendingUp,
  Users, BarChart3, ThumbsUp, ThumbsDown, Minus,
  GraduationCap, CheckCircle2, XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { QCM_TYPE_LABELS, QCM_TYPE_COLORS, QCM_TYPE_QUALIOPI } from '@/lib/types/evaluation'
import { formatDate } from '@/lib/utils'
import type { QCMReponse, EvaluationSatisfaction, QCMType } from '@/lib/types/evaluation'

interface EvaluationsDashboardProps {
  reponses: QCMReponse[]
  satisfactions: EvaluationSatisfaction[]
}

export function EvaluationsDashboard({ reponses, satisfactions }: EvaluationsDashboardProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Global stats
  const stats = useMemo(() => {
    const completed = reponses.filter((r) => r.is_complete)
    const avgScore = completed.length > 0
      ? completed.reduce((s, r) => s + (r.score || 0), 0) / completed.length
      : 0
    const passed = completed.filter((r) => r.is_reussi).length
    const satisfactionAvg = satisfactions.length > 0
      ? satisfactions.reduce((s, e) => s + Number(e.note_moyenne), 0) / satisfactions.length
      : 0
    const npsAvg = satisfactions.filter((e) => e.nps_score !== null).length > 0
      ? satisfactions.filter((e) => e.nps_score !== null).reduce((s, e) => s + (e.nps_score || 0), 0) / satisfactions.filter((e) => e.nps_score !== null).length
      : null

    return {
      total: reponses.length,
      completed: completed.length,
      avgScore: Math.round(avgScore * 10) / 10,
      passRate: completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0,
      satisfactionAvg: Math.round(satisfactionAvg * 10) / 10,
      nps: npsAvg !== null ? Math.round(npsAvg) : null,
    }
  }, [reponses, satisfactions])

  // Filter responses
  const filtered = useMemo(() => {
    return reponses.filter((r) => {
      const matchType = typeFilter === 'all' || r.qcm?.type === typeFilter
      const matchSearch = (r.apprenant?.prenom || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.apprenant?.nom || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.qcm?.titre || '').toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [reponses, typeFilter, search])

  // By type counts
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: reponses.length }
    reponses.forEach((r) => { if (r.qcm?.type) c[r.qcm.type] = (c[r.qcm.type] || 0) + 1 })
    return c
  }, [reponses])

  function getNPSColor(nps: number): string {
    if (nps >= 50) return 'text-success-600'
    if (nps >= 0) return 'text-warning-600'
    return 'text-danger-600'
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-success-600'
    if (score >= 50) return 'text-warning-600'
    return 'text-danger-600'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Évaluations & Résultats</h1>
        <p className="text-surface-500 mt-1 text-sm">Suivi des résultats et indicateurs Qualiopi</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-surface-100 flex items-center justify-center"><ClipboardCheck className="h-4 w-4 text-brand-600" /></div>
            <div>
              <div className="text-xs text-surface-500">Évaluations</div>
              <div className="text-lg font-heading font-bold text-surface-800">{stats.completed}/{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-success-50/60 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-success-600" /></div>
            <div>
              <div className="text-xs text-surface-500">Score moyen</div>
              <div className={`text-lg font-heading font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}%</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-warning-50/60 flex items-center justify-center"><Star className="h-4 w-4 text-warning-600" /></div>
            <div>
              <div className="text-xs text-surface-500">Satisfaction (Qualiopi C7)</div>
              <div className="text-lg font-heading font-bold text-warning-600">{stats.satisfactionAvg}/5</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-50/60 flex items-center justify-center"><BarChart3 className="h-4 w-4 text-purple-600" /></div>
            <div>
              <div className="text-xs text-surface-500">Taux de réussite</div>
              <div className={`text-lg font-heading font-bold ${getScoreColor(stats.passRate)}`}>{stats.passRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* NPS card (if available) */}
      {stats.nps !== null && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-heading font-semibold text-surface-900 tracking-tight">Net Promoter Score (NPS)</h2>
              <p className="text-xs text-surface-500 mt-0.5">Indicateur de recommandation — Qualiopi C7</p>
            </div>
            <div className={`text-3xl font-heading font-bold ${getNPSColor(stats.nps)}`}>
              {stats.nps > 0 ? '+' : ''}{stats.nps}
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm">
            <span className="flex items-center gap-1 text-success-600"><ThumbsUp className="h-4 w-4" /> Promoteurs</span>
            <span className="flex items-center gap-1 text-surface-500"><Minus className="h-4 w-4" /> Passifs</span>
            <span className="flex items-center gap-1 text-danger-600"><ThumbsDown className="h-4 w-4" /> Détracteurs</span>
          </div>
        </div>
      )}

      {/* Satisfaction by session */}
      {satisfactions.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Satisfaction par session</h2>
          <div className="space-y-3">
            {satisfactions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-50">
                <div className="flex-1 min-w-0">
                  <Badge variant={QCM_TYPE_COLORS[s.type]}>{QCM_TYPE_LABELS[s.type]}</Badge>
                  <div className="text-xs text-surface-500 mt-1">
                    {s.nombre_reponses}/{s.nombre_invites} réponses ({s.taux_reponse}%)
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { label: 'Contenu', note: s.note_contenu },
                    { label: 'Formateur', note: s.note_formateur },
                    { label: 'Organisation', note: s.note_organisation },
                    { label: 'Supports', note: s.note_supports },
                    { label: 'Applicabilité', note: s.note_applicabilite },
                  ].map((n) => (
                    <div key={n.label}>
                      <div className="text-2xs text-surface-400">{n.label}</div>
                      <div className={`text-sm font-bold ${n.note ? (Number(n.note) >= 4 ? 'text-success-600' : Number(n.note) >= 3 ? 'text-warning-600' : 'text-danger-600') : 'text-surface-300'}`}>
                        {n.note ? `${n.note}/5` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <div className="text-2xs text-surface-400">Moyenne</div>
                  <div className="text-lg font-bold text-surface-800 flex items-center gap-0.5">
                    <Star className="h-4 w-4 text-warning-500 fill-warning-500" />
                    {Number(s.note_moyenne).toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-surface-200/60 flex-1 max-w-md">
          <Search className="h-4 w-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un apprenant..." className="bg-transparent text-sm placeholder:text-surface-400 focus:outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {['all', ...Object.keys(QCM_TYPE_LABELS)].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${typeFilter === t ? 'bg-surface-900 text-white shadow-xs' : 'bg-white text-surface-500 border border-surface-200/80 hover:border-surface-300 hover:text-surface-700'}`}>
              {t === 'all' ? 'Tous' : QCM_TYPE_LABELS[t as QCMType]}
              <span className="ml-1 text-surface-400">({typeCounts[t] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Apprenant</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">QCM</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-center text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Score</th>
                <th className="text-center text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3">Résultat</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Date</th>
                <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Durée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="text-sm font-medium text-surface-900">
                      {r.apprenant?.prenom} {r.apprenant?.nom}
                    </div>
                    {r.apprenant?.email && <div className="text-xs text-surface-500">{r.apprenant.email}</div>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-surface-700 truncate max-w-[200px]">
                    {r.qcm?.titre || '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    {r.qcm?.type && <Badge variant={QCM_TYPE_COLORS[r.qcm.type]}>{QCM_TYPE_LABELS[r.qcm.type]}</Badge>}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {r.is_complete && r.score !== null ? (
                      <span className={`text-sm font-bold ${getScoreColor(r.score)}`}>{r.score}%</span>
                    ) : (
                      <span className="text-xs text-surface-400">{r.is_complete ? '—' : 'En cours'}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {r.is_complete ? (
                      r.is_reussi ? (
                        <CheckCircle2 className="h-5 w-5 text-success-500 mx-auto" />
                      ) : r.is_reussi === false ? (
                        <XCircle className="h-5 w-5 text-danger-500 mx-auto" />
                      ) : <span className="text-xs text-surface-400">N/A</span>
                    ) : (
                      <Badge variant="warning">En cours</Badge>
                    )}
                  </td>
                  <td className="px-6 py-3.5 hidden md:table-cell text-sm text-surface-500">
                    {r.completed_at ? formatDate(r.completed_at, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-6 py-3.5 hidden lg:table-cell text-sm text-surface-500">
                    {r.duree_secondes ? `${Math.floor(r.duree_secondes / 60)}min ${r.duree_secondes % 60}s` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-surface-500">Aucune évaluation trouvée</div>
        )}
      </div>
    </div>
  )
}
