'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  FolderOpen, Plus, Search, LayoutGrid, Table2, Columns3, BarChart3,
  AlertTriangle, CheckCircle2, Clock, User, Phone, Mail, FileText,
  Edit3, Trash2, X, Save, ChevronDown, Filter,
} from 'lucide-react'
import { Button, Badge, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'

// ═══ DOUBLE PIPELINE CONFIG ═══

const ORG_STATUTS = [
  { key: 'standby', label: 'Stand-by', progression: 0, color: '#94A3B8', bg: '#F1F5F9' },
  { key: 'proposition', label: 'Proposition envoyée', progression: 10, color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'att_client', label: 'Attente client', progression: 15, color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'att_liste', label: 'Att. liste participants', progression: 25, color: '#EAB308', bg: '#FEFCE8' },
  { key: 'conv_faire', label: 'Convention à faire', progression: 40, color: '#EF4444', bg: '#FEF2F2' },
  { key: 'conv_modifier', label: 'Convention à modifier', progression: 50, color: '#F97316', bg: '#FFF7ED' },
  { key: 'conv_envoyee', label: 'Conv. envoyée', progression: 70, color: '#EAB308', bg: '#FEFCE8' },
  { key: 'conv_signee', label: 'Convention signée', progression: 100, color: '#10B981', bg: '#ECFDF5' },
]

const AKTO_STATUTS = [
  { key: 'relance', label: 'Relance création AKTO', progression: 0, color: '#94A3B8', bg: '#F1F5F9' },
  { key: 'creer', label: 'Compte AKTO à créer', progression: 15, color: '#EF4444', bg: '#FEF2F2' },
  { key: 'courrier', label: 'Att. courrier AKTO', progression: 30, color: '#F97316', bg: '#FFF7ED' },
  { key: 'remplir', label: 'DPC à remplir', progression: 50, color: '#F97316', bg: '#FFF7ED' },
  { key: 'verifier', label: 'DPC à vérifier', progression: 65, color: '#EAB308', bg: '#FEFCE8' },
  { key: 'client', label: 'DPC au client', progression: 80, color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'transmis', label: 'DPC transmis AKTO', progression: 100, color: '#10B981', bg: '#ECFDF5' },
]

const PROSPECT_STATUTS = [
  { key: 'prospect', label: 'Prospect' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'signe', label: 'Signé' },
  { key: 'standby', label: 'Stand-by' },
]

interface AdminDossier {
  id: string
  client: string
  formation: string
  dateDebut: string
  dateFin: string
  participants: string
  statutOrg: string
  statutAkto: string
  statutProspect: string
  emailAkto: string
  mdpAkto: string
  notes: string
  relance: string
  formateurNom: string
  formateurTel: string
}

interface Formateur { id: string; nom: string; tel: string; email: string; specialites: string[] }

type ViewMode = 'cartes' | 'tableau' | 'kanban' | 'pipeline'

const STORAGE_KEY = 'crm_admin_v3'

function loadDossiers(): AdminDossier[] {
  if (typeof window === 'undefined') return []
  try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return d.leads || [] } catch { return [] }
}
function saveDossiers(dossiers: AdminDossier[]) {
  const existing = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') : {}
  existing.leads = dossiers
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

function getOrgStatut(key: string) { return ORG_STATUTS.find(s => s.key === key) || ORG_STATUTS[0] }
function getAktoStatut(key: string) { return AKTO_STATUTS.find(s => s.key === key) || AKTO_STATUTS[0] }

function calcProgression(d: AdminDossier) {
  const org = getOrgStatut(d.statutOrg).progression
  const akto = getAktoStatut(d.statutAkto).progression
  return Math.round((org + akto) / 2)
}

function getProgressionColor(p: number) {
  if (p >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-700' }
  if (p >= 65) return { bar: 'bg-emerald-400', text: 'text-emerald-600' }
  if (p >= 40) return { bar: 'bg-blue-500', text: 'text-blue-600' }
  if (p >= 20) return { bar: 'bg-amber-500', text: 'text-amber-600' }
  return { bar: 'bg-red-500', text: 'text-red-600' }
}

const emptyForm: AdminDossier = {
  id: '', client: '', formation: '', dateDebut: '', dateFin: '', participants: '',
  statutOrg: 'standby', statutAkto: 'relance', statutProspect: 'prospect',
  emailAkto: '', mdpAkto: '', notes: '', relance: '', formateurNom: '', formateurTel: '',
}

interface Props { formateurs: Formateur[] }

export function SuiviAdminClient({ formateurs }: Props) {
  const { toast } = useToast()
  const [dossiers, setDossiers] = useState<AdminDossier[]>([])
  const [view, setView] = useState<ViewMode>('cartes')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [kanbanMode, setKanbanMode] = useState<'org' | 'akto'>('org')
  const [showModal, setShowModal] = useState(false)
  const [editDossier, setEditDossier] = useState<AdminDossier | null>(null)
  const [form, setForm] = useState<AdminDossier>(emptyForm)

  // Load from localStorage
  useEffect(() => { setDossiers(loadDossiers()) }, [])
  useEffect(() => { if (dossiers.length > 0) saveDossiers(dossiers) }, [dossiers])

  // Alerts
  const alerts = useMemo(() => {
    const noFormateur = dossiers.filter(d => d.statutOrg === 'conv_signee' && !d.formateurNom)
    const urgent = dossiers.filter(d =>
      d.statutOrg === 'conv_signee' &&
      ['remplir', 'verifier', 'client', 'transmis'].includes(d.statutAkto) &&
      !d.formateurNom
    )
    return { noFormateur, urgent }
  }, [dossiers])

  // Filtered
  const filtered = useMemo(() => {
    let f = dossiers.slice()
    if (search) {
      const q = search.toLowerCase()
      f = f.filter(d => d.client.toLowerCase().includes(q) || d.formation.toLowerCase().includes(q) || d.formateurNom.toLowerCase().includes(q))
    }
    if (filter === 'no_formateur') f = f.filter(d => !d.formateurNom && d.statutOrg === 'conv_signee')
    else if (filter === 'signe') f = f.filter(d => d.statutProspect === 'signe')
    else if (filter === 'en_cours') f = f.filter(d => d.statutProspect === 'en_cours')
    return f
  }, [dossiers, search, filter])

  // Stats
  const stats = useMemo(() => ({
    total: dossiers.length,
    signes: dossiers.filter(d => d.statutProspect === 'signe').length,
    complets: dossiers.filter(d => d.statutOrg === 'conv_signee' && d.statutAkto === 'transmis').length,
    sansFormateur: alerts.noFormateur.length,
  }), [dossiers, alerts])

  function openModal(d?: AdminDossier) {
    if (d) { setEditDossier(d); setForm({ ...d }) }
    else { setEditDossier(null); setForm({ ...emptyForm, id: `adm_${Date.now()}` }) }
    setShowModal(true)
  }

  function saveDossier() {
    if (!form.client.trim()) { toast('error', 'Nom client requis'); return }
    if (editDossier) {
      setDossiers(prev => prev.map(d => d.id === editDossier.id ? form : d))
    } else {
      setDossiers(prev => [form, ...prev])
    }
    setShowModal(false)
    toast('success', 'Dossier enregistré')
  }

  function deleteDossier() {
    if (!editDossier || !confirm('Supprimer ce dossier ?')) return
    setDossiers(prev => prev.filter(d => d.id !== editDossier.id))
    setShowModal(false)
    toast('success', 'Dossier supprimé')
  }

  function updateStatut(id: string, field: 'statutOrg' | 'statutAkto', value: string) {
    setDossiers(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Suivi Administratif</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {stats.total} dossier{stats.total > 1 ? 's' : ''} · {stats.signes} signé{stats.signes > 1 ? 's' : ''} · {stats.complets} complet{stats.complets > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => openModal()} icon={<Plus className="h-4 w-4" />}>Nouveau dossier</Button>
      </div>

      {/* Alerts */}
      {alerts.noFormateur.length > 0 && (
        <div className="card p-4 border-warning-200 border bg-warning-50/30 mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-warning-800">
            <AlertTriangle className="h-4 w-4" />
            {alerts.noFormateur.length} dossier{alerts.noFormateur.length > 1 ? 's' : ''} sans formateur (convention signée)
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {alerts.noFormateur.map(d => (
              <button key={d.id} onClick={() => openModal(d)} className="text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded-lg hover:bg-warning-200 transition-colors">
                {d.client}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-surface-800' },
          { label: 'Signés', value: stats.signes, color: 'text-success-600' },
          { label: 'Complets', value: stats.complets, color: 'text-brand-600' },
          { label: 'Sans formateur', value: stats.sansFormateur, color: stats.sansFormateur > 0 ? 'text-danger-600' : 'text-surface-400' },
        ].map(k => (
          <div key={k.label} className="card p-3 text-center">
            <div className={cn('text-2xl font-heading font-bold', k.color)}>{k.value}</div>
            <div className="text-[11px] text-surface-400">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input className="input-base pl-10" placeholder="Rechercher un dossier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="input-base w-auto text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="signe">Signés</option>
            <option value="en_cours">En cours</option>
            <option value="no_formateur">Sans formateur</option>
          </select>
          <div className="flex bg-surface-100 rounded-lg p-0.5">
            {([
              { id: 'cartes' as const, icon: <LayoutGrid className="h-4 w-4" /> },
              { id: 'tableau' as const, icon: <Table2 className="h-4 w-4" /> },
              { id: 'kanban' as const, icon: <Columns3 className="h-4 w-4" /> },
              { id: 'pipeline' as const, icon: <BarChart3 className="h-4 w-4" /> },
            ]).map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cn('p-2 rounded-md transition-colors', view === v.id ? 'bg-white shadow-xs text-surface-900' : 'text-surface-400 hover:text-surface-600')}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── VUE CARTES ─── */}
      {view === 'cartes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(d => {
            const prog = calcProgression(d)
            const pc = getProgressionColor(prog)
            const org = getOrgStatut(d.statutOrg)
            const akto = getAktoStatut(d.statutAkto)
            return (
              <div key={d.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openModal(d)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-heading font-semibold text-surface-900">{d.client}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{d.formation || 'Formation non définie'}</div>
                  </div>
                  <span className={cn('text-lg font-heading font-bold', pc.text)}>{prog}%</span>
                </div>

                {/* Double progress bar */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-surface-400 w-8">Org</span>
                    <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${org.progression}%`, backgroundColor: org.color }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-surface-400 w-8">AKTO</span>
                    <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${akto.progression}%`, backgroundColor: akto.color }} />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: org.bg, color: org.color }}>{org.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: akto.bg, color: akto.color }}>{akto.label}</span>
                </div>

                {/* Formateur */}
                <div className="mt-2 pt-2 border-t border-surface-100 flex items-center justify-between">
                  {d.formateurNom ? (
                    <span className="text-xs text-surface-600 flex items-center gap-1"><User className="h-3 w-3" /> {d.formateurNom}</span>
                  ) : (
                    <span className="text-xs text-danger-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Sans formateur</span>
                  )}
                  {d.dateDebut && <span className="text-[10px] text-surface-400">{new Date(d.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full card flex flex-col items-center justify-center text-center py-14">
              <FolderOpen className="h-6 w-6 text-surface-400 mb-3" />
              <p className="text-sm text-surface-500">Aucun dossier</p>
              <Button size="sm" className="mt-3" onClick={() => openModal()} icon={<Plus className="h-4 w-4" />}>Créer un dossier</Button>
            </div>
          )}
        </div>
      )}

      {/* ─── VUE TABLEAU ─── */}
      {view === 'tableau' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="table-header">Client</th>
                  <th className="table-header">Formation</th>
                  <th className="table-header">Dates</th>
                  <th className="table-header">Statut Org</th>
                  <th className="table-header">Statut AKTO</th>
                  <th className="table-header">Formateur</th>
                  <th className="table-header">Prog.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(d => {
                  const prog = calcProgression(d)
                  const pc = getProgressionColor(prog)
                  const org = getOrgStatut(d.statutOrg)
                  const akto = getAktoStatut(d.statutAkto)
                  return (
                    <tr key={d.id} className="table-row cursor-pointer" onClick={() => openModal(d)}>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-surface-800">{d.client}</div>
                        <div className="text-xs text-surface-400">{d.participants && `${d.participants} pers.`}</div>
                      </td>
                      <td className="table-cell text-sm text-surface-600">{d.formation || '—'}</td>
                      <td className="table-cell text-xs text-surface-500">
                        {d.dateDebut && new Date(d.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {d.dateFin && ` → ${new Date(d.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                      </td>
                      <td className="table-cell">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: org.bg, color: org.color }}>{org.label}</span>
                      </td>
                      <td className="table-cell">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: akto.bg, color: akto.color }}>{akto.label}</span>
                      </td>
                      <td className="table-cell text-sm">
                        {d.formateurNom ? <span className="text-surface-700">{d.formateurNom}</span> : <span className="text-danger-500 text-xs">Aucun</span>}
                      </td>
                      <td className="table-cell">
                        <span className={cn('text-sm font-bold', pc.text)}>{prog}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── VUE KANBAN ─── */}
      {view === 'kanban' && (
        <div>
          <div className="flex gap-2 mb-4">
            {(['org', 'akto'] as const).map(m => (
              <button key={m} onClick={() => setKanbanMode(m)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', kanbanMode === m ? 'bg-surface-900 text-white' : 'bg-surface-100 text-surface-600')}>
                Pipeline {m === 'org' ? 'Organisation' : 'AKTO'}
              </button>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {(kanbanMode === 'org' ? ORG_STATUTS : AKTO_STATUTS).map(statut => {
              const items = filtered.filter(d => kanbanMode === 'org' ? d.statutOrg === statut.key : d.statutAkto === statut.key)
              return (
                <div key={statut.key} className="min-w-[260px] flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statut.color }} />
                    <span className="text-xs font-semibold text-surface-700">{statut.label}</span>
                    <span className="text-[10px] bg-surface-100 text-surface-500 rounded-full px-1.5">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px] bg-surface-50 rounded-xl p-2">
                    {items.map(d => (
                      <div key={d.id} className="bg-white rounded-lg p-3 border border-surface-200/80 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openModal(d)}>
                        <div className="text-sm font-medium text-surface-800">{d.client}</div>
                        <div className="text-xs text-surface-500 mt-0.5">{d.formation || '—'}</div>
                        {d.formateurNom && <div className="text-[10px] text-surface-400 mt-1 flex items-center gap-1"><User className="h-2.5 w-2.5" />{d.formateurNom}</div>}
                        {!d.formateurNom && d.statutOrg === 'conv_signee' && <div className="text-[10px] text-danger-500 mt-1">Sans formateur</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── VUE PIPELINE ─── */}
      {view === 'pipeline' && (
        <div className="space-y-2">
          {filtered.map(d => {
            const prog = calcProgression(d)
            const pc = getProgressionColor(prog)
            const org = getOrgStatut(d.statutOrg)
            const akto = getAktoStatut(d.statutAkto)
            return (
              <div key={d.id} className="card p-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openModal(d)}>
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-heading font-semibold text-surface-900">{d.client}</span>
                      {d.formateurNom ? (
                        <span className="text-[10px] text-surface-400">{d.formateurNom}</span>
                      ) : d.statutOrg === 'conv_signee' ? (
                        <span className="text-[10px] text-danger-500">Sans formateur</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-surface-500">{d.formation || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-32">
                      <div className="text-[10px] text-surface-400 mb-0.5">Org</div>
                      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${org.progression}%`, backgroundColor: org.color }} />
                      </div>
                    </div>
                    <div className="w-32">
                      <div className="text-[10px] text-surface-400 mb-0.5">AKTO</div>
                      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${akto.progression}%`, backgroundColor: akto.color }} />
                      </div>
                    </div>
                    <span className={cn('text-lg font-heading font-bold w-12 text-right', pc.text)}>{prog}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── MODAL CRUD ─── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editDossier ? 'Modifier le dossier' : 'Nouveau dossier'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Client & Formation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Client / Établissement *</label>
              <input className="input-base" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Nom du client" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Formation</label>
              <input className="input-base" value={form.formation} onChange={e => setForm({ ...form, formation: e.target.value })} placeholder="Intitulé formation" />
            </div>
          </div>

          {/* Dates & Participants */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Date début</label>
              <input className="input-base" type="date" value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Date fin</label>
              <input className="input-base" type="date" value={form.dateFin} onChange={e => setForm({ ...form, dateFin: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Participants</label>
              <input className="input-base" value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })} placeholder="Nombre" />
            </div>
          </div>

          {/* Double Pipeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Statut Organisation</label>
              <select className="input-base" value={form.statutOrg} onChange={e => setForm({ ...form, statutOrg: e.target.value })}>
                {ORG_STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Statut AKTO</label>
              <select className="input-base" value={form.statutAkto} onChange={e => setForm({ ...form, statutAkto: e.target.value })}>
                {AKTO_STATUTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Prospect status */}
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1.5 block">Statut prospect</label>
            <div className="flex gap-2">
              {PROSPECT_STATUTS.map(s => (
                <button key={s.key} onClick={() => setForm({ ...form, statutProspect: s.key })}
                  className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all', form.statutProspect === s.key ? 'bg-surface-900 text-white' : 'bg-surface-50 text-surface-600 hover:bg-surface-100')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* AKTO credentials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Email AKTO</label>
              <input className="input-base" type="email" value={form.emailAkto} onChange={e => setForm({ ...form, emailAkto: e.target.value })} placeholder="email@akto.fr" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Mot de passe AKTO</label>
              <input className="input-base" type="text" value={form.mdpAkto} onChange={e => setForm({ ...form, mdpAkto: e.target.value })} placeholder="********" />
            </div>
          </div>

          {/* Formateur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Formateur</label>
              <select className="input-base" value={form.formateurNom} onChange={e => {
                const f = formateurs.find(x => x.nom === e.target.value)
                setForm({ ...form, formateurNom: e.target.value, formateurTel: f?.tel || form.formateurTel })
              }}>
                <option value="">Sélectionner...</option>
                {formateurs.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                <option value="_custom">Autre (saisie libre)</option>
              </select>
              {form.formateurNom === '_custom' && (
                <input className="input-base mt-2" value="" onChange={e => setForm({ ...form, formateurNom: e.target.value })} placeholder="Nom du formateur" />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-surface-500 mb-1.5 block">Tél. formateur</label>
              <input className="input-base" value={form.formateurTel} onChange={e => setForm({ ...form, formateurTel: e.target.value })} placeholder="06 XX XX XX XX" />
            </div>
          </div>

          {/* Relance */}
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1.5 block">Relance</label>
            <input className="input-base" value={form.relance} onChange={e => setForm({ ...form, relance: e.target.value })} placeholder="Tags de relance (AKTO, Convention, Client)" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1.5 block">Notes</label>
            <textarea className="input-base resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes libres..." />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            {editDossier ? (
              <Button variant="danger" onClick={deleteDossier} icon={<Trash2 className="h-4 w-4" />}>Supprimer</Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button onClick={saveDossier} icon={<Save className="h-4 w-4" />}>Enregistrer</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
