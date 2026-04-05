'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Phone, Mail, Building2, UserPlus, Search, MapPin,
  Calculator, ClipboardList, Send, Mails, CalendarDays,
  TrendingUp, Target, CheckCircle2, Clock, ArrowRight,
  ChevronRight, Star, Filter, X,
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
  nouveau: 'Nouveau', contacte: 'Contacte', qualification: 'Qualifie',
  proposition_envoyee: 'Proposition', negociation: 'Negociation',
  gagne: 'Gagne', perdu: 'Perdu',
}
const STATUS_COLORS: Record<string, string> = {
  nouveau: 'bg-brand-100 text-brand-700', contacte: 'bg-cyan-100 text-cyan-700',
  qualification: 'bg-amber-100 text-amber-700', proposition_envoyee: 'bg-purple-100 text-purple-700',
  negociation: 'bg-orange-100 text-orange-700', gagne: 'bg-emerald-100 text-emerald-700',
  perdu: 'bg-red-100 text-red-700',
}

interface Props {
  userName: string; userRole?: string; leads: Lead[]
  interactionsToday: any[]; devisEnCours: any[]
}

export function CommercialClient({ userName, userRole, leads, interactionsToday, devisEnCours }: Props) {
  const isDirecteur = userRole === 'directeur_commercial'
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [tab, setTab] = useState<'accueil' | 'leads' | 'outils'>('accueil')

  const today = new Date().toISOString().split('T')[0]

  const stats = useMemo(() => ({
    total: leads.length,
    nouveaux: leads.filter(l => l.status === 'nouveau').length,
    enCours: leads.filter(l => !['gagne', 'perdu'].includes(l.status)).length,
    gagnes: leads.filter(l => l.status === 'gagne').length,
    actionsAujourdhui: interactionsToday.length,
    devisOuverts: devisEnCours.length,
    montantPipeline: leads.filter(l => !['gagne', 'perdu'].includes(l.status)).reduce((s, l) => s + (l.montant_estime || 0), 0),
  }), [leads, interactionsToday, devisEnCours])

  const filtered = useMemo(() => {
    let f = leads.slice()
    if (search) {
      const q = search.toLowerCase()
      f = f.filter(l => (l.contact_nom || '').toLowerCase().includes(q) || (l.contact_prenom || '').toLowerCase().includes(q) || (l.entreprise || '').toLowerCase().includes(q) || (l.contact_telephone || '').includes(q))
    }
    if (filterStatus !== 'all') f = f.filter(l => l.status === filterStatus)
    return f
  }, [leads, search, filterStatus])

  const recentLeads = leads.slice(0, 8)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">
          Bonjour, {userName}
        </h1>
        <p className="text-surface-500 mt-1 text-sm">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' -- '}
          {isDirecteur
            ? `${stats.total} leads equipe - ${stats.actionsAujourdhui} action${stats.actionsAujourdhui > 1 ? 's' : ''} aujourd'hui`
            : `${stats.actionsAujourdhui} action${stats.actionsAujourdhui > 1 ? 's' : ''} aujourd'hui`
          }
        </p>
      </div>

      {/* Tabs mobile */}
      <div className="flex gap-1 mb-5 bg-surface-100 rounded-lg p-0.5">
        {([
          { id: 'accueil' as const, label: 'Accueil' },
          { id: 'leads' as const, label: 'Mes leads (' + stats.total + ')' },
          { id: 'outils' as const, label: 'Outils' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors', tab === t.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ACCUEIL ─── */}
      {tab === 'accueil' && (
        <div className="space-y-4">
          {/* KPIs - big touch targets */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pipeline', value: stats.enCours, sub: Number(stats.montantPipeline).toLocaleString('fr-FR') + ' EUR', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Gagnes', value: stats.gagnes, sub: 'leads convertis', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Nouveaux', value: stats.nouveaux, sub: 'a traiter', color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Aujourd\'hui', value: stats.actionsAujourdhui, sub: 'actions realisees', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(k => (
              <div key={k.label} className={cn('rounded-2xl p-5', k.bg)}>
                <div className={cn('text-3xl font-heading font-bold', k.color)}>{k.value}</div>
                <div className="text-sm font-medium text-surface-700 mt-1">{k.label}</div>
                <div className="text-xs text-surface-500 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Quick actions - big buttons for iPad */}
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

          {/* Recent leads */}
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
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', STATUS_COLORS[lead.status] || 'bg-surface-100 text-surface-600')}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </Link>
              ))}
              {recentLeads.length === 0 && <div className="text-center py-6 text-sm text-surface-400">Aucun lead</div>}
            </div>
          </div>

          {/* Devis en cours */}
          {devisEnCours.length > 0 && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Devis en cours</div>
              <div className="space-y-1.5">
                {devisEnCours.map((d: any) => (
                  <Link key={d.id} href="/dashboard/devis"
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-surface-800">{d.numero}</div>
                      <div className="text-xs text-surface-500">{d.client?.raison_sociale || '--'}</div>
                    </div>
                    <div className="text-sm font-bold text-surface-900">{d.montant_ht ? Number(d.montant_ht).toLocaleString('fr-FR') + ' EUR' : '--'}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MES LEADS ─── */}
      {tab === 'leads' && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input className="input-base pl-11 text-base py-3" placeholder="Rechercher un lead..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400"><X className="h-4 w-4" /></button>}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              { id: 'all', label: 'Tous ' + leads.length },
              { id: 'nouveau', label: 'Nouveaux ' + stats.nouveaux },
              { id: 'contacte', label: 'Contactes' },
              { id: 'qualification', label: 'Qualifies' },
              { id: 'proposition_envoyee', label: 'Proposition' },
              { id: 'negociation', label: 'Nego' },
              { id: 'gagne', label: 'Gagnes' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                  filterStatus === f.id ? 'bg-surface-900 text-white shadow-xs' : 'bg-surface-100 text-surface-600')}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Leads list - big touch targets */}
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
                  <span className={cn('text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0', STATUS_COLORS[lead.status] || 'bg-surface-100 text-surface-600')}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </div>

                {lead.montant_estime && lead.montant_estime > 0 && (
                  <div className="text-sm font-bold text-success-600 mb-2">{Number(lead.montant_estime).toLocaleString('fr-FR')} EUR</div>
                )}

                {/* Action buttons - big for touch */}
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
                    Voir <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-surface-400">Aucun lead trouve</div>
            )}
          </div>
        </div>
      )}

      {/* ─── OUTILS ─── */}
      {tab === 'outils' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Outils terrain</div>
          {[
            { label: 'Simulateur Budget OPCO', desc: 'Calculer le budget formation d\'un prospect', href: '/dashboard/simulateur', icon: Calculator, color: 'text-violet-600 bg-violet-50' },
            { label: 'Audit de Conformite', desc: 'Diagnostic reglementaire sur le terrain', href: '/dashboard/audit', icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
            { label: 'Prospection Email', desc: 'Envoyer un email de prospection', href: '/dashboard/prospection', icon: Send, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Mailing', desc: 'Envoyer un email avec template', href: '/dashboard/mailing', icon: Mails, color: 'text-rose-600 bg-rose-50' },
            { label: 'Agenda', desc: 'Planning et taches', href: '/dashboard/agenda', icon: CalendarDays, color: 'text-teal-600 bg-teal-50' },
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

          <div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mt-6 mb-1">Acces CRM</div>
          {[
            { label: 'Pipeline Leads', desc: 'Vue Kanban complete', href: '/dashboard/leads', icon: Target, color: 'text-blue-600 bg-blue-50' },
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
        </div>
      )}
    </div>
  )
}
