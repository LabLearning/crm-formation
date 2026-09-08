import Link from 'next/link'
import { getFranchiseSession } from '@/lib/franchise-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseStats, getFranchiseCommissionLines } from '@/lib/franchise-data'
import { commissionTypeLabel, commissionStatusLabel, syncFranchiseCommissions } from '@/lib/commission'
import { Percent, Info } from '@/components/ui/icons'

export const dynamic = 'force-dynamic'

const fmtEuro = (n: number | null) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n || 0))
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

const STATUS_STYLE: Record<string, string> = {
  a_venir: 'bg-surface-100 text-surface-600',
  validee: 'bg-blue-50 text-blue-700',
  payee: 'bg-emerald-50 text-emerald-700',
  annulee: 'bg-rose-50 text-rose-700',
}

/**
 * Financier du portail franchise : les commissions, session par session,
 * pour chaque formation réalisée dans un établissement du réseau.
 */
export default async function FranchiseFinancierPage() {
  const { franchise, organization } = await getFranchiseSession()
  const supabase = await createServiceRoleClient()
  const orgId = organization.id

  // Aligne les lignes sur les sessions avant lecture (création / recalcul des non figées)
  await syncFranchiseCommissions(supabase, franchise.id, orgId)
  const [stats, lignes] = await Promise.all([
    getFranchiseStats(supabase, franchise.id, orgId),
    getFranchiseCommissionLines(supabase, franchise.id, orgId),
  ])
  const visibles = lignes.filter((l) => l.status !== 'annulee')
  const isNet = franchise.commission_type === 'budget_net'

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Financier</h1>
        <p className="text-surface-500 text-sm mt-1">Vos commissions, session par session. Les montants indiqués sont des montants TTC.</p>
      </div>

      {/* Mode de commission */}
      <div className="card p-4 flex items-start gap-3 bg-brand-50/30 border-brand-100">
        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0">
          <Percent className="h-4 w-4 text-brand-600" />
        </div>
        <div className="text-sm">
          <div className="font-semibold text-surface-900">{franchise.taux_commission}% — {commissionTypeLabel(franchise.commission_type)}</div>
          <div className="text-xs text-surface-500 mt-0.5 inline-flex items-center gap-1">
            <Info className="h-3 w-3" />
            {isNet
              ? 'Calculé sur la prise en charge de chaque session après déduction des frais de formateur.'
              : 'Calculé sur le montant de prise en charge de chaque session.'}
          </div>
        </div>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Box label="Total commissions" value={fmtEuro(stats.commissionTotale)} accent />
        <Box label="À venir" value={fmtEuro(stats.commissionAVenir)} />
        <Box label="Validées (à payer)" value={fmtEuro(stats.commissionValidee)} tone="blue" />
        <Box label="Payées" value={fmtEuro(stats.commissionPayee)} tone="emerald" />
      </div>

      {stats.nbSessionsSansMontant > 0 && (
        <div className="card p-3 text-xs text-surface-600 bg-amber-50/50 border-amber-100">
          {stats.nbSessionsSansMontant} session{stats.nbSessionsSansMontant > 1 ? 's' : ''} n&apos;{stats.nbSessionsSansMontant > 1 ? 'ont' : 'a'} pas encore de montant de prise en charge renseigné : la commission correspondante apparaîtra dès que Lab Learning l&apos;aura complété.
        </div>
      )}

      {/* Tableau sessions */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-50/60 border-b border-surface-200">
            <tr className="text-[11px] uppercase tracking-wider text-surface-500 font-semibold">
              <th className="px-4 py-3 text-left">Session</th>
              <th className="px-4 py-3 text-left">Établissement</th>
              <th className="px-4 py-3 text-right">Prise en charge</th>
              {isNet && <th className="px-4 py-3 text-right">Frais formateur</th>}
              <th className="px-4 py-3 text-right">Commission TTC</th>
              <th className="px-4 py-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr><td colSpan={isNet ? 6 : 5} className="px-4 py-8 text-center text-sm text-surface-400">Aucune session pour le moment.</td></tr>
            ) : visibles.map((l) => {
              const s = l.session
              const titre = s?.formation?.intitule || s?.intitule || 'Formation'
              return (
                <tr key={l.id} className="border-b border-surface-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-surface-900 truncate max-w-[240px]">{titre}</div>
                    <div className="text-xs text-surface-400">
                      {s?.reference ? `${s.reference} · ` : ''}{fmtDate(s?.date_debut)}{s?.date_fin && s.date_fin !== s.date_debut ? ` → ${fmtDate(s.date_fin)}` : ''}
                      {s?.status && s.status !== 'terminee' && <span> · {s.status === 'en_cours' ? 'en cours' : 'planifiée'}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-700 truncate max-w-[160px]">
                    {l.client?.id ? <Link href={`/franchise/etablissements/${l.client.id}`} className="hover:text-brand-600">{l.client.raison_sociale}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-surface-700">
                    {Number(l.base_montant) > 0 ? fmtEuro(l.base_montant) : <span className="text-xs text-surface-400">à compléter</span>}
                  </td>
                  {isNet && <td className="px-4 py-3 text-right text-sm tabular-nums text-surface-500">{fmtEuro(l.cout_formateur)}</td>}
                  <td className="px-4 py-3 text-right text-sm font-bold text-amber-600 tabular-nums">{fmtEuro(l.commission_montant)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-semibold ${STATUS_STYLE[l.status || 'a_venir']}`}>
                      {commissionStatusLabel(l.status)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Box({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: 'blue' | 'emerald' }) {
  const col = accent ? 'text-amber-600' : tone === 'blue' ? 'text-blue-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-surface-900'
  return (
    <div className="card p-4">
      <div className="text-xs text-surface-500">{label}</div>
      <div className={`text-xl font-heading font-bold mt-1 tabular-nums ${col}`}>{value}</div>
    </div>
  )
}
