'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Plus, Search, Building2, Store, Trash2, X, Loader2, Check, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { INCIDENT_TYPES, GRAVITE_META, STATUT_META } from '@/lib/incidents'
import { createIncidentAction, updateIncidentStatutAction, deleteIncidentAction } from './actions'

interface Client { id: string; raison_sociale: string; franchise_id: string | null }
interface SessionOpt { id: string; reference: string; formation: { intitule: string } | null }
interface Incident {
  id: string
  date_incident: string
  type: string
  gravite: string
  titre: string
  description: string | null
  mesures_prises: string | null
  statut: string
  client: { id: string; raison_sociale: string } | null
  franchise: { id: string; nom: string } | null
  session: { id: string; reference: string } | null
  auteur: { first_name: string | null; last_name: string | null } | null
}

export default function IncidentsClient({
  incidents, clients, sessions,
}: { incidents: Incident[]; clients: Client[]; sessions: SessionOpt[] }) {
  const [query, setQuery] = useState('')
  const [graviteFilter, setGraviteFilter] = useState('all')
  const [statutFilter, setStatutFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return incidents.filter((i) => {
      if (graviteFilter !== 'all' && i.gravite !== graviteFilter) return false
      if (statutFilter !== 'all' && i.statut !== statutFilter) return false
      if (q) {
        const hay = `${i.titre} ${i.description || ''} ${i.client?.raison_sociale || ''} ${i.franchise?.nom || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [incidents, query, graviteFilter, statutFilter])

  const ouverts = incidents.filter((i) => i.statut === 'ouvert' || i.statut === 'en_cours').length
  const critiques = incidents.filter((i) => (i.gravite === 'majeur' || i.gravite === 'critique') && i.statut !== 'clos').length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Incidents</h1>
          <p className="text-surface-500 text-sm mt-1">Rapports d'incident survenus pendant les formations.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Signaler un incident
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat icon={AlertTriangle} tint="brand" value={String(incidents.length)} label="Incidents total" />
        <Stat icon={AlertTriangle} tint="rose" value={String(ouverts)} label="Ouverts / en cours" />
        <Stat icon={AlertTriangle} tint="orange" value={String(critiques)} label="Majeurs / critiques actifs" />
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre, établissement, franchise…" className="input-base pl-9 w-full text-sm" />
        </div>
        <select value={graviteFilter} onChange={(e) => setGraviteFilter(e.target.value)} className="input-base text-sm">
          <option value="all">Toutes gravités</option>
          {Object.entries(GRAVITE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="input-base text-sm">
          <option value="all">Tous statuts</option>
          {Object.entries(STATUT_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center text-center py-14 px-8">
          <AlertTriangle className="h-6 w-6 text-surface-400 mb-3" />
          <p className="text-sm text-surface-500">Aucun incident</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => <IncidentCard key={i.id} incident={i} />)}
        </div>
      )}

      {showCreate && <CreateModal clients={clients} sessions={sessions} onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function Stat({ icon: Icon, tint, value, label }: { icon: any; tint: string; value: string; label: string }) {
  const tints: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600', rose: 'bg-rose-50 text-rose-600', orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tints[tint]}`}><Icon className="h-5 w-5" /></div>
      <div><div className="text-2xl font-heading font-bold text-surface-900">{value}</div><div className="text-xs text-surface-500">{label}</div></div>
    </div>
  )
}

function IncidentCard({ incident }: { incident: Incident }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const grav = GRAVITE_META[incident.gravite] || GRAVITE_META.mineur
  const stat = STATUT_META[incident.statut] || STATUT_META.ouvert

  const setStatut = (statut: string) => startTransition(async () => {
    const r = await updateIncidentStatutAction(incident.id, statut)
    if (!r.success) alert((r as any).error || 'Erreur'); else router.refresh()
  })

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={cn('shrink-0 mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center', grav.bg)}>
          <AlertTriangle className={cn('h-4 w-4', grav.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-surface-900">{incident.titre}</span>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', grav.bg, grav.text)}>{grav.label}</span>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', stat.bg, stat.text)}>{stat.label}</span>
          </div>
          <div className="text-xs text-surface-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>{new Date(incident.date_incident).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>· {INCIDENT_TYPES[incident.type] || incident.type}</span>
            {incident.client && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{incident.client.raison_sociale}</span>}
            {incident.franchise && <span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{incident.franchise.nom}</span>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          {(incident.description || incident.mesures_prises) && (
            <button onClick={() => setExpanded((v) => !v)} className="p-2 rounded-lg text-surface-400 hover:bg-surface-50">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => { if (confirm('Supprimer cet incident ?')) startTransition(async () => { const r = await deleteIncidentAction(incident.id); if (!r.success) alert((r as any).error); else router.refresh() }) }}
            className="p-2 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-surface-100 space-y-3 text-sm">
          {incident.description && (
            <div><div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1">Description</div><p className="text-surface-700 whitespace-pre-wrap">{incident.description}</p></div>
          )}
          {incident.mesures_prises && (
            <div><div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Mesures prises</div><p className="text-surface-700 whitespace-pre-wrap">{incident.mesures_prises}</p></div>
          )}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-surface-400 mr-1">Statut :</span>
            {Object.entries(STATUT_META).map(([v, m]) => (
              <button key={v} onClick={() => setStatut(v)}
                className={cn('text-[11px] font-semibold px-2 py-1 rounded-md', incident.statut === v ? `${m.bg} ${m.text}` : 'text-surface-500 hover:bg-surface-100')}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateModal({ clients, sessions, onClose }: { clients: Client[]; sessions: SessionOpt[]; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientId, setClientId] = useState('')

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients.slice(0, 50)
    return clients.filter((c) => c.raison_sociale.toLowerCase().includes(q)).slice(0, 50)
  }, [clients, clientSearch])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!clientId) { setError('Sélectionnez l\'établissement concerné'); return }
    const fd = new FormData(e.currentTarget)
    fd.set('client_id', clientId)
    setError(null)
    startTransition(async () => {
      const r = await createIncidentAction(fd)
      if (r.success) { router.refresh(); onClose() } else setError((r as any).error || 'Erreur')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-modal max-h-[95vh] overflow-hidden flex flex-col animate-slide-up">
        <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between shrink-0">
          <div className="text-base font-heading font-semibold text-surface-900">Signaler un incident</div>
          <button onClick={onClose} className="p-2 rounded-lg text-surface-400 hover:bg-surface-100"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Établissement concerné *</label>
              <input value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setClientId('') }} placeholder="Rechercher…" className="input-base w-full mt-1 text-sm" />
              {clientSearch && !clientId && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-surface-200 rounded-lg divide-y divide-surface-100">
                  {filteredClients.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setClientId(c.id); setClientSearch(c.raison_sociale) }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50">{c.raison_sociale}</button>
                  ))}
                  {filteredClients.length === 0 && <div className="px-3 py-2 text-sm text-surface-400">Aucun résultat</div>}
                </div>
              )}
              {clientId && <div className="text-xs text-emerald-600 mt-1 inline-flex items-center gap-1"><Check className="h-3 w-3" /> Sélectionné</div>}
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Session liée (optionnel)</label>
              <select name="session_id" className="input-base w-full mt-1 text-sm">
                <option value="">Aucune</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.reference} {s.formation ? `— ${s.formation.intitule}` : ''}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Type</label>
                <select name="type" defaultValue="autre" className="input-base w-full mt-1 text-sm">
                  {Object.entries(INCIDENT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Gravité</label>
                <select name="gravite" defaultValue="mineur" className="input-base w-full mt-1 text-sm">
                  {Object.entries(GRAVITE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Date</label>
                <input type="date" name="date_incident" defaultValue={new Date().toISOString().split('T')[0]} className="input-base w-full mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Statut</label>
                <select name="statut" defaultValue="ouvert" className="input-base w-full mt-1 text-sm">
                  {Object.entries(STATUT_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Titre *</label>
              <input name="titre" required placeholder="Ex : Chute d'un participant en cuisine" className="input-base w-full mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Description</label>
              <textarea name="description" rows={3} className="input-base w-full mt-1 text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Mesures prises</label>
              <textarea name="mesures_prises" rows={2} className="input-base w-full mt-1 text-sm resize-none" />
            </div>

            {error && <div className="text-xs text-rose-600">{error}</div>}
          </div>

          <div className="px-5 py-3 border-t border-surface-200 flex items-center justify-end gap-2 bg-surface-50/60">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-surface-200 text-sm font-medium text-surface-600 hover:bg-white">Annuler</button>
            <button type="submit" disabled={isPending} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
