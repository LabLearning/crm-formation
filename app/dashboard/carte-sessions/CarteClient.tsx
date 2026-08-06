'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Users, GraduationCap, List, Map as MapIcon, Search, AlertTriangle } from 'lucide-react'
import { Badge, Input } from '@/components/ui'
import { formatDate, companyLabel } from '@/lib/utils'
import { localiserSession, temporalite, TEMPO_META, couleurFranchise, type Temporalite } from '@/lib/geo-france'
import dynamic from 'next/dynamic'
import type { SessionPin } from './types'

// Leaflet manipule le DOM : jamais de rendu côté serveur.
const FranchisesMap = dynamic(() => import('./FranchisesMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-surface-200 bg-surface-50 flex items-center justify-center text-sm text-surface-400" style={{ height: 600 }}>
      Chargement de la carte…
    </div>
  ),
})

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-surface-200 bg-surface-50 flex items-center justify-center text-sm text-surface-400" style={{ height: 600 }}>
      Chargement de la carte…
    </div>
  ),
})

type Filtre = 'tous' | Temporalite

export function CarteClient({ sessions, franchises = [], etablissements = [] }: {
  sessions: any[]; franchises?: any[]; etablissements?: any[]
}) {
  const [onglet, setOnglet] = useState<'sessions' | 'franchises'>('sessions')
  const [vue, setVue] = useState<'carte' | 'liste'>('carte')
  const [franchiseSel, setFranchiseSel] = useState<string | 'toutes'>('toutes')
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [q, setQ] = useState('')

  // Temporalité + localisation calculées une fois
  const enrichies = useMemo(() => sessions.map((s) => ({
    ...s,
    _tempo: temporalite(s.date_debut, s.date_fin),
    _pos: localiserSession(s),
  })), [sessions])

  const compte = useMemo(() => ({
    tous: enrichies.length,
    en_cours: enrichies.filter((s) => s._tempo === 'en_cours').length,
    a_venir: enrichies.filter((s) => s._tempo === 'a_venir').length,
    passee: enrichies.filter((s) => s._tempo === 'passee').length,
  }), [enrichies])

  const filtrees = useMemo(() => {
    const t = q.trim().toLowerCase()
    return enrichies.filter((s) => {
      if (filtre !== 'tous' && s._tempo !== filtre) return false
      if (!t) return true
      const hay = [s.formation?.intitule, s.intitule, s.reference, s.ville, s.lieu,
        companyLabel(s.client), s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : '']
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(t)
    })
  }, [enrichies, filtre, q])

  const pins: SessionPin[] = useMemo(() =>
    filtrees.filter((s) => s._pos).map((s) => ({
      id: s.id, lat: s._pos!.lat, lng: s._pos!.lng, precise: s._pos!.precise,
      tempo: s._tempo, session: s,
    })), [filtrees])

  const nonLocalisees = filtrees.length - pins.length

  // ── Franchises : couleur stable par enseigne + établissements localisés ──
  const franchisesMeta = useMemo(() => franchises.map((f, i) => ({
    ...f, couleur: couleurFranchise(i),
    etabs: etablissements.filter((e) => e.franchise_id === f.id),
  })), [franchises, etablissements])

  const etabPins = useMemo(() => {
    const out: any[] = []
    for (const f of franchisesMeta) {
      if (franchiseSel !== 'toutes' && f.id !== franchiseSel) continue
      for (const e of f.etabs) {
        const pos = localiserSession(e)
        if (!pos) continue
        out.push({
          id: e.id, lat: pos.lat, lng: pos.lng, precise: pos.precise,
          franchiseId: f.id, franchiseNom: f.nom || f.raison_sociale || 'Enseigne',
          logo: f.logo_url || null, couleur: f.couleur, etab: e,
        })
      }
    }
    return out
  }, [franchisesMeta, franchiseSel])

  const ONGLETS: { key: Filtre; label: string; color?: string }[] = [
    { key: 'tous', label: 'Toutes' },
    { key: 'en_cours', label: 'En cours', color: TEMPO_META.en_cours.color },
    { key: 'a_venir', label: 'À venir', color: TEMPO_META.a_venir.color },
    { key: 'passee', label: 'Passées', color: TEMPO_META.passee.color },
  ]

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading flex items-center gap-2">
            <MapPin className="h-6 w-6 text-brand-500" /> Carte {onglet === 'sessions' ? 'des sessions' : 'des franchises'}
          </h1>
          <p className="text-surface-500 mt-1 text-sm">
            {onglet === 'sessions'
              ? `${pins.length} session${pins.length > 1 ? 's' : ''} localisée${pins.length > 1 ? 's' : ''} sur ${filtrees.length}`
              : `${etabPins.length} établissement${etabPins.length > 1 ? 's' : ''} · ${franchisesMeta.length} enseigne${franchisesMeta.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-56"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" /></div>
          <div className="flex rounded-xl bg-surface-100 p-1">
            {([['carte', MapIcon, 'Carte'], ['liste', List, 'Liste']] as const).map(([v, Icon, lbl]) => (
              <button key={v} onClick={() => setVue(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${vue === v ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
                <Icon className="h-4 w-4" /> {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bascule Sessions / Franchises */}
      <div className="flex gap-1 mb-4 border-b border-surface-200">
        {([['sessions', 'Sessions'], ['franchises', 'Franchises']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setOnglet(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              onglet === k ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {onglet === 'franchises' ? (
        <>
          {/* Pastilles par enseigne, avec logo */}
          <div className="flex flex-wrap gap-2 mb-5">
            <button onClick={() => setFranchiseSel('toutes')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                franchiseSel === 'toutes' ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300'
              }`}>
              Toutes
              <span className={`tabular-nums text-xs ${franchiseSel === 'toutes' ? 'text-white/70' : 'text-surface-400'}`}>{etablissements.length}</span>
            </button>
            {franchisesMeta.map((f) => {
              const on = franchiseSel === f.id
              return (
                <button key={f.id} onClick={() => setFranchiseSel(on ? 'toutes' : f.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    on ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300'
                  }`}>
                  {f.logo_url
                    ? <img src={f.logo_url} alt="" className="h-5 w-5 rounded-full object-contain bg-white ring-1 ring-surface-200" />
                    : <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.couleur }} />}
                  {f.nom || f.raison_sociale}
                  <span className={`tabular-nums text-xs ${on ? 'text-white/70' : 'text-surface-400'}`}>{f.etabs.length}</span>
                </button>
              )
            })}
          </div>

          {vue === 'carte' ? (
            <FranchisesMap pins={etabPins} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {franchisesMeta.filter((f) => franchiseSel === 'toutes' || f.id === franchiseSel).map((f) => (
                <div key={f.id} className="card p-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-surface-100">
                    {f.logo_url
                      ? <img src={f.logo_url} alt="" className="h-10 w-10 rounded-xl object-contain bg-white ring-1 ring-surface-200 p-1" />
                      : <span className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: f.couleur }}>
                          {(f.nom || '?').slice(0, 2).toUpperCase()}
                        </span>}
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/franchises/${f.id}`} className="font-heading font-semibold text-surface-900 hover:text-brand-600 hover:underline truncate block">
                        {f.nom || f.raison_sociale}
                      </Link>
                      <div className="text-xs text-surface-500">{f.etabs.length} établissement{f.etabs.length > 1 ? 's' : ''}{f.secteur ? ` · ${f.secteur}` : ''}</div>
                    </div>
                  </div>
                  <div className="mt-2 max-h-56 overflow-y-auto divide-y divide-surface-50">
                    {f.etabs.length === 0 ? (
                      <div className="text-xs text-surface-400 py-2">Aucun établissement rattaché</div>
                    ) : f.etabs.map((e: any) => (
                      <Link key={e.id} href={`/dashboard/clients/${e.id}`} className="flex items-center gap-2 py-2 text-sm hover:bg-surface-50/60 rounded-lg px-1">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: f.couleur }} />
                        <span className="truncate text-surface-800">{e.nom_commercial || e.raison_sociale}</span>
                        {e.ville && <span className="ml-auto text-xs text-surface-400 shrink-0">{e.ville}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
      <>
      {/* Filtres temporels — pastilles de couleur */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ONGLETS.map((o) => {
          const on = filtre === o.key
          const n = compte[o.key === 'tous' ? 'tous' : o.key]
          return (
            <button key={o.key} onClick={() => setFiltre(o.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors border ${
                on ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300'
              }`}>
              {o.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} />}
              {o.label}
              <span className={`tabular-nums text-xs ${on ? 'text-white/70' : 'text-surface-400'}`}>{n}</span>
            </button>
          )
        })}
      </div>

      {vue === 'carte' ? (
        <>
          <LeafletMap pins={pins} />
          {nonLocalisees > 0 && (
            <div className="mt-3 flex items-start gap-2 text-xs text-surface-500 bg-surface-50 rounded-xl px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-warning-500 shrink-0 mt-0.5" />
              <span>
                {nonLocalisees} session{nonLocalisees > 1 ? 's' : ''} sans lieu exploitable ne {nonLocalisees > 1 ? 'sont' : 'est'} pas affichée{nonLocalisees > 1 ? 's' : ''}.
                Renseignez la ville et le code postal de la session pour la localiser.
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="card overflow-hidden">
          {filtrees.length === 0 ? (
            <div className="p-10 text-center text-sm text-surface-500">Aucune session pour ce filtre.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filtrees.slice(0, 300).map((s) => {
                const meta = TEMPO_META[s._tempo as Temporalite]
                return (
                  <Link key={s.id} href={`/dashboard/sessions/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50/60">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">{s.formation?.intitule || s.intitule}</div>
                      <div className="text-xs text-surface-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                          {formatDate(s.date_debut, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {companyLabel(s.client) && <span className="truncate">{companyLabel(s.client)}</span>}
                        {(s.ville || s.lieu) && (
                          <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{s.ville || s.lieu}</span>
                        )}
                        {s.formateur && (
                          <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />{s.formateur.prenom} {s.formateur.nom}</span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-2xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>{meta.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  )
}
