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

        {/* Contour réaliste de la France métropolitaine */}
        <path
          d="M395,95 L410,88 L435,82 L458,78 L475,85 L498,78 L518,82 L535,92 L555,88 L572,95 L588,108 L598,122 L612,128 L625,138 L638,155 L648,172 L658,192 L665,215 L668,235 L672,258 L678,278 L685,298 L688,318 L690,342 L688,365 L682,388 L672,408 L660,425 L648,442 L632,458 L618,472 L602,488 L588,502 L572,518 L558,535 L548,555 L538,572 L525,588 L512,602 L498,618 L482,632 L465,648 L448,658 L430,665 L412,672 L395,678 L378,682 L358,685 L342,682 L325,675 L308,665 L292,652 L278,638 L265,622 L252,605 L240,588 L228,568 L218,548 L208,528 L198,505 L188,482 L180,458 L175,435 L172,412 L170,388 L168,365 L168,342 L172,318 L178,295 L185,272 L195,252 L208,232 L222,215 L238,198 L255,182 L272,168 L290,155 L308,142 L328,128 L348,115 L368,105 L385,98 Z"
          fill="#e0f2fe"
          stroke="#93c5fd"
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* Corse */}
        <path
          d="M668,595 L672,608 L678,625 L680,645 L678,662 L672,678 L665,688 L658,678 L655,662 L652,645 L655,625 L658,608 L662,598 Z"
          fill="#e0f2fe"
          stroke="#93c5fd"
          strokeWidth="1.5"
          opacity="0.7"
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
