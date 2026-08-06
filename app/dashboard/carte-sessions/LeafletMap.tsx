'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { TEMPO_META, type Temporalite } from '@/lib/geo-france'
import type { SessionPin } from './types'

const FRANCE_CENTER: [number, number] = [46.6, 2.4]

/** Pastille colorée selon la temporalité ; la session en cours pulse. */
function icone(tempo: Temporalite) {
  const c = TEMPO_META[tempo].color
  const pulse = tempo === 'en_cours'
  return L.divIcon({
    className: 'll-pin',
    html: `<span class="ll-pin-dot${pulse ? ' ll-pin-pulse' : ''}" style="--c:${c}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

function popupHtml(p: SessionPin) {
  const s = p.session
  const meta = TEMPO_META[p.tempo]
  const client = s.client?.nom_commercial || s.client?.raison_sociale || ''
  const dates = `${new Date(s.date_debut).toLocaleDateString('fr-FR')}${s.date_fin && s.date_fin !== s.date_debut ? ` → ${new Date(s.date_fin).toLocaleDateString('fr-FR')}` : ''}`
  return `
    <div class="ll-pop">
      <span class="ll-pop-tag" style="background:${meta.color}1a;color:${meta.color}">${meta.label}</span>
      <a class="ll-pop-title" href="/dashboard/sessions/${s.id}">${esc(s.formation?.intitule || s.intitule || 'Session')}</a>
      ${client ? `<div class="ll-pop-line">${esc(client)}</div>` : ''}
      <div class="ll-pop-line">${dates}</div>
      ${s.ville ? `<div class="ll-pop-line">${esc(s.ville)}${s.code_postal ? ` (${esc(s.code_postal)})` : ''}</div>` : ''}
      ${s.formateur ? `<div class="ll-pop-line">${esc(s.formateur.prenom)} ${esc(s.formateur.nom)}</div>` : ''}
      ${!p.precise ? '<div class="ll-pop-approx">Position approximative (département)</div>' : ''}
    </div>`
}

export default function LeafletMap({ pins }: { pins: SessionPin[] }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const cluster = useRef<any>(null)

  // Init une seule fois
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { center: FRANCE_CENTER, zoom: 6, scrollWheelZoom: true, zoomControl: true })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(m)
    map.current = m
    return () => { m.remove(); map.current = null; cluster.current = null }
  }, [])

  const signature = useMemo(() => pins.map((p) => `${p.id}:${p.tempo}`).join('|'), [pins])

  // (Re)pose les marqueurs à chaque changement de filtre
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (cluster.current) { m.removeLayer(cluster.current); cluster.current = null }
    if (pins.length === 0) return

    const group = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      iconCreateFunction: (c: any) => {
        const enfants: SessionPin[] = c.getAllChildMarkers().map((mk: any) => mk.options.__pin)
        const ordre: Temporalite[] = ['en_cours', 'a_venir', 'passee']
        const tempo = ordre.find((t) => enfants.some((p) => p?.tempo === t)) || 'passee'
        const n = c.getChildCount()
        const size = n > 99 ? 46 : n > 9 ? 40 : 34
        return L.divIcon({
          html: `<span class="ll-cluster" style="--c:${TEMPO_META[tempo].color};width:${size}px;height:${size}px">${n}</span>`,
          className: 'll-cluster-wrap',
          iconSize: [size, size],
        })
      },
    })

    for (const p of pins) {
      const mk = L.marker([p.lat, p.lng], { icon: icone(p.tempo), __pin: p } as any)
      mk.bindPopup(popupHtml(p), { closeButton: true, className: 'll-pop-wrap', maxWidth: 280 })
      group.addLayer(mk)
    }
    group.addTo(m)
    cluster.current = group

    const b = group.getBounds()
    if (b.isValid()) m.fitBounds(b, { padding: [40, 40], maxZoom: 11 })
  }, [signature, pins])

  return (
    <div className="relative">
      <div ref={el} className="rounded-2xl overflow-hidden border border-surface-200" style={{ height: 600, zIndex: 0 }} />
      <div className="absolute bottom-3 left-3 z-[500] flex flex-col gap-1.5 bg-white/95 backdrop-blur rounded-xl border border-surface-200 px-3 py-2.5 shadow-sm">
        {(['en_cours', 'a_venir', 'passee'] as Temporalite[]).map((t) => (
          <div key={t} className="flex items-center gap-2 text-xs text-surface-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEMPO_META[t].color }} />
            {TEMPO_META[t].label}
            <span className="text-surface-400 tabular-nums">({pins.filter((p) => p.tempo === t).length})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
