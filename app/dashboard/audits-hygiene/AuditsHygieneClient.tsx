'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, RefreshCw, Database, Link2, Search, Building2, AlertTriangle,
  ClipboardCheck, FileWarning, EyeOff, Check, ExternalLink, CalendarDays,
} from 'lucide-react'
import { Button, Badge, Input, Select, useToast } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import { synchroniserAction, rattacherEtablissementAction, ignorerEtablissementAction } from './actions'

const OUTIL_URL = 'https://audithygiene.vercel.app'

type Onglet = 'audits' | 'duerp' | 'rapprochement'

const MENTION_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  SATISFAISANT: 'success',
  'A AMELIORER': 'warning',
  INSUFFISANT: 'danger',
}

const scoreCouleur = (n: number) => (n >= 80 ? '#16a34a' : n >= 60 ? '#d97706' : '#dc2626')

export function AuditsHygieneClient({
  audits, duerps, actions, etablissements, orphelins, clients, derniereSync, tableManquante, peutSynchroniser,
}: {
  audits: any[]; duerps: any[]; actions: any[]; etablissements: any[]
  orphelins: any[]; clients: any[]; derniereSync: any
  tableManquante: boolean; peutSynchroniser: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [onglet, setOnglet] = useState<Onglet>('audits')
  const [q, setQ] = useState('')
  const [sync, setSync] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [choix, setChoix] = useState<Record<string, string>>({})

  const stats = useMemo(() => {
    const scores = audits.map((a) => Number(a.score_global)).filter((n) => !isNaN(n) && n > 0)
    const enRetard = actions.filter(
      (a) => a.echeance && a.statut !== 'realise' && a.statut !== 'annule' && a.echeance < new Date().toISOString().slice(0, 10),
    ).length
    return {
      audits: audits.length,
      duerps: duerps.length,
      moyenne: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
      nonConformes: audits.filter((a) => a.mention === 'INSUFFISANT').length,
      rattaches: etablissements.filter((e) => e.client_id).length,
      actionsEnRetard: enRetard,
      prospectsReseau: etablissements.filter((e) => !e.client_id && e._franchise && !e.ignore_rapprochement).length,
    }
  }, [audits, duerps, actions, etablissements])

  const filtrer = (rows: any[]) => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) =>
      [r._etab?.nom, r._etab?.ville, r.num_rapport, r.num_document, r.formateur_nom, r._client?.raison_sociale]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(t)),
    )
  }

  async function handleSync() {
    setSync(true)
    const res = await synchroniserAction()
    setSync(false)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    const r: any = res.data
    toast('success', `${r.audits} audits et ${r.duerps} DUERP synchronisés — ${r.orphelins} établissement(s) à rattacher`)
    router.refresh()
  }

  async function handleRattacher(etabId: string) {
    const clientId = choix[etabId]
    if (!clientId) { toast('error', 'Choisissez un client'); return }
    setBusy(etabId)
    const res = await rattacherEtablissementAction(etabId, clientId)
    setBusy(null)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', 'Établissement rattaché')
    router.refresh()
  }

  async function handleIgnorer(etabId: string) {
    setBusy(etabId)
    const res = await ignorerEtablissementAction(etabId, true)
    setBusy(null)
    if (!res.success) { toast('error', res.error || 'Erreur'); return }
    toast('success', 'Établissement écarté du rapprochement')
    router.refresh()
  }

  const ONGLETS: { key: Onglet; label: string; n?: number }[] = [
    { key: 'audits', label: 'Audits hygiène', n: audits.length },
    { key: 'duerp', label: 'DUERP', n: duerps.length },
    { key: 'rapprochement', label: 'À rattacher', n: orphelins.length },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-500" />
            Audits hygiène & DUERP
          </h1>
          <p className="text-surface-500 mt-1 text-sm">
            Données remontées d&apos;AuditHygiène Pro
            {derniereSync?.termine_at && ` · dernière synchro le ${formatDate(derniereSync.termine_at)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={OUTIL_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>Ouvrir l&apos;outil</Button>
          </a>
          {peutSynchroniser && (
            <Button onClick={handleSync} isLoading={sync} icon={<RefreshCw className="h-4 w-4" />}>Synchroniser</Button>
          )}
        </div>
      </div>

      {tableManquante && (
        <div className="card p-4 mb-5 border-warning-200 bg-warning-50/50 flex items-start gap-3">
          <Database className="h-4 w-4 text-warning-600 mt-0.5 shrink-0" />
          <div className="text-sm text-surface-700">
            <span className="font-medium">Tables absentes.</span> Appliquez la migration
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white border border-warning-200 text-xs">114_audithygiene_sync.sql</code>
            dans Supabase, puis lancez la synchronisation.
          </div>
        </div>
      )}

      {derniereSync && derniereSync.succes === false && (
        <div className="card p-4 mb-5 border-danger-200 bg-danger-50/50 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-danger-600 mt-0.5 shrink-0" />
          <div className="text-sm text-surface-700">
            <span className="font-medium">Dernière synchronisation en échec.</span> {derniereSync.erreur}
          </div>
        </div>
      )}

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Audits', valeur: stats.audits, icone: <ClipboardCheck className="h-4 w-4" /> },
          { label: 'DUERP', valeur: stats.duerps, icone: <FileWarning className="h-4 w-4" /> },
          { label: 'Score moyen', valeur: stats.moyenne ? `${stats.moyenne}%` : '—', icone: null },
          { label: 'Insuffisants', valeur: stats.nonConformes, icone: null, alerte: stats.nonConformes > 0 },
          { label: 'Rattachés', valeur: `${stats.rattaches}/${etablissements.length}`, icone: <Link2 className="h-4 w-4" /> },
          { label: 'Prospects réseau', valeur: stats.prospectsReseau, icone: <Building2 className="h-4 w-4" /> },
          { label: 'Actions en retard', valeur: stats.actionsEnRetard, icone: null, alerte: stats.actionsEnRetard > 0 },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-surface-500 mb-1">
              {s.icone}{s.label}
            </div>
            <div className={cn('text-xl font-heading font-bold', s.alerte ? 'text-danger-600' : 'text-surface-900')}>
              {s.valeur}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 bg-surface-100 rounded-lg p-0.5 w-fit">
          {ONGLETS.map((o) => (
            <button key={o.key} onClick={() => setOnglet(o.key)}
              className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors',
                onglet === o.key ? 'bg-white shadow-xs text-surface-900' : 'text-surface-500 hover:text-surface-700')}>
              {o.label}{typeof o.n === 'number' ? ` (${o.n})` : ''}
            </button>
          ))}
        </div>
        {onglet !== 'rapprochement' && (
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Établissement, client, n° de rapport…"
              className="input-base pl-9 w-full" />
          </div>
        )}
      </div>

      {/* ── Audits hygiène ── */}
      {onglet === 'audits' && (
        <div className="space-y-2">
          {filtrer(audits).length === 0 && <VideMessage tableManquante={tableManquante} quoi="audit" />}
          {filtrer(audits).map((a) => (
            <div key={a.id} className="card p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-heading font-bold shrink-0"
                style={{ backgroundColor: `${scoreCouleur(Number(a.score_global) || 0)}1a`, color: scoreCouleur(Number(a.score_global) || 0) }}>
                {a.score_global ?? '—'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-heading font-semibold text-surface-900 truncate">
                  {a._etab?.nom || 'Établissement inconnu'}
                </div>
                <div className="text-xs text-surface-500 truncate">
                  {a.date_audit ? formatDate(a.date_audit) : '—'}
                  {a.type_audit ? ` · ${a.type_audit}` : ''}
                  {a.formateur_nom ? ` · ${a.formateur_nom}` : ''}
                  {a.num_rapport ? ` · ${a.num_rapport}` : ''}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-surface-500">
                <span className="text-success-600">{a.nb_conformes ?? 0} C</span>
                <span className="text-warning-600">{a.nb_partiels ?? 0} P</span>
                <span className="text-danger-600">{a.nb_non_conformes ?? 0} NC</span>
              </div>
              {a.mention && <Badge variant={MENTION_VARIANT[a.mention] || 'default'}>{a.mention}</Badge>}
              {a._client ? (
                <Link href={`/dashboard/clients/${a._client.id}`} className="text-xs text-brand-600 hover:underline shrink-0 hidden sm:block">
                  {a._client.raison_sociale}
                </Link>
              ) : a._franchise ? (
                <span className="text-xs text-brand-600 shrink-0 hidden sm:block">Réseau {a._franchise.nom}</span>
              ) : (
                <span className="text-xs text-surface-400 shrink-0 hidden sm:block">Non rattaché</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── DUERP ── */}
      {onglet === 'duerp' && (
        <div className="space-y-2">
          {filtrer(duerps).length === 0 && <VideMessage tableManquante={tableManquante} quoi="DUERP" />}
          {filtrer(duerps).map((d) => (
            <div key={d.id} className="card p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                <FileWarning className="h-5 w-5 text-surface-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-heading font-semibold text-surface-900 truncate">
                  {d._etab?.nom || d.raison_sociale || 'Établissement inconnu'}
                </div>
                <div className="text-xs text-surface-500 truncate">
                  {d.date_evaluation ? formatDate(d.date_evaluation) : '—'}
                  {d.num_document ? ` · ${d.num_document}` : ''}
                  {d.effectif ? ` · ${d.effectif} salariés` : ''}
                  {d.formateur_nom ? ` · ${d.formateur_nom}` : ''}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs text-surface-500">
                <span>{d.nb_unites} unités</span>
                <span>{d.nb_risques} risques</span>
                <span>{d.nb_actions} actions</span>
              </div>
              {d.risques_critiques > 0 && <Badge variant="danger">{d.risques_critiques} critiques</Badge>}
              {d._client ? (
                <Link href={`/dashboard/clients/${d._client.id}`} className="text-xs text-brand-600 hover:underline shrink-0 hidden sm:block">
                  {d._client.raison_sociale}
                </Link>
              ) : (
                <span className="text-xs text-surface-400 shrink-0 hidden sm:block">Non rattaché</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Rapprochement ── */}
      {onglet === 'rapprochement' && (
        <div className="space-y-3">
          {orphelins.length === 0 && (
            <div className="card p-10 text-center">
              <Link2 className="h-10 w-10 text-surface-300 mx-auto mb-3" />
              <div className="text-sm text-surface-500">
                {tableManquante
                  ? 'Appliquez la migration puis lancez une synchronisation.'
                  : 'Tous les établissements audités sont rattachés à un client.'}
              </div>
            </div>
          )}
          {orphelins.map((e) => (
            <div key={e.id} className="card p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-surface-400 shrink-0" />
                    <span className="text-sm font-heading font-semibold text-surface-900 truncate">{e.nom}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 pl-6">
                    {e._franchise && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                        {e._franchise.logo_url && <img src={e._franchise.logo_url} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />}
                        Réseau {e._franchise.nom}
                      </span>
                    )}
                    <span className="text-xs text-surface-500">
                      {[e.ville, e.code_postal, e.siret ? `SIRET ${e.siret}` : null].filter(Boolean).join(' · ') || 'Aucune information de localisation'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={choix[e.id] || ''}
                    onChange={(ev) => setChoix((c) => ({ ...c, [e.id]: ev.target.value }))}
                    className="input-base text-sm min-w-[16rem]"
                  >
                    <option value="">Choisir un client…</option>
                    {e._suggestions.length > 0 && (
                      <optgroup label="Suggestions">
                        {e._suggestions.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.label}{s.ville ? ` — ${s.ville}` : ''} ({s.note} %)</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Tous les clients">
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.raison_sociale || c.nom_commercial}{c.ville ? ` — ${c.ville}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <Button size="sm" onClick={() => handleRattacher(e.id)} isLoading={busy === e.id} icon={<Check className="h-4 w-4" />}>
                    Rattacher
                  </Button>
                  <button
                    onClick={() => handleIgnorer(e.id)}
                    className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
                    title="Cet établissement n'est pas un client"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VideMessage({ tableManquante, quoi }: { tableManquante: boolean; quoi: string }) {
  return (
    <div className="card p-10 text-center">
      <CalendarDays className="h-10 w-10 text-surface-300 mx-auto mb-3" />
      <div className="text-sm text-surface-500">
        {tableManquante ? 'Appliquez la migration 114 puis synchronisez.' : `Aucun ${quoi} pour le moment — lancez une synchronisation.`}
      </div>
    </div>
  )
}
