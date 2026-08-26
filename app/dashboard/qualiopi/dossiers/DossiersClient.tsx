'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FolderCheck, Search, ShieldAlert, ChevronRight } from '@/components/ui/icons'
import { cn, formatDate } from '@/lib/utils'
import { PIECES } from '@/lib/pieces-session'
import type { DossierSession } from '@/lib/dossiers-completude'

type Filtre = 'tous' | 'incomplets' | 'majeures' | 'complets'

/**
 * Plan de travail des dossiers : quelles actions de formation sont complètes,
 * lesquelles ne le sont pas, et ce qu'il y manque. Trié par priorité — les
 * plus récentes d'abord, ce sont celles que l'auditeur échantillonnera.
 */
export function DossiersClient({ dossiers }: { dossiers: DossierSession[] }) {
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('majeures')
  // Filtre par pièce : « montre-moi tous les dossiers où il manque X ».
  const [piece, setPiece] = useState<string>('')

  const parPiece = useMemo(() => {
    const n = new Map<string, number>()
    for (const d of dossiers) for (const m of d.manquantes) n.set(m, (n.get(m) || 0) + 1)
    return PIECES.map((p) => ({ cle: p.cle, label: p.label, n: n.get(p.cle) || 0 })).filter((p) => p.n > 0)
      .sort((a, b) => b.n - a.n)
  }, [dossiers])

  const stats = useMemo(() => ({
    total: dossiers.length,
    complets: dossiers.filter((d) => d.manquantes.length === 0).length,
    majeures: dossiers.filter((d) => d.manquantesMajeures > 0).length,
    piecesManquantes: dossiers.reduce((a, d) => a + d.manquantes.length, 0),
  }), [dossiers])

  const filtres: { key: Filtre; label: string; n: number }[] = [
    { key: 'majeures', label: 'Pièces à enjeu majeur manquantes', n: stats.majeures },
    { key: 'incomplets', label: 'Incomplets', n: dossiers.filter((d) => d.manquantes.length > 0).length },
    { key: 'complets', label: 'Complets', n: stats.complets },
    { key: 'tous', label: 'Tous', n: stats.total },
  ]

  const liste = useMemo(() => {
    const t = q.trim().toLowerCase()
    return dossiers
      .filter((d) => {
        if (filtre === 'incomplets' && d.manquantes.length === 0) return false
        if (filtre === 'majeures' && d.manquantesMajeures === 0) return false
        if (filtre === 'complets' && d.manquantes.length > 0) return false
        if (piece && !d.manquantes.includes(piece)) return false
        if (!t) return true
        return [d.reference, d.intitule, d.client].filter(Boolean).some((v) => String(v).toLowerCase().includes(t))
      })
      .sort((a, b) => b.date_debut.localeCompare(a.date_debut))
  }, [dossiers, filtre, q, piece])

  const label = (cle: string) => PIECES.find((p) => p.cle === cle)?.label || cle

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
          <FolderCheck className="h-6 w-6 text-brand-500" />
          Complétude des dossiers
        </h1>
        <p className="text-surface-500 mt-1 text-sm">
          Les deux dernières années. Une pièce compte si le CRM l&apos;a produite ou si son justificatif est déposé.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Actions terminées', valeur: stats.total },
          { label: 'Dossiers complets', valeur: `${stats.complets}/${stats.total}`, alerte: stats.complets < stats.total },
          { label: 'Avec un enjeu majeur', valeur: stats.majeures, alerte: stats.majeures > 0 },
          { label: 'Pièces manquantes', valeur: stats.piecesManquantes, alerte: stats.piecesManquantes > 0 },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-[11px] text-surface-500">{k.label}</div>
            <div className={cn('text-xl font-heading font-bold', k.alerte ? 'text-danger-600' : 'text-surface-900')}>{k.valeur}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 bg-surface-100 rounded-lg p-0.5 w-fit overflow-x-auto">
          {filtres.map((f) => (
            <button key={f.key} onClick={() => setFiltre(f.key)}
              className={cn('px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                filtre === f.key ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500 hover:text-surface-700')}>
              {f.label} ({f.n})
            </button>
          ))}
        </div>
        <select value={piece} onChange={(e) => setPiece(e.target.value)}
          className={cn('input-base !py-2 text-sm w-fit', piece && '!border-danger-300 text-danger-700')}>
          <option value="">Pièce manquante : toutes</option>
          {parPiece.map((p) => (
            <option key={p.cle} value={p.cle}>Manque : {p.label} ({p.n})</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence, formation, client…"
            className="input-base pl-9 w-full" />
        </div>
      </div>

      <div className="space-y-2">
        {liste.length === 0 && (
          <div className="card p-10 text-center text-sm text-surface-500">Aucun dossier dans cette sélection.</div>
        )}
        {liste.map((d) => (
          <Link key={d.id} href={`/dashboard/sessions/${d.id}`}
            className={cn('card p-4 flex items-center gap-4 hover:border-surface-300 transition-colors',
              d.manquantesMajeures > 0 && 'border-danger-200')}>
            <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-sm font-heading font-bold shrink-0',
              d.score === PIECES.length ? 'bg-success-50 text-success-700'
                : d.manquantesMajeures > 0 ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700')}>
              {d.score}/{PIECES.length}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-heading font-semibold text-surface-900 truncate">
                {d.intitule || d.reference || 'Action de formation'}
              </div>
              <div className="text-xs text-surface-500 truncate">
                {formatDate(d.date_debut)}
                {d.reference ? ` · ${d.reference}` : ''}
                {d.client ? ` · ${d.client}` : ''}
                {d.nbInscrits ? ` · ${d.nbInscrits} stagiaire${d.nbInscrits > 1 ? 's' : ''}` : ''}
              </div>
              {d.manquantes.length > 0 && (
                <div className="text-xs text-danger-700 mt-1 truncate">
                  Manque : {d.manquantes.map(label).join(', ')}
                </div>
              )}
            </div>

            {d.manquantesMajeures > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-danger-700 bg-danger-50 border border-danger-100 rounded-full px-2 py-0.5 shrink-0">
                <ShieldAlert className="h-3 w-3" />
                {d.manquantesMajeures} majeure{d.manquantesMajeures > 1 ? 's' : ''}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-surface-400 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
