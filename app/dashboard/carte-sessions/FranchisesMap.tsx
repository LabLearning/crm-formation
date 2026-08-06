'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

export interface EtabPin {
  id: string
  lat: number
  lng: number
  precise: boolean
  franchiseId: string
  franchiseNom: string
  logo: string | null
  couleur: string
  etab: any
}

const FRANCE_CENTER: [number, number] = [46.6, 2.4]
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

/** Marqueur = pastille blanche portant le logo de l'enseigne. */
function icone(p: EtabPin) {
  const initiales = p.franchiseNom.split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase()
  const inner = p.logo
    ? `<img src="${esc(p.logo)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ll-fr-ini',textContent:'${esc(initiales)}'}))" />`
    : `<span class="ll-fr-ini">${esc(initiales)}</span>`
  return L.divIcon({
    className: 'll-fr-wrap',
    html: `<span class="ll-fr-pin" style="--c:${p.couleur}">${inner}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  })
}

function popupHtml(p: EtabPin) {
  const e = p.etab
  const nom = e.nom_commercial || e.raison_sociale || 'Établissement'
  return `
    <div class="ll-pop">
      <span class="ll-pop-tag" style="background:${p.couleur}1a;color:${p.couleur}">${esc(p.franchiseNom)}</span>
      <a class="ll-pop-title" href="/dashboard/clients/${e.id}">${esc(nom)}</a>
      ${e.ville ? `<div class="ll-pop-line">${esc(e.ville)}${e.code_postal ? ` (${esc(e.code_postal)})` : ''}</div>` : ''}
      ${e.adresse ? `<div class="ll-pop-line">${esc(e.adresse)}</div>` : ''}
      ${typeof e._sessions === 'number' ? `<div class="ll-pop-line">${e._sessions} session${e._sessions > 1 ? 's' : ''} réalisée${e._sessions > 1 ? 's' : ''}</div>` : ''}
      ${!p.precise ? '<div class="ll-pop-approx">Position approximative (département)</div>' : ''}
    </div>`
}

export default function FranchisesMap({ pins }: { pins: EtabPin[] }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const cluster = useRef<any>(null)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { center: FRANCE_CENTER, zoom: 6, scrollWheelZoom: true })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
    }).addTo(m)
    map.current = m
    return () => { m.remove(); map.current = null; cluster.current = null }
  }, [])

  const signature = useMemo(() => pins.map((p) => `${p.id}:${p.franchiseId}`).join('|'), [pins])

  useEffect(() => {
    const m = map.current
    if (!m) return
    if (cluster.current) { m.removeLayer(cluster.current); cluster.current = null }
    if (pins.length === 0) return

    const group = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 42,
      iconCreateFunction: (c: any) => {
        const enfants: EtabPin[] = c.getAllChildMarkers().map((mk: any) => mk.options.__pin)
        // Enseigne majoritaire du groupe → couleur et logo du cluster
        const parEnseigne = new Map<string, { n: number; p: EtabPin }>()
        for (const p of enfants) {
          const cur = parEnseigne.get(p.franchiseId)
          if (cur) cur.n++
          else parEnseigne.set(p.franchiseId, { n: 1, p })
        }
        const domin = [...parEnseigne.values()].sort((a, b) => b.n - a.n)[0]
        const mixte = parEnseigne.size > 1
        const n = c.getChildCount()
        const size = n > 99 ? 48 : n > 9 ? 42 : 36
        const fond = mixte
          ? `<span class="ll-fr-ini">${n}</span>`
          : (domin.p.logo ? `<img src="${esc(domin.p.logo)}" alt="" />` : `<span class="ll-fr-ini">${n}</span>`)
        return L.divIcon({
          className: 'll-fr-wrap',
          html: `<span class="ll-fr-cluster" style="--c:${domin.p.couleur};width:${size}px;height:${size}px">${fond}<b class="ll-fr-count">${n}</b></span>`,
          iconSize: [size, size],
        })
      },
    })

    for (const p of pins) {
      const mk = L.marker([p.lat, p.lng], { icon: icone(p), __pin: p } as any)
      mk.bindPopup(popupHtml(p), { closeButton: true, className: 'll-pop-wrap', maxWidth: 280 })
      group.addLayer(mk)
    }
    group.addTo(m)
    cluster.current = group
    const b = group.getBounds()
    if (b.isValid()) m.fitBounds(b, { padding: [40, 40], maxZoom: 11 })
  }, [signature, pins])

  return <div ref={el} className="rounded-2xl overflow-hidden border border-surface-200" style={{ height: 600, zIndex: 0 }} />
}
