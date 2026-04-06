'use client'

import { useState } from 'react'
import { MapPin, Calendar, Users, GraduationCap } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { SessionPin } from './CarteClient'

const STATUS_COLORS: Record<string, string> = {
  planifiee: '#6366f1',
  confirmee: '#2563eb',
  en_cours: '#16a34a',
  terminee: '#71717a',
}

// France bounding box en coords (lat/lng) → position relative sur la carte SVG
const FRANCE = { minLat: 41.3, maxLat: 51.1, minLng: -5.2, maxLng: 9.6 }
const MAP_W = 800
const MAP_H = 900

function toXY(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - FRANCE.minLng) / (FRANCE.maxLng - FRANCE.minLng)) * MAP_W
  const y = MAP_H - ((lat - FRANCE.minLat) / (FRANCE.maxLat - FRANCE.minLat)) * MAP_H
  return { x, y }
}

export default function MapView({ pins }: { pins: SessionPin[] }) {
  const [activePin, setActivePin] = useState<string | null>(null)

  return (
    <div className="relative bg-surface-50 rounded-2xl overflow-hidden" style={{ height: 500 }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Fond carte France simplifié */}
        <defs>
          <radialGradient id="bg-grad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </radialGradient>
        </defs>
        <rect width={MAP_W} height={MAP_H} fill="url(#bg-grad)" rx="16" />

        {/* Contour simplifié de la France */}
        <path
          d="M340,80 L420,60 L480,80 L540,90 L600,100 L650,130 L680,180 L700,250 L720,320 L700,400 L680,450 L650,500 L620,560 L580,620 L520,680 L460,720 L400,760 L340,780 L280,760 L220,720 L180,680 L140,620 L120,560 L100,480 L110,400 L130,320 L160,260 L200,200 L240,150 L290,100 Z"
          fill="#e0f2fe"
          stroke="#bae6fd"
          strokeWidth="2"
          opacity="0.6"
        />

        {/* Grille subtile */}
        {[200, 400, 600].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2={MAP_W} y2={y} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}
        {[200, 400, 600].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2={MAP_H} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}

        {/* Pins */}
        {pins.map(pin => {
          const { x, y } = toXY(pin.lat, pin.lng)
          const color = STATUS_COLORS[pin.session.status] || STATUS_COLORS.planifiee
          const isActive = activePin === pin.id
          return (
            <g
              key={pin.id}
              transform={`translate(${x},${y})`}
              onClick={() => setActivePin(isActive ? null : pin.id)}
              className="cursor-pointer"
            >
              {/* Halo */}
              <circle r={isActive ? 20 : 12} fill={color} opacity={isActive ? 0.15 : 0.1} />
              {/* Point */}
              <circle r={isActive ? 8 : 6} fill={color} stroke="white" strokeWidth="2" />
              {/* Label ville */}
              <text x="12" y="4" fontSize="11" fontWeight="600" fill="#3f3f46" fontFamily="system-ui">
                {pin.session.lieu}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Popup pour le pin actif */}
      {activePin && (() => {
        const pin = pins.find(p => p.id === activePin)
        if (!pin) return null
        const color = STATUS_COLORS[pin.session.status] || STATUS_COLORS.planifiee
        return (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-xl border border-surface-200 shadow-elevated p-4 z-10">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
                <GraduationCap className="h-5 w-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-surface-900 truncate">
                  {pin.session.formation?.intitule || pin.session.reference}
                </div>
                <div className="text-xs text-surface-500 space-y-0.5 mt-1">
                  {pin.session.lieu && (
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{pin.session.lieu}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatDate(pin.session.date_debut, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {pin.session.formateur && (
                    <div className="flex items-center gap-1"><Users className="h-3 w-3 shrink-0" />{pin.session.formateur.prenom} {pin.session.formateur.nom}</div>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: color }}>
                    {pin.session.status === 'en_cours' ? 'En cours' : pin.session.status === 'confirmee' ? 'Confirmée' : pin.session.status === 'terminee' ? 'Terminée' : 'Planifiée'}
                  </span>
                </div>
              </div>
              <button onClick={() => setActivePin(null)} className="text-surface-400 hover:text-surface-600 text-lg leading-none">&times;</button>
            </div>
          </div>
        )
      })()}

      {/* Légende */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-surface-200/60">
        <div className="flex items-center gap-3 text-[10px] text-surface-500">
          {Object.entries({ planifiee: 'Planifiée', confirmee: 'Confirmée', en_cours: 'En cours', terminee: 'Terminée' }).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[k] }} />
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
