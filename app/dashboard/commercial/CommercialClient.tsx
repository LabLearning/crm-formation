'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Phone, Mail, Building2, UserPlus, Search,
  Calculator, ClipboardList, Send, Mails, CalendarDays,
  Target, ChevronRight, Star, X, Euro, Wallet,
  TrendingUp, Users, MapPin, Briefcase,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Lead {
  id: string; contact_nom: string; contact_prenom: string | null
  entreprise: string | null; contact_telephone: string | null
  contact_email: string | null; status: string; montant_estime: number | null
  source: string; created_at: string; updated_at: string
}

const STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', contacte: 'Contacté', qualification: 'Qualifié',
  proposition_envoyee: 'Proposition', negociation: 'Négociation',
  gagne: 'Gagné', perdu: 'Perdu',
}
const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-brand-100 text-brand-700', contacte: 'bg-cyan-100 text-cyan-700',
  qualification: 'bg-amber-100 text-amber-700', proposition_envoyee: 'bg-purple-100 text-purple-700',
  negociation: 'bg-orange-100 text-orange-700', gagne: 'bg-emerald-100 text-emerald-700',
  perdu: 'bg-red-100 text-red-700',
}

const COMMISSION_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  payee: { label: 'Payée', variant: 'success' },
  validee: { label: 'Validée', variant: 'warning' },
  en_attente: { label: 'En attente', variant: 'default' },
}

interface Props {
  userName: string
  userRole?: string
  leads: Lead[]
  interactionsToday: any[]
  devisEnCours: any[]
  commissions?: any[]
  apporteurInfo?: { taux_commission: number } | null
  apporteurClients?: any[]
}

export function CommercialClient({ userName, userRole, leads, interactionsToday, devisEnCours, commissions = [], apporteurInfo, apporteurClients = [] }: Props) {
  const isDirecteur = userRole === 'directeur_commercial'
  const isApporteur = userRole === 'apporteur_affaires'
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const tabs = isApporteur
    ? [
        { id: 'accueil', label: 'Tableau de bord' },
        { id: 'leads', label: 'Mes leads' },
        { id: 'commissions', label: 'Commissions' },
        { id: 'outils', label: 'Outils' },
      ]
    : [
        { id: 'accueil', label: 'Accueil' },
        { id: 'leads', label: 'Mes leads (' + leads.length + ')' },
        { id: 'outils', label: 'Outils' },
      ]

  const [tab, setTab] = useState('accueil')

  const stats = useMemo(() => {
    const gagnes = leads.filter(l => l.status === 'gagne')
    const caGenere = gagnes.reduce((s, l) => s + (l.montant_estime || 0), 0)
    const commissionsPayees = commissions.filter(c => c.status === 'payee').reduce((s, c) => s + (c.montant || 0), 0)
    const commissionsEnAttente = commissions.filter(c => c.status !== 'payee').reduce((s, c) => s + (c.montant || 0), 0)
    return {
      total: leads.length,
      nouveaux: leads.filter(l => l.status === 'nouveau').length,
      enCours: leads.filter(l => !['gagne', 'perdu'].includes(l.status)).length,
      gagnes: gagnes.length,
      perdus: leads.filter(l => l.status === 'perdu').length,
      actionsAujourdhui: interactionsToday.length,
      devisOuverts: devisEnCours.length,
      montantPipeline: leads.filter(l => !['gagne', 'perdu'].includes(l.status)).reduce((s, l) => s + (l.montant_estime || 0), 0),
      caGenere,
      commissionsPayees,
      commissionsEnAttente,
      totalCommissions: commissionsPayees + commissionsEnAttente,
      tauxConversion: leads.length > 0 ? Math.round((gagnes.length / leads.length) * 100) : 0,
      nbClients: apporteurClients.length,
    }
  }, [leads, interactionsToday, devisEnCours, commissions, apporteurClients])

  const filtered = useMemo(() => {
    let f = leads.slice()
    if (search) {
      const q = search.toLowerCase()
      f = f.filter(l => (l.contact_nom || '').toLowerCase().includes(q) || (l.contact_prenom || '').toLowerCase().includes(q) || (l.entreprise || '').toLowerCase().includes(q))
    }
    if (filterStatus !== 'all') f = f.filter(l => l.status === filterStatus)
    return f
  }, [leads, search, filterStatus])

  const recentLeads = leads.slice(0, 6)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">
          Bonjour, {userName}
        </h1>
        <p className="text-surface-500 mt-1 text-sm">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' — '}
          {isApporteur
            ? `${stats.total} lead${stats.total > 1 ? 's' : ''} apporté${stats.total > 1 ? 's' : ''}`
            : isDirecteur
            ? `${stats.total} leads équipe`
            : `${stats.actionsAujourdhui} action${stats.actionsAujourdhui > 1 ? 's' : ''} aujourd'hui`
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-100 rounded-lg p-0.5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap', tab === t.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          ACCUEIL — APPORTEUR D'AFFAIRES
          ════════════════════════════════════════════════════════ */}
      {tab === 'accueil' && isApporteur && (
        <div className="space-y-4">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-5 bg-emerald-50">
              <div className="text-2xl font-heading font-bold text-emerald-600">
                {Number(stats.caGenere).toLocaleString('fr-FR')} €
              </div>
              <div className="text-sm font-medium text-surface-700 mt-1">CA généré</div>
              <div className="text-xs text-surface-500 mt-0.5">{stats.gagnes} dossier{stats.gagnes > 1 ? 's' : ''} gagné{stats.gagnes > 1 ? 's' : ''}</div>
            </div>
            <div className="rounded-2xl p-5 bg-blue-50">
              <div className="text-2xl font-heading font-bold text-blue-600">
                {Number(stats.totalCommissions).toLocaleString('fr-FR')} €
              </div>
              <div className="text-sm font-medium text-surface-700 mt-1">Commissions</div>
              <div className="text-xs text-surface-500 mt-0.5">{Number(stats.commissionsPayees).toLocaleString('fr-FR')} € encaissées</div>
            </div>
            <div className="rounded-2xl p-5 bg-violet-50">
              <div className="text-2xl font-heading font-bold text-violet-600">
                {stats.enCours}
              </div>
              <div className="text-sm font-medium text-surface-700 mt-1">Leads en cours</div>
              <div className="text-xs text-surface-500 mt-0.5">{Number(stats.montantPipeline).toLocaleString('fr-FR')} € pipeline</div>
            </div>
            <div className="rounded-2xl p-5 bg-amber-50">
              <div className="text-2xl font-heading font-bold text-amber-600">
                {stats.tauxConversion}%
              </div>
              <div className="text-sm font-medium text-surface-700 mt-1">Taux de conversion</div>
              <div className="text-xs text-surface-500 mt-0.5">{stats.total} leads au total</div>
            </div>
          </div>

          {/* Commission en attente */}
          {stats.commissionsEnAttente > 0 && (
            <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-amber-600" />
                  <div>
                    <div className="text-sm font-medium text-surface-800">Commissions en attente</div>
                    <div className="text-xs text-surface-500">{commissions.filter(c => c.status !== 'payee').length} commission(s) à percevoir</div>
                  </div>
                </div>
                <div className="text-lg font-heading font-bold text-amber-600">
                  {Number(stats.commissionsEnAttente).toLocaleString('fr-FR')} €
                </div>
              </div>
            </div>
          )}

          {/* Bouton ajouter un lead */}
          <Link href="/dashboard/leads"
            className="card p-5 flex items-center gap-4 hover:shadow-card transition-all active:scale-[0.99] border-2 border-dashed border-surface-200 hover:border-brand-300">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-base font-heading font-semibold text-surface-900">Soumettre un nouveau lead</div>
              <div className="text-sm text-surface-500 mt-0.5">Proposer un prospect et le lier à une formation</div>
            </div>
            <ChevronRight className="h-5 w-5 text-surface-300 shrink-0" />
          </Link>

          {/* Mes clients */}
          {apporteurClients.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Mes clients ({apporteurClients.length})
                </div>
                <Link href="/dashboard/clients" className="text-xs text-brand-600 font-medium">Voir tous</Link>
              </div>
              <div className="space-y-1.5">
                {apporteurClients.slice(0, 5).map((client: any) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-surface-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">{client.raison_sociale}</div>
                      {client.ville && <div className="text-xs text-surface-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{client.ville}</div>}
                    </div>
                    {client.secteur_activite && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 shrink-0">{client.secteur_activite}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Derniers leads */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Derniers leads</div>
              <button onClick={() => setTab('leads')} className="text-xs text-brand-600 font-medium">Voir tout</button>
            </div>
            <div className="space-y-1.5">
              {recentLeads.map(lead => (
                <Link key={lead.id} href="/dashboard/leads"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors active:bg-surface-100">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900 truncate">{lead.contact_prenom} {lead.contact_nom}</div>
                    {lead.entreprise && <div className="text-xs text-surface-500 truncate">{lead.entreprise}</div>}
                  </div>
                  {lead.montant_estime && lead.montant_estime > 0 && (
                    <span className="text-xs font-bold text-surface-600 shrink-0">{Number(lead.montant_estime).toLocaleString('fr-FR')} €</span>
                  )}
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0', STATUS_COLORS[lead.status])}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </Link>
              ))}
              {recentLeads.length === 0 && <div className="text-center py-6 text-sm text-surface-400">Aucun lead pour le moment</div>}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ACCUEIL — COMMERCIAL / DIRECTEUR
          ════════════════════════════════════════════════════════ */}
      {tab === 'accueil' && !isApporteur && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pipeline', value: stats.enCours, sub: Number(stats.montantPipeline).toLocaleString('fr-FR') + ' €', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Gagnés', value: stats.gagnes, sub: 'leads convertis', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Nouveaux', value: stats.nouveaux, sub: 'à traiter', color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Aujourd\'hui', value: stats.actionsAujourdhui, sub: 'actions réalisées', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(k => (
              <div key={k.label} className={cn('rounded-2xl p-5', k.bg)}>
                <div className={cn('text-3xl font-heading font-bold', k.color)}>{k.value}</div>
                <div className="text-sm font-medium text-surface-700 mt-1">{k.label}</div>
                <div className="text-xs text-surface-500 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Actions rapides</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Nouveau lead', href: '/dashboard/leads', icon: UserPlus, color: 'text-blue-600 bg-blue-50' },
                { label: 'Simulateur', href: '/dashboard/simulateur', icon: Calculator, color: 'text-violet-600 bg-violet-50' },
                { label: 'Audit terrain', href: '/dashboard/audit', icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
                { label: 'Prospection', href: '/dashboard/prospection', icon: Send, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Mailing', href: '/dashboard/mailing', icon: Mails, color: 'text-rose-600 bg-rose-50' },
                { label: 'Agenda', href: '/dashboard/agenda', icon: CalendarDays, color: 'text-teal-600 bg-teal-50' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-surface-200/80 hover:shadow-card transition-all active:scale-[0.98]">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', a.color)}>
                    <a.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-surface-800">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Derniers leads</div>
              <button onClick={() => setTab('leads')} className="text-xs text-brand-600 font-medium">Voir tout</button>
            </div>
            <div className="space-y-1.5">
              {recentLeads.map(lead => (
                <Link key={lead.id} href="/dashboard/leads"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors active:bg-surface-100">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900 truncate">{lead.contact_prenom} {lead.contact_nom}</div>
                    {lead.entreprise && <div className="text-xs text-surface-500 truncate">{lead.entreprise}</div>}
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', STATUS_COLORS[lead.status])}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </Link>
              ))}
              {recentLeads.length === 0 && <div className="text-center py-6 text-sm text-surface-400">Aucun lead</div>}
            </div>
          </div>

          {devisEnCours.length > 0 && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Devis en cours</div>
              <div className="space-y-1.5">
                {devisEnCours.map((d: any) => (
                  <Link key={d.id} href="/dashboard/devis"
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-surface-800">{d.numero}</div>
                      <div className="text-xs text-surface-500">{d.client?.raison_sociale || '—'}</div>
                    </div>
                    <div className="text-sm font-bold text-surface-900">{d.montant_ht ? Number(d.montant_ht).toLocaleString('fr-FR') + ' €' : '—'}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MES LEADS
          ════════════════════════════════════════════════════════ */}
      {tab === 'leads' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input className="input-base pl-11 text-base py-3" placeholder="Rechercher un lead..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400"><X className="h-4 w-4" /></button>}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { id: 'all', label: 'Tous ' + leads.length },
              { id: 'nouveau', label: 'Nouveaux' },
              { id: 'contacte', label: 'Contactés' },
              { id: 'qualification', label: 'Qualifiés' },
              { id: 'proposition_envoyee', label: 'Proposition' },
              { id: 'negociation', label: 'Négo' },
              { id: 'gagne', label: 'Gagnés' },
              { id: 'perdu', label: 'Perdus' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                  filterStatus === f.id ? 'bg-surface-900 text-white shadow-xs' : 'bg-surface-100 text-surface-600')}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map(lead => (
              <div key={lead.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-heading font-semibold text-surface-900">{lead.contact_prenom} {lead.contact_nom}</div>
                    {lead.entreprise && (
                      <div className="flex items-center gap-1 text-sm text-surface-500 mt-0.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />{lead.entreprise}
                      </div>
                    )}
                  </div>
                  <span className={cn('text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0', STATUS_COLORS[lead.status])}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </div>

                {lead.montant_estime && lead.montant_estime > 0 && (
                  <div className="text-sm font-bold text-success-600 mb-2">{Number(lead.montant_estime).toLocaleString('fr-FR')} €</div>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
                  {lead.contact_telephone && (
                    <a href={'tel:' + lead.contact_telephone}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium active:bg-blue-100 transition-colors">
                      <Phone className="h-4 w-4" /> Appeler
                    </a>
                  )}
                  {lead.contact_email && (
                    <a href={'mailto:' + lead.contact_email}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-50 text-violet-700 text-sm font-medium active:bg-violet-100 transition-colors">
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  )}
                  <Link href="/dashboard/leads"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-100 text-surface-700 text-sm font-medium active:bg-surface-200 transition-colors ml-auto">
                    Détails <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-surface-400">Aucun lead trouvé</div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          COMMISSIONS (apporteur uniquement)
          ════════════════════════════════════════════════════════ */}
      {tab === 'commissions' && isApporteur && (
        <div className="space-y-4">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-emerald-50 text-center">
              <div className="text-xl font-heading font-bold text-emerald-600">{Number(stats.commissionsPayees).toLocaleString('fr-FR')} €</div>
              <div className="text-xs font-medium text-surface-600 mt-1">Encaissées</div>
            </div>
            <div className="rounded-2xl p-4 bg-amber-50 text-center">
              <div className="text-xl font-heading font-bold text-amber-600">{Number(stats.commissionsEnAttente).toLocaleString('fr-FR')} €</div>
              <div className="text-xs font-medium text-surface-600 mt-1">En attente</div>
            </div>
            <div className="rounded-2xl p-4 bg-blue-50 text-center">
              <div className="text-xl font-heading font-bold text-blue-600">{Number(stats.totalCommissions).toLocaleString('fr-FR')} €</div>
              <div className="text-xs font-medium text-surface-600 mt-1">Total</div>
            </div>
          </div>

          {/* Taux */}
          {apporteurInfo && (
            <div className="card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-surface-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-surface-800">
                  Taux de commission : <strong>{apporteurInfo.taux_commission}%</strong>
                </div>
                <div className="text-xs text-surface-500">
                  Pourcentage calculé sur le montant HT du dossier
                </div>
              </div>
            </div>
          )}

          {/* Historique */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-100">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Historique des commissions</div>
            </div>
            {commissions.length > 0 ? (
              <div className="divide-y divide-surface-100">
                {commissions.map((c: any) => {
                  const cs = COMMISSION_STATUS[c.status] || COMMISSION_STATUS.en_attente
                  return (
                    <div key={c.id} className="px-4 py-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-surface-900 truncate">
                            {c.lead?.contact_prenom} {c.lead?.contact_nom}
                          </div>
                          <div className="text-xs text-surface-500 truncate">{c.lead?.entreprise || '—'}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={cs.variant}>{cs.label}</Badge>
                          <span className="text-sm font-bold text-surface-900 min-w-[70px] text-right">
                            {Number(c.montant || 0).toLocaleString('fr-FR')} €
                          </span>
                        </div>
                      </div>
                      {c.lead?.status && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[10px] text-surface-400">Dossier :</span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', STATUS_COLORS[c.lead.status])}>
                            {STATUS_LABELS[c.lead.status] || c.lead.status}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-surface-400">
                <Euro className="h-8 w-8 mx-auto mb-2 text-surface-300" />
                Aucune commission pour le moment
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          OUTILS
          ════════════════════════════════════════════════════════ */}
      {tab === 'outils' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Outils terrain</div>
          {[
            { label: 'Simulateur Budget OPCO', desc: 'Calculer le budget formation d\'un prospect', href: '/dashboard/simulateur', icon: Calculator, color: 'text-violet-600 bg-violet-50' },
            { label: 'Audit de Conformité', desc: 'Diagnostic réglementaire sur le terrain', href: '/dashboard/audit', icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
            { label: 'Prospection Email', desc: 'Envoyer un email de prospection', href: '/dashboard/prospection', icon: Send, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Mailing', desc: 'Envoyer un email avec template', href: '/dashboard/mailing', icon: Mails, color: 'text-rose-600 bg-rose-50' },
            { label: 'Agenda', desc: 'Planning et tâches', href: '/dashboard/agenda', icon: CalendarDays, color: 'text-teal-600 bg-teal-50' },
          ].map(tool => (
            <Link key={tool.href} href={tool.href}
              className="card p-5 flex items-center gap-4 hover:shadow-card transition-all active:scale-[0.99]">
              <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', tool.color)}>
                <tool.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-heading font-semibold text-surface-900">{tool.label}</div>
                <div className="text-sm text-surface-500 mt-0.5">{tool.desc}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-surface-300 shrink-0" />
            </Link>
          ))}

          {!isApporteur && (
            <>
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mt-6 mb-1">Accès CRM</div>
              {[
                { label: 'Pipeline Leads', desc: 'Vue Kanban complète', href: '/dashboard/leads', icon: Target, color: 'text-blue-600 bg-blue-50' },
                { label: 'Clients', desc: 'Fiches clients', href: '/dashboard/clients', icon: Building2, color: 'text-surface-600 bg-surface-100' },
                { label: 'Devis', desc: 'Mes devis en cours', href: '/dashboard/devis', icon: Star, color: 'text-surface-600 bg-surface-100' },
              ].map(tool => (
                <Link key={tool.href} href={tool.href}
                  className="card p-4 flex items-center gap-3 hover:shadow-card transition-all active:scale-[0.99]">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', tool.color)}>
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-heading font-semibold text-surface-900">{tool.label}</div>
                    <div className="text-xs text-surface-500">{tool.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-300 shrink-0" />
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
