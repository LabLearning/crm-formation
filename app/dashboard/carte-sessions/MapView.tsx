'use client'

import { useState, useMemo } from 'react'
import { MapPin, Calendar, Users, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { TEMPO_META, type Temporalite } from '@/lib/geo-france'

export interface SessionPin {
  id: string
  lat: number
  lng: number
  precise: boolean
  tempo: Temporalite
  session: any
}

// Cadre France métropolitaine → repère de la carte SVG
const MAP_W = 800
const MAP_H = 880
const FRANCE = { minLat: 41.3, maxLat: 51.1, minLng: -5.2, maxLng: 9.6 }

function toXY(lat: number, lng: number) {
  return {
    x: ((lng - FRANCE.minLng) / (FRANCE.maxLng - FRANCE.minLng)) * MAP_W,
    y: MAP_H - ((lat - FRANCE.minLat) / (FRANCE.maxLat - FRANCE.minLat)) * MAP_H,
  }
}

const FRANCE_PATH = "M667,330L654,341L659,349L648,365L634,379L617,409L613,437L605,448L611,455L619,444L631,434L647,435L648,454L656,463L660,479L649,486L657,500L663,517L666,532L658,542L646,547L645,558L653,574L661,585L656,596L655,611L658,625L669,633L682,641L695,636L695,653L686,664L680,677L675,680L667,693L657,698L651,706L642,715L643,720L634,727L625,734L614,735L612,736L601,733L600,737L593,732L584,727L576,725L570,718L567,711L555,713L550,705L543,708L537,712L513,702L489,700L465,717L446,747L445,776L451,791L446,793L432,797L422,804L409,799L395,801L381,793L375,780L361,776L354,770L340,764L326,760L317,767L306,772L291,768L277,770L267,760L253,760L242,754L229,747L213,740L202,735L201,719L187,716L191,707L200,692L208,651L213,618L219,592L225,589L217,584L215,573L218,532L226,505L216,498L219,481L223,469L216,455L216,440L204,437L186,425L173,401L171,376L161,365L159,354L145,350L148,339L149,331L140,329L141,327L137,327L131,331L124,325L129,326L135,323L135,320L133,320L126,320L122,322L121,321L119,323L114,323L113,333L108,315L112,312L110,308L108,313L102,313L101,309L99,306L99,310L91,304L90,306L80,302L78,299L70,300L66,294L60,297L59,290L56,295L54,298L50,303L41,287L34,284L27,279L38,277L50,274L41,264L34,264L34,258L37,258L51,261L56,262L51,257L48,254L45,254L47,247L40,249L27,254L22,247L23,238L28,232L33,233L37,231L39,227L47,223L54,223L62,220L67,227L73,228L74,220L84,223L88,215L92,209L103,208L107,212L115,206L113,213L117,213L126,223L134,235L142,231L153,224L158,226L163,232L169,226L174,237L175,232L174,222L181,223L204,226L199,219L197,203L197,189L194,173L190,163L179,145L176,127L189,131L201,129L215,137L217,159L244,161L279,164L293,151L293,127L320,113L350,99L372,83L366,65L366,40L367,21L391,9L403,5L422,16L429,29L440,33L455,35L458,50L471,54L480,65L484,69L498,68L509,76L508,92L509,105L527,104L541,87L542,97L543,113L554,122L568,131L576,145L589,143L600,147L611,150L622,149L635,156L642,169L652,172L664,179L679,179L694,187L710,188L723,195L704,228L691,273L688,316L686,332L673,337Z M789,849L790,860L788,868L784,870L787,873L783,880L781,886L782,889L777,893L773,890L771,885L767,883L761,881L757,876L756,871L761,866L756,863L751,860L752,854L755,850L754,843L747,844L749,838L753,832L749,825L744,821L745,816L746,813L750,809L747,805L743,803L746,799L750,795L751,788L753,783L757,781L762,778L769,776L773,769L781,770L785,770L785,758L787,749L790,743L793,751L794,761L792,773L797,794L798,817L790,841Z"

export default function MapView({ pins }: { pins: SessionPin[] }) {
  const [active, setActive] = useState<string | null>(null)

  // Regroupe les sessions au même point : sinon les pastilles se superposent
  const groupes = useMemo(() => {
    const m = new Map<string, SessionPin[]>()
    for (const p of pins) {
      const k = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(p)
    }
    return [...m.entries()].map(([k, list]) => ({ key: k, list, ...toXY(list[0].lat, list[0].lng) }))
  }, [pins])

  const actif = groupes.find((g) => g.key === active)

  return (
    <div className="relative rounded-2xl overflow-hidden border border-surface-200 bg-white" style={{ height: 560 }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect width={MAP_W} height={MAP_H} fill="#fafaf9" />
        <path d={FRANCE_PATH} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />

        {groupes.map((g) => {
          // La couleur reflète la session la plus « chaude » du groupe
          const ordre: Temporalite[] = ['en_cours', 'a_venir', 'passee']
          const tempo = ordre.find((t) => g.list.some((p) => p.tempo === t)) || 'passee'
          const meta = TEMPO_META[tempo]
          const n = g.list.length
          const r = n > 1 ? Math.min(9 + Math.log2(n) * 3.5, 22) : 7
          const on = active === g.key
          return (
            <g key={g.key} transform={`translate(${g.x},${g.y})`} className="cursor-pointer"
              onClick={() => setActive(on ? null : g.key)}>
              {tempo === 'en_cours' && (
                <circle r={r + 6} fill={meta.color} opacity="0.18">
                  <animate attributeName="r" values={`${r + 3};${r + 11};${r + 3}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={r} fill={meta.color} stroke="#fff" strokeWidth={on ? 3 : 2} opacity={on ? 1 : 0.9} />
              {n > 1 && (
                <text textAnchor="middle" dy="3.5" fontSize={r > 14 ? 11 : 9} fill="#fff" fontWeight="700">{n}</text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Légende */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-white/95 backdrop-blur rounded-xl border border-surface-200 px-3 py-2.5 shadow-sm">
        {(['en_cours', 'a_venir', 'passee'] as Temporalite[]).map((t) => (
          <div key={t} className="flex items-center gap-2 text-xs text-surface-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TEMPO_META[t].color }} />
            {TEMPO_META[t].label}
            <span className="text-surface-400 tabular-nums">({pins.filter((p) => p.tempo === t).length})</span>
          </div>
        ))}
      </div>

      {/* Détail du point sélectionné */}
      {actif && (
        <div className="absolute top-3 right-3 w-80 max-h-[480px] overflow-y-auto bg-white rounded-xl border border-surface-200 shadow-lg">
          <div className="px-4 py-2.5 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white">
            <span className="text-xs font-semibold text-surface-700">
              {actif.list.length} session{actif.list.length > 1 ? 's' : ''}
              {actif.list[0].session.ville ? ` · ${actif.list[0].session.ville}` : ''}
            </span>
            <button onClick={() => setActive(null)} className="text-surface-400 hover:text-surface-700 text-lg leading-none">×</button>
          </div>
          <div className="divide-y divide-surface-100">
            {actif.list.slice(0, 25).map((p) => {
              const s = p.session
              const meta = TEMPO_META[p.tempo]
              return (
                <Link key={p.id} href={`/dashboard/sessions/${s.id}`} className="block px-4 py-2.5 hover:bg-surface-50">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: meta.color }} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-surface-900 truncate">{s.formation?.intitule || s.intitule}</div>
                      <div className="text-xs text-surface-500 flex flex-wrap items-center gap-x-2 mt-0.5">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                          {new Date(s.date_debut).toLocaleDateString('fr-FR')}
                        </span>
                        {s.client && <span className="truncate">{s.client.nom_commercial || s.client.raison_sociale}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
