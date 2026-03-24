'use client'

import { useState, useMemo } from 'react'
import {
  PieChart, TrendingUp, TrendingDown, Users, Euro, Target,
  AlertTriangle, CheckCircle2, Clock, BarChart3, FileText,
  GraduationCap, Layers,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Lead { id: string; status: string; montant_estime: number | null; created_at: string; converted_at: string | null }
interface Session { id: string; status: string; date_debut: string; date_fin: string; capacite_max: number | null }
interface Devis { id: string; status: string; montant_ht: number | null; created_at: string }
interface Facture { id: string; status: string; montant_ht: number | null; montant_ttc: number | null; date_emission: string }
interface Inscription { id: string; status: string; session_id: string }
interface Dossier { id: string; status: string; created_at: string }

interface ManagerClientProps {
  leads: Lead[]; sessions: Session[]; devis: Devis[]; factures: Facture[]
  apprenants: number; inscriptions: Inscription[]; dossiers: Dossier[]
  reclamationsOuvertes: number
}

const PIPELINE_STATUTS = [
  { key: 'nouveau', label: 'Nouveau', color: '#6366F1' },
  { key: 'contacte', label: 'Contacté', color: '#0891B2' },
  { key: 'qualification', label: 'Qualifié', color: '#D97706' },
  { key: 'proposition', label: 'Proposition', color: '#7C3AED' },
  { key: 'negociation', label: 'Négo.', color: '#EA580C' },
  { key: 'gagne', label: 'Gagné', color: '#059669' },
  { key: 'perdu', label: 'Perdu', color: '#DC2626' },
]

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))

export function ManagerClient({ leads, sessions, devis, factures, apprenants, inscriptions, dossiers, reclamationsOuvertes }: ManagerClientProps) {
  const [tab, setTab] = useState<'general' | 'pipeline' | 'finance' | 'formation'>('general')

  // ─── Calculs ───
  const kpi = useMemo(() => {
    const now = new Date()
    const thisMonth = now.toISOString().substring(0, 7)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    const totalLeads = leads.length
    const leadsThisMonth = leads.filter(l => l.created_at?.startsWith(thisMonth)).length
    const gagnes = leads.filter(l => l.status === 'gagne').length
    const perdus = leads.filter(l => l.status === 'perdu').length
    const enCours = leads.filter(l => !['gagne', 'perdu'].includes(l.status)).length
    const tauxConversion = totalLeads > 0 ? Math.round((gagnes / totalLeads) * 100) : 0
    const ratioGP = (gagnes + perdus) > 0 ? (gagnes / (gagnes + perdus) * 100).toFixed(0) : '—'

    const montantPipeline = leads.filter(l => !['gagne', 'perdu'].includes(l.status)).reduce((sum, l) => sum + (l.montant_estime || 0), 0)

    const totalDevis = devis.length
    const devisAcceptes = devis.filter(d => d.status === 'accepte').length
    const tauxDevis = totalDevis > 0 ? Math.round((devisAcceptes / totalDevis) * 100) : 0
    const devisMontant = devis.reduce((sum, d) => sum + (d.montant_ht || 0), 0)

    const caFacture = factures.filter(f => f.status !== 'annulee').reduce((sum, f) => sum + (f.montant_ht || 0), 0)
    const caPayé = factures.filter(f => f.status === 'payee').reduce((sum, f) => sum + (f.montant_ht || 0), 0)
    const impayés = factures.filter(f => f.status === 'en_retard' || f.status === 'relancee').reduce((sum, f) => sum + (f.montant_ht || 0), 0)

    const sessionsEnCours = sessions.filter(s => s.status === 'en_cours').length
    const sessionsAVenir = sessions.filter(s => s.status === 'planifiee' || s.status === 'confirmee').length
    const sessionsTerminees = sessions.filter(s => s.status === 'terminee').length

    const dossiersEnCours = dossiers.filter(d => !['cloture', 'facture'].includes(d.status)).length

    return {
      totalLeads, leadsThisMonth, gagnes, perdus, enCours, tauxConversion, ratioGP, montantPipeline,
      totalDevis, devisAcceptes, tauxDevis, devisMontant,
      caFacture, caPayé, impayés,
      sessionsEnCours, sessionsAVenir, sessionsTerminees,
      apprenants, dossiersEnCours, reclamationsOuvertes,
    }
  }, [leads, devis, factures, sessions, dossiers, apprenants, reclamationsOuvertes])

  // Pipeline distribution
  const pipeline = useMemo(() => {
    return PIPELINE_STATUTS.map(s => ({
      ...s,
      count: leads.filter(l => l.status === s.key).length,
      montant: leads.filter(l => l.status === s.key).reduce((sum, l) => sum + (l.montant_estime || 0), 0),
    }))
  }, [leads])

  const maxPipeline = Math.max(...pipeline.map(p => p.count), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Vue Manager</h1>
          <p className="text-surface-500 mt-1 text-sm">Tableau de bord analytique global</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-100 rounded-lg p-0.5 w-fit">
        {([
          { id: 'general', label: 'Vue générale' },
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'finance', label: 'Finances' },
          { id: 'formation', label: 'Formations' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === t.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500 hover:text-surface-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── VUE GÉNÉRALE ─── */}
      {tab === 'general' && (
        <div className="space-y-6">
          {/* KPIs row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Leads', value: kpi.totalLeads, sub: `+${kpi.leadsThisMonth} ce mois`, icon: Users, color: 'text-brand-600' },
              { label: 'En cours', value: kpi.enCours, sub: `${kpi.tauxConversion}% conversion`, icon: Target, color: 'text-warning-600' },
              { label: 'Gagnés', value: kpi.gagnes, sub: `Ratio: ${kpi.ratioGP}%`, icon: CheckCircle2, color: 'text-success-600' },
              { label: 'CA facturé', value: fmtK(kpi.caFacture) + ' €', sub: `${fmtK(kpi.caPayé)} € payé`, icon: Euro, color: 'text-surface-800' },
              { label: 'Sessions', value: kpi.sessionsAVenir + kpi.sessionsEnCours, sub: `${kpi.sessionsTerminees} terminées`, icon: GraduationCap, color: 'text-brand-600' },
              { label: 'Apprenants', value: kpi.apprenants, sub: `${kpi.dossiersEnCours} dossiers`, icon: Users, color: 'text-violet-600' },
            ].map(k => (
              <div key={k.label} className="card p-4 text-center">
                <k.icon className={cn('h-5 w-5 mx-auto mb-2', k.color)} />
                <div className="text-2xl font-heading font-bold text-surface-900">{k.value}</div>
                <div className="text-[11px] text-surface-400 mt-0.5">{k.label}</div>
                <div className="text-[10px] text-surface-500 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Alertes */}
          {(kpi.impayés > 0 || kpi.reclamationsOuvertes > 0) && (
            <div className="card p-4 border-warning-200 border bg-warning-50/30">
              <div className="flex items-center gap-2 text-sm font-medium text-warning-800">
                <AlertTriangle className="h-4 w-4" />
                Alertes
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                {kpi.impayés > 0 && <span className="text-danger-600">{fmt(kpi.impayés)} € d'impayés</span>}
                {kpi.reclamationsOuvertes > 0 && <span className="text-warning-700">{kpi.reclamationsOuvertes} réclamation(s) ouverte(s)</span>}
              </div>
            </div>
          )}

          {/* Mini pipeline funnel */}
          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Funnel commercial</div>
            <div className="space-y-2">
              {pipeline.filter(p => p.count > 0).map(p => (
                <div key={p.key} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-surface-600 text-right shrink-0">{p.label}</div>
                  <div className="flex-1 h-7 bg-surface-100 rounded-lg overflow-hidden relative">
                    <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${(p.count / maxPipeline) * 100}%`, backgroundColor: p.color }} />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-surface-800">
                      {p.count}
                    </span>
                  </div>
                  {p.montant > 0 && <div className="text-xs text-surface-400 w-20 text-right shrink-0">{fmtK(p.montant)} €</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── PIPELINE ─── */}
      {tab === 'pipeline' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total leads" value={kpi.totalLeads} />
            <StatBox label="Taux conversion" value={`${kpi.tauxConversion}%`} color={kpi.tauxConversion >= 20 ? 'success' : kpi.tauxConversion >= 10 ? 'warning' : 'danger'} />
            <StatBox label="Ratio G/P" value={`${kpi.ratioGP}%`} />
            <StatBox label="Pipeline" value={`${fmtK(kpi.montantPipeline)} €`} />
          </div>

          {/* Detailed pipeline */}
          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Pipeline détaillé</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {pipeline.map(p => (
                <div key={p.key} className="p-4 rounded-xl bg-surface-50 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: p.color }} />
                  <div className="text-3xl font-heading font-bold text-surface-900 mt-2">{p.count}</div>
                  <div className="text-xs text-surface-500 mt-1">{p.label}</div>
                  {p.montant > 0 && <div className="text-xs text-surface-400 mt-1">{fmt(p.montant)} €</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Devis conversion */}
          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Conversion devis</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-surface-900">{kpi.totalDevis}</div>
                <div className="text-xs text-surface-500">Devis envoyés</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-heading font-bold text-success-600">{kpi.devisAcceptes}</div>
                <div className="text-xs text-surface-500">Acceptés</div>
              </div>
              <div className="text-center">
                <div className={cn('text-3xl font-heading font-bold', kpi.tauxDevis >= 30 ? 'text-success-600' : kpi.tauxDevis >= 15 ? 'text-warning-600' : 'text-danger-600')}>
                  {kpi.tauxDevis}%
                </div>
                <div className="text-xs text-surface-500">Taux de conversion</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FINANCES ─── */}
      {tab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="CA facturé" value={`${fmtK(kpi.caFacture)} €`} />
            <StatBox label="Payé" value={`${fmtK(kpi.caPayé)} €`} color="success" />
            <StatBox label="Impayés" value={`${fmtK(kpi.impayés)} €`} color={kpi.impayés > 0 ? 'danger' : 'success'} />
            <StatBox label="Devis total" value={`${fmtK(kpi.devisMontant)} €`} />
          </div>

          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Répartition factures</div>
            <div className="space-y-2">
              {[
                { label: 'Brouillons', count: factures.filter(f => f.status === 'brouillon').length, color: '#94A3B8' },
                { label: 'Envoyées', count: factures.filter(f => f.status === 'envoyee').length, color: '#6366F1' },
                { label: 'Payées', count: factures.filter(f => f.status === 'payee').length, color: '#10B981' },
                { label: 'En retard', count: factures.filter(f => f.status === 'en_retard').length, color: '#EF4444' },
                { label: 'Relancées', count: factures.filter(f => f.status === 'relancee').length, color: '#F59E0B' },
              ].filter(s => s.count > 0).map(s => {
                const max = Math.max(...factures.length > 0 ? [factures.length] : [1])
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-surface-600 text-right">{s.label}</div>
                    <div className="flex-1 h-6 bg-surface-100 rounded overflow-hidden relative">
                      <div className="h-full rounded transition-all duration-500" style={{ width: `${(s.count / max) * 100}%`, backgroundColor: s.color }} />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-surface-700">{s.count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── FORMATIONS ─── */}
      {tab === 'formation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Apprenants" value={kpi.apprenants} />
            <StatBox label="Sessions actives" value={kpi.sessionsEnCours + kpi.sessionsAVenir} />
            <StatBox label="Sessions terminées" value={kpi.sessionsTerminees} />
            <StatBox label="Dossiers en cours" value={kpi.dossiersEnCours} />
          </div>

          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Statut sessions</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Planifiées', count: sessions.filter(s => s.status === 'planifiee').length, color: 'bg-blue-50 text-blue-700' },
                { label: 'Confirmées', count: sessions.filter(s => s.status === 'confirmee').length, color: 'bg-violet-50 text-violet-700' },
                { label: 'En cours', count: sessions.filter(s => s.status === 'en_cours').length, color: 'bg-amber-50 text-amber-700' },
                { label: 'Terminées', count: sessions.filter(s => s.status === 'terminee').length, color: 'bg-emerald-50 text-emerald-700' },
              ].map(s => (
                <div key={s.label} className={cn('p-4 rounded-xl text-center', s.color)}>
                  <div className="text-2xl font-heading font-bold">{s.count}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Statut dossiers</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'En création', count: dossiers.filter(d => d.status === 'en_creation').length },
                { label: 'Devis envoyé', count: dossiers.filter(d => d.status === 'devis_envoye').length },
                { label: 'Convention signée', count: dossiers.filter(d => d.status === 'convention_signee').length },
                { label: 'En cours', count: dossiers.filter(d => d.status === 'en_cours').length },
                { label: 'Réalisé', count: dossiers.filter(d => d.status === 'realise').length },
                { label: 'Clôturé', count: dossiers.filter(d => d.status === 'cloture').length },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
                  <span className="text-sm text-surface-600">{s.label}</span>
                  <span className="text-lg font-heading font-bold text-surface-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: 'success' | 'danger' | 'warning' }) {
  const c = color === 'success' ? 'text-success-600' : color === 'danger' ? 'text-danger-600' : color === 'warning' ? 'text-warning-600' : 'text-surface-900'
  return (
    <div className="card p-4 text-center">
      <div className={cn('text-2xl font-heading font-bold', c)}>{value}</div>
      <div className="text-[11px] text-surface-400 mt-1">{label}</div>
    </div>
  )
}
