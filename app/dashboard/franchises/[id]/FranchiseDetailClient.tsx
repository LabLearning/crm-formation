'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Settings2, Check, Loader2, RefreshCw, BadgeCheck, Wallet, Clock, X, ExternalLink, Banknote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { commissionTypeLabel } from '@/lib/commission'
import {
  updateFranchiseCommissionConfigAction,
  recalcCommissionAction,
  updateCommissionStatusAction,
  payAllValidatedAction,
} from '../actions'

type CommissionType = 'budget_debloque' | 'budget_net'
type CommStatus = 'a_venir' | 'validee' | 'payee' | 'annulee'

interface Dossier {
  id: string
  numero: string
  status: string
  opco_workflow_status: string | null
  montant_total_ttc: number | null
  montant_prise_en_charge: number | null
  cout_formateur: number | null
  commission_montant: number | null
  commission_taux: number | null
  commission_type: string | null
  commission_status: CommStatus | null
  client: { id: string; raison_sociale: string } | null
  formation: { intitule: string } | null
}

interface Props {
  franchiseId: string
  commissionType: CommissionType
  taux: number
  commAVenir: number
  commValidee: number
  commPayee: number
  dossiers: Dossier[]
}

const fmtEuro = (n: number | null) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n || 0))

const STATUS_META: Record<CommStatus, { label: string; bg: string; text: string; icon: any }> = {
  a_venir: { label: 'À venir', bg: 'bg-surface-100', text: 'text-surface-600', icon: Clock },
  validee: { label: 'Validée', bg: 'bg-blue-50', text: 'text-blue-700', icon: BadgeCheck },
  payee: { label: 'Payée', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Wallet },
  annulee: { label: 'Annulée', bg: 'bg-rose-50', text: 'text-rose-700', icon: X },
}

export default function FranchiseDetailClient({
  franchiseId, commissionType, taux, commAVenir, commValidee, commPayee, dossiers,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editConfig, setEditConfig] = useState(false)
  const [type, setType] = useState<CommissionType>(commissionType)
  const [tauxVal, setTauxVal] = useState(String(taux))
  const [saving, setSaving] = useState(false)

  const handleSaveConfig = () => {
    setSaving(true)
    startTransition(async () => {
      const r = await updateFranchiseCommissionConfigAction(franchiseId, type, parseFloat(tauxVal) || 0)
      setSaving(false)
      if (r.success) {
        setEditConfig(false)
        router.refresh()
      } else alert(r.error || 'Erreur')
    })
  }

  const doAction = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const r = await fn()
      if (!r.success) alert(r.error || 'Erreur')
      else router.refresh()
    })
  }

  // Quand on change le mode, proposer le taux par défaut associé
  const onTypeChange = (t: CommissionType) => {
    setType(t)
    if (t === 'budget_net' && (tauxVal === '10' || tauxVal === '')) setTauxVal('40')
    if (t === 'budget_debloque' && (tauxVal === '40' || tauxVal === '')) setTauxVal('10')
  }

  return (
    <div className="space-y-5">
      {/* Config commission */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-surface-400" />
            <span className="text-sm font-semibold text-surface-900">Configuration de la commission</span>
          </div>
          {!editConfig && (
            <button onClick={() => setEditConfig(true)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Modifier
            </button>
          )}
        </div>

        {editConfig ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => onTypeChange('budget_debloque')}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all',
                  type === 'budget_debloque' ? 'border-brand-400 bg-brand-50/50 ring-1 ring-brand-200' : 'border-surface-200 hover:border-surface-300',
                )}
              >
                <div className="text-sm font-semibold text-surface-900">Budget débloqué</div>
                <div className="text-xs text-surface-500 mt-0.5">% × montant prise en charge OPCO</div>
              </button>
              <button
                onClick={() => onTypeChange('budget_net')}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all',
                  type === 'budget_net' ? 'border-brand-400 bg-brand-50/50 ring-1 ring-brand-200' : 'border-surface-200 hover:border-surface-300',
                )}
              >
                <div className="text-sm font-semibold text-surface-900">Budget net</div>
                <div className="text-xs text-surface-500 mt-0.5">% × (PEC − coût formateur)</div>
              </button>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-[140px]">
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Taux (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={tauxVal}
                  onChange={(e) => setTauxVal(e.target.value)}
                  className="input-base w-full mt-1 text-sm"
                />
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Enregistrer
              </button>
              <button
                onClick={() => { setEditConfig(false); setType(commissionType); setTauxVal(String(taux)) }}
                className="px-3 py-2 rounded-lg border border-surface-200 text-sm text-surface-600 hover:bg-surface-50"
              >
                Annuler
              </button>
            </div>
            <p className="text-[11px] text-surface-400">
              La modification recalcule toutes les commissions « à venir » de cette franchise (les validées/payées restent figées).
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-medium">
              <Banknote className="h-3.5 w-3.5" /> {taux}%
            </span>
            <span className="text-surface-600">{commissionTypeLabel(commissionType)}</span>
          </div>
        )}
      </div>

      {/* Récap commissions + paiement groupé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs text-surface-500">À venir</div>
          <div className="text-lg font-heading font-bold text-surface-700 tabular-nums mt-1">{fmtEuro(commAVenir)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-surface-500">Validées (à payer)</div>
          <div className="text-lg font-heading font-bold text-blue-600 tabular-nums mt-1">{fmtEuro(commValidee)}</div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-surface-500">Payées</div>
            <div className="text-lg font-heading font-bold text-emerald-600 tabular-nums mt-1">{fmtEuro(commPayee)}</div>
          </div>
          {commValidee > 0 && (
            <button
              onClick={() => {
                if (confirm(`Marquer toutes les commissions validées (${fmtEuro(commValidee)}) comme payées ?`)) {
                  doAction(() => payAllValidatedAction(franchiseId))
                }
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Tout payer
            </button>
          )}
        </div>
      </div>

      {/* Tableau dossiers */}
      <div>
        <div className="text-sm font-heading font-semibold text-surface-900 mb-2">
          Dossiers & commissions ({dossiers.length})
        </div>
        {dossiers.length === 0 ? (
          <div className="card p-6 text-center text-sm text-surface-400">Aucun dossier pour cette franchise.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50/60 border-b border-surface-200">
                <tr className="text-[11px] uppercase tracking-wider text-surface-500 font-semibold">
                  <th className="px-4 py-3 text-left">Dossier</th>
                  <th className="px-4 py-3 text-left">Établissement</th>
                  <th className="px-4 py-3 text-right">PEC</th>
                  <th className="px-4 py-3 text-right">Coût form.</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d) => {
                  const cs = (d.commission_status || 'a_venir') as CommStatus
                  const meta = STATUS_META[cs]
                  const Icon = meta.icon
                  return (
                    <tr key={d.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/40">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/dossiers/${d.id}`} className="text-sm font-medium text-surface-900 hover:text-brand-600 inline-flex items-center gap-1">
                          {d.numero}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </Link>
                        {d.formation && <div className="text-xs text-surface-400 truncate max-w-[160px]">{d.formation.intitule}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700 truncate max-w-[160px]">
                        {d.client?.raison_sociale || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-surface-700">{fmtEuro(d.montant_prise_en_charge)}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-surface-500">{fmtEuro(d.cout_formateur)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-amber-600 tabular-nums">{fmtEuro(d.commission_montant)}</div>
                        {d.commission_taux != null && (
                          <div className="text-[10px] text-surface-400">{d.commission_taux}% · {d.commission_type === 'budget_net' ? 'net' : 'débloqué'}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold', meta.bg, meta.text)}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {cs === 'a_venir' && (
                            <button onClick={() => doAction(() => updateCommissionStatusAction(d.id, 'validee'))}
                              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100">Valider</button>
                          )}
                          {cs === 'validee' && (
                            <button onClick={() => doAction(() => updateCommissionStatusAction(d.id, 'payee'))}
                              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Payer</button>
                          )}
                          {(cs === 'a_venir' || cs === 'validee') && (
                            <button onClick={() => doAction(() => recalcCommissionAction(d.id))}
                              title="Recalculer" className="p-1.5 rounded-md text-surface-400 hover:text-surface-700 hover:bg-surface-100">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {cs === 'payee' && (
                            <button onClick={() => doAction(() => updateCommissionStatusAction(d.id, 'a_venir'))}
                              className="text-[11px] text-surface-400 hover:text-surface-700">Annuler paiement</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
