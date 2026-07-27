'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Receipt, Download, CheckCircle2, Clock, XCircle, Search } from 'lucide-react'
import { useToast } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { updateFactureFormateurStatusAction } from '@/app/dashboard/formateurs/actions'

const STATUT: Record<string, { label: string; cls: string; Icon: any }> = {
  brouillon: { label: 'Brouillon', cls: 'bg-surface-100 text-surface-600', Icon: Receipt },
  envoyee: { label: 'À valider', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
  validee: { label: 'Validée', cls: 'bg-sky-50 text-sky-700', Icon: CheckCircle2 },
  payee: { label: 'Payée', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  rejetee: { label: 'Rejetée', cls: 'bg-danger-50 text-danger-700', Icon: XCircle },
}
const ORDER = ['envoyee', 'validee', 'brouillon', 'payee', 'rejetee']
const fmt = (n: any) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export function FacturesFormateursList({ factures, fileUrls }: { factures: any[]; fileUrls: Record<string, string> }) {
  const { toast } = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<string>('all')

  function act(id: string, status: 'validee' | 'payee' | 'rejetee') {
    let motif: string | undefined
    if (status === 'rejetee') { const m = prompt('Motif du rejet ?'); if (m === null) return; motif = m }
    start(async () => {
      const r = await updateFactureFormateurStatusAction(id, status, motif)
      if (r.success) { toast('success', 'Facture mise à jour'); router.refresh() }
      else toast('error', r.error || 'Erreur')
    })
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: factures.length }
    for (const f of factures) c[f.status] = (c[f.status] || 0) + 1
    return c
  }, [factures])

  const totalAvalider = useMemo(
    () => factures.filter((f) => f.status === 'envoyee').reduce((s, f) => s + Number(f.montant_ttc || 0), 0),
    [factures],
  )

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return factures
      .filter((f) => filter === 'all' || f.status === filter)
      .filter((f) => {
        if (!term) return true
        const name = `${f.formateur?.prenom || ''} ${f.formateur?.nom || ''}`.toLowerCase()
        return name.includes(term) || (f.numero || '').toLowerCase().includes(term) || (f.objet || '').toLowerCase().includes(term)
      })
      .sort((a, b) => (ORDER.indexOf(a.status) - ORDER.indexOf(b.status)) || String(b.created_at).localeCompare(String(a.created_at)))
  }, [factures, filter, q])

  return (
    <div className="space-y-4">
      {/* Filtres statut */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', ...ORDER].map((s) => {
          if (s !== 'all' && !counts[s]) return null
          const active = filter === s
          const label = s === 'all' ? 'Toutes' : STATUT[s].label
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
              {label} <span className={active ? 'text-white/70' : 'text-surface-400'}>· {counts[s] || 0}</span>
            </button>
          )
        })}
        <div className="relative ml-auto">
          <Search className="h-4 w-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Formateur, n° facture…"
            className="input-base pl-9 py-1.5 text-sm w-64" />
        </div>
      </div>

      {totalAvalider > 0 && (
        <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2 inline-flex items-center gap-2">
          <Clock className="h-4 w-4" /> {counts.envoyee || 0} facture{(counts.envoyee || 0) > 1 ? 's' : ''} à valider — {fmt(totalAvalider)}
        </div>
      )}

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-14 text-sm text-surface-400">Aucune facture formateur</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {rows.map((f) => {
              const st = STATUT[f.status] || STATUT.envoyee
              return (
                <div key={f.id} className="px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={`/dashboard/formateurs/${f.formateur_id}`} className="text-sm font-semibold text-surface-900 hover:text-brand-600 shrink-0 w-44 truncate">
                      {f.formateur ? `${f.formateur.prenom} ${f.formateur.nom}` : 'Formateur'}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-surface-800 truncate">{f.objet || f.numero || 'Facture'}{f.session?.reference ? <span className="text-surface-400"> · {f.session.reference}</span> : null}</div>
                      <div className="text-xs text-surface-500 mt-0.5">{f.numero} · {formatDate(f.date_emission || f.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className="text-sm font-bold text-surface-900 shrink-0">{fmt(f.montant_ttc)}</div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}><st.Icon className="h-3 w-3" /> {st.label}</span>
                    {f.fichier_url && fileUrls[f.fichier_url] && (
                      <a href={fileUrls[f.fichier_url]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-50 text-surface-500 text-[11px] font-medium hover:bg-surface-100 shrink-0"><Download className="h-3 w-3" /> PDF</a>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.status === 'envoyee' && (
                        <>
                          <button onClick={() => act(f.id, 'validee')} disabled={pending} className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-medium hover:bg-sky-100 disabled:opacity-50">Valider</button>
                          <button onClick={() => act(f.id, 'rejetee')} disabled={pending} className="px-2.5 py-1 rounded-lg bg-danger-50 text-danger-600 text-[11px] font-medium hover:bg-danger-100 disabled:opacity-50">Rejeter</button>
                        </>
                      )}
                      {f.status === 'validee' && (
                        <button onClick={() => act(f.id, 'payee')} disabled={pending} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 disabled:opacity-50">Marquer payée</button>
                      )}
                    </div>
                  </div>
                  {f.status === 'rejetee' && f.motif_rejet && <div className="mt-1.5 text-xs text-danger-600 pl-44">Motif : {f.motif_rejet}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
