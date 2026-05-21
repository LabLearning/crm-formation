import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Store, Building2, Banknote, TrendingUp, ChevronRight, Target } from 'lucide-react'
import { commissionTypeLabel } from '@/lib/commission'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Franchises — CRM Lab Learning' }

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default async function FranchisesPage() {
  const session = await getSession()
  const supabase = await createServiceRoleClient()
  const orgId = session.organization.id

  // Franchises = apporteurs partenaires
  const { data: franchises } = await supabase
    .from('apporteurs_affaires')
    .select('id, raison_sociale, nom_enseigne, nom, prenom, secteur, nombre_points_vente, objectif_annuel_ca, commission_type, taux_commission, is_active')
    .eq('organization_id', orgId)
    .eq('categorie', 'partenaire')
    .order('nom_enseigne', { nullsFirst: false })

  const franchiseIds = (franchises || []).map((f) => f.id)

  // Établissements rattachés
  const { data: clients } = franchiseIds.length
    ? await supabase.from('clients').select('id, franchise_id').in('franchise_id', franchiseIds)
    : { data: [] as any[] }

  // Dossiers des franchises (pour CA + commissions)
  const { data: dossiers } = franchiseIds.length
    ? await supabase
        .from('dossiers_formation')
        .select('id, franchise_id, montant_total_ttc, montant_prise_en_charge, commission_montant, commission_status')
        .in('franchise_id', franchiseIds)
    : { data: [] as any[] }

  const statsFor = (fid: string) => {
    const etabs = (clients || []).filter((c) => c.franchise_id === fid).length
    const ds = (dossiers || []).filter((d) => d.franchise_id === fid)
    const ca = ds.reduce((s, d) => s + Number(d.montant_total_ttc || 0), 0)
    const commTotal = ds.reduce((s, d) => s + Number(d.commission_montant || 0), 0)
    const commAVenir = ds.filter((d) => d.commission_status === 'a_venir' || d.commission_status === 'validee')
      .reduce((s, d) => s + Number(d.commission_montant || 0), 0)
    return { etabs, dossiers: ds.length, ca, commTotal, commAVenir }
  }

  // Totaux globaux
  const totalEtabs = (clients || []).length
  const totalCommAVenir = (dossiers || [])
    .filter((d) => d.commission_status === 'a_venir' || d.commission_status === 'validee')
    .reduce((s, d) => s + Number(d.commission_montant || 0), 0)
  const totalCommPayee = (dossiers || [])
    .filter((d) => d.commission_status === 'payee')
    .reduce((s, d) => s + Number(d.commission_montant || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Franchises</h1>
        <p className="text-surface-500 text-sm mt-1">
          Réseaux franchisés, établissements formés et commissions.
        </p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Store} tint="brand" label="Franchises" value={String((franchises || []).length)} />
        <Kpi icon={Building2} tint="blue" label="Établissements" value={String(totalEtabs)} />
        <Kpi icon={Banknote} tint="amber" label="Commissions à verser" value={fmtEuro(totalCommAVenir)} />
        <Kpi icon={TrendingUp} tint="emerald" label="Commissions payées" value={fmtEuro(totalCommPayee)} />
      </div>

      {/* Liste */}
      {(franchises || []).length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <Store className="h-6 w-6 text-surface-400 mb-3" />
          <p className="text-sm text-surface-500">Aucune franchise enregistrée</p>
          <p className="text-xs text-surface-400 mt-1">
            Les franchises sont des apporteurs avec la catégorie « partenaire » (voir Mon équipe → Apporteurs).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(franchises || []).map((f) => {
            const st = statsFor(f.id)
            const name = f.nom_enseigne || f.raison_sociale || `${f.prenom || ''} ${f.nom || ''}`.trim() || 'Franchise'
            return (
              <Link
                key={f.id}
                href={`/dashboard/franchises/${f.id}`}
                className="card p-5 hover:border-brand-300 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-surface-900 truncate">{name}</h3>
                        {f.secteur && <div className="text-xs text-surface-500">{f.secteur}</div>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Mini label="Établissements" value={String(st.etabs)} />
                  <Mini label="Dossiers" value={String(st.dossiers)} />
                  <Mini label="CA généré" value={fmtEuro(st.ca)} />
                </div>

                <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-surface-500 inline-flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" />
                    {commissionTypeLabel(f.commission_type)}
                  </span>
                  <span className="text-sm font-bold text-amber-600 tabular-nums">
                    {fmtEuro(st.commAVenir)} <span className="text-[10px] font-normal text-surface-400">à verser</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, tint, label, value }: { icon: any; tint: string; label: string; value: string }) {
  const tints: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tints[tint]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-heading font-bold text-surface-900 truncate">{value}</div>
        <div className="text-xs text-surface-500">{label}</div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-50 rounded-lg p-2">
      <div className="text-[10px] uppercase tracking-wider text-surface-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-surface-900 mt-0.5 tabular-nums truncate">{value}</div>
    </div>
  )
}
