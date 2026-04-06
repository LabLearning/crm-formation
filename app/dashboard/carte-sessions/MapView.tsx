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

        {/* Contour France métropolitaine + Corse (généré depuis GeoJSON) */}
        <path
          d="M667,330L654,341L659,349L648,365L634,379L617,409L613,437L605,448L611,455L619,444L631,434L647,435L648,454L656,463L660,479L649,486L657,500L663,517L666,532L658,542L646,547L645,558L653,574L661,585L656,596L655,611L658,625L669,633L682,641L695,636L695,653L686,664L680,677L675,680L667,693L657,698L651,706L642,715L643,720L634,727L625,734L614,735L612,736L601,733L600,737L593,732L584,727L576,725L570,718L567,711L555,713L550,705L543,708L537,712L513,702L489,700L465,717L446,747L445,776L451,791L446,793L432,797L422,804L409,799L395,801L381,793L375,780L361,776L354,770L340,764L326,760L317,767L306,772L291,768L277,770L267,760L253,760L242,754L229,747L213,740L202,735L201,719L187,716L191,707L200,692L208,651L213,618L219,592L225,589L217,584L215,573L218,532L226,505L216,498L219,481L223,469L216,455L216,440L204,437L186,425L173,401L171,376L161,365L159,354L145,350L148,339L149,331L140,329L141,327L137,327L131,331L124,325L129,326L135,323L135,320L133,320L126,320L122,322L121,321L119,323L114,323L113,333L108,315L112,312L110,308L108,313L102,313L101,309L99,306L99,310L91,304L90,306L80,302L78,299L70,300L66,294L60,297L59,290L56,295L54,298L50,303L41,287L34,284L27,279L38,277L50,274L41,264L34,264L34,258L37,258L51,261L56,262L51,257L48,254L45,254L47,247L40,249L27,254L22,247L23,238L28,232L33,233L37,231L39,227L47,223L54,223L62,220L67,227L73,228L74,220L84,223L88,215L92,209L103,208L107,212L115,206L113,213L117,213L126,223L134,235L142,231L153,224L158,226L163,232L169,226L174,237L175,232L174,222L181,223L204,226L199,219L197,203L197,189L194,173L190,163L179,145L176,127L189,131L201,129L215,137L217,159L244,161L279,164L293,151L293,127L320,113L350,99L372,83L366,65L366,40L367,21L391,9L403,5L422,16L429,29L440,33L455,35L458,50L471,54L480,65L484,69L498,68L509,76L508,92L509,105L527,104L541,87L542,97L543,113L554,122L568,131L576,145L589,143L600,147L611,150L622,149L635,156L642,169L652,172L664,179L679,179L694,187L710,188L723,195L704,228L691,273L688,316L686,332L673,337Z M789,849L790,860L788,868L784,870L787,873L783,880L781,886L782,889L777,893L773,890L771,885L767,883L761,881L757,876L756,871L761,866L756,863L751,860L752,854L755,850L754,843L747,844L749,838L753,832L749,825L744,821L745,816L746,813L750,809L747,805L743,803L746,799L750,795L751,788L753,783L757,781L762,778L769,776L773,769L781,770L785,770L785,758L787,749L790,743L793,751L794,761L792,773L797,794L798,817L790,841Z"
          fill="#dbeafe"
          stroke="#93c5fd"
          strokeWidth="1.5"
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
