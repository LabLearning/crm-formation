'use client'

import { useState, useMemo } from 'react'
import { MapPin, Calendar, Users, GraduationCap, List, Map as MapIcon, Clock } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import dynamic from 'next/dynamic'

// Chargement dynamique de la carte (SSR désactivé — Leaflet a besoin de window)
const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => (
  <div className="h-[500px] rounded-2xl bg-surface-100 flex items-center justify-center">
    <div className="text-sm text-surface-400">Chargement de la carte...</div>
  </div>
)})

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
  planifiee: { label: 'Planifiée', color: '#6366f1', variant: 'info' },
  confirmee: { label: 'Confirmée', color: '#2563eb', variant: 'info' },
  en_cours: { label: 'En cours', color: '#16a34a', variant: 'success' },
  terminee: { label: 'Terminée', color: '#71717a', variant: 'default' },
}

// Géocodage statique des principales villes françaises
const CITIES: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522], 'lyon': [45.7640, 4.8357], 'marseille': [43.2965, 5.3698],
  'toulouse': [43.6047, 1.4442], 'nice': [43.7102, 7.2620], 'nantes': [47.2184, -1.5536],
  'strasbourg': [48.5734, 7.7521], 'montpellier': [43.6108, 3.8767], 'bordeaux': [44.8378, -0.5792],
  'lille': [50.6292, 3.0573], 'rennes': [48.1173, -1.6778], 'reims': [49.2583, 3.5790],
  'saint-etienne': [45.4397, 4.3872], 'le havre': [49.4944, 0.1079], 'toulon': [43.1242, 5.9280],
  'grenoble': [45.1885, 5.7245], 'dijon': [47.3220, 5.0415], 'angers': [47.4784, -0.5632],
  'nimes': [43.8367, 4.3601], 'clermont-ferrand': [45.7772, 3.0870], 'aix-en-provence': [43.5297, 5.4474],
  'brest': [48.3904, -4.4861], 'tours': [47.3941, 0.6848], 'amiens': [49.8941, 2.3025],
  'limoges': [45.8336, 1.2611], 'metz': [49.1193, 6.1757], 'perpignan': [42.6887, 2.8948],
  'besancon': [47.2378, 6.0241], 'orleans': [47.9029, 1.9092], 'rouen': [49.4432, 1.0999],
  'mulhouse': [47.7508, 7.3359], 'caen': [49.1829, -0.3707], 'nancy': [48.6921, 6.1844],
  'avignon': [43.9493, 4.8055], 'poitiers': [46.5802, 0.3404], 'cannes': [43.5528, 7.0174],
  'antibes': [43.5808, 7.1239], 'valence': [44.9334, 4.8924], 'pau': [43.2951, -0.3708],
  'la rochelle': [46.1603, -1.1511], 'calais': [50.9513, 1.8587], 'ajaccio': [41.9192, 8.7386],
  'bayonne': [43.4929, -1.4748], 'chambery': [45.5646, 5.9178], 'troyes': [48.2973, 4.0744],
  'saint-nazaire': [47.2736, -2.2137], 'lorient': [47.7482, -3.3702], 'colmar': [48.0794, 7.3585],
  'niort': [46.3234, -0.4608], 'saint-brieuc': [48.5143, -2.7600], 'quimper': [47.9960, -4.1024],
  'vannes': [47.6586, -2.7599], 'saint-malo': [48.6493, -2.0070], 'saint-priest': [45.6989, 4.9423],
  'villeurbanne': [45.7667, 4.8799], 'argenteuil': [48.9472, 2.2467], 'saint-denis': [48.9362, 2.3574],
  'montreuil': [48.8635, 2.4484], 'creteil': [48.7909, 2.4628], 'vitry-sur-seine': [48.7875, 2.3929],
  'blagnac': [43.6372, 1.3930], 'colomiers': [43.6116, 1.3356], 'muret': [43.4613, 1.3272],
}

function geocode(lieu: string | null): [number, number] | null {
  if (!lieu) return null
  const normalized = lieu.toLowerCase().trim()
  // Correspondance exacte
  if (CITIES[normalized]) return CITIES[normalized]
  // Correspondance partielle (ex: "Lyon 3ème" → "lyon")
  for (const [city, coords] of Object.entries(CITIES)) {
    if (normalized.includes(city) || city.includes(normalized)) return coords
  }
  return null
}

interface Session {
  id: string
  reference: string
  status: string
  date_debut: string
  date_fin: string
  lieu: string | null
  nb_places: number | null
  formation: { intitule: string; duree_heures: number | null; categorie: string | null } | null
  formateur: { prenom: string; nom: string } | null
}

export interface SessionPin {
  id: string
  lat: number
  lng: number
  session: Session
}

interface CarteClientProps {
  sessions: Session[]
}

export function CarteClient({ sessions }: CarteClientProps) {
  const [view, setView] = useState<'carte' | 'liste'>('carte')
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return sessions
    return sessions.filter(s => s.status === filterStatus)
  }, [sessions, filterStatus])

  const pins: SessionPin[] = useMemo(() => {
    return filtered
      .map(s => {
        const coords = geocode(s.lieu)
        if (!coords) return null
        return { id: s.id, lat: coords[0], lng: coords[1], session: s }
      })
      .filter(Boolean) as SessionPin[]
  }, [filtered])

  const withoutCoords = filtered.filter(s => !geocode(s.lieu))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading">Carte des sessions</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {sessions.length} session{sessions.length > 1 ? 's' : ''} — {pins.length} localisée{pins.length > 1 ? 's' : ''} sur la carte
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('carte')}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              view === 'carte' ? 'bg-surface-900 text-white' : 'bg-white text-surface-500 border border-surface-200')}>
            <MapIcon className="h-4 w-4" /> Carte
          </button>
          <button onClick={() => setView('liste')}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              view === 'liste' ? 'bg-surface-900 text-white' : 'bg-white text-surface-500 border border-surface-200')}>
            <List className="h-4 w-4" /> Liste
          </button>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `Toutes (${sessions.length})` },
          { id: 'planifiee', label: 'Planifiées' },
          { id: 'confirmee', label: 'Confirmées' },
          { id: 'en_cours', label: 'En cours' },
          { id: 'terminee', label: 'Terminées' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilterStatus(f.id)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
              filterStatus === f.id ? 'bg-surface-900 text-white shadow-xs' : 'bg-surface-100 text-surface-600')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Vue carte */}
      {view === 'carte' && (
        <div className="card overflow-hidden rounded-2xl">
          <MapView pins={pins} />
        </div>
      )}

      {/* Vue liste */}
      {(view === 'liste' || withoutCoords.length > 0) && (
        <div className="card overflow-hidden">
          {view === 'liste' && (
            <div className="px-4 py-3 border-b border-surface-100">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Toutes les sessions</span>
            </div>
          )}
          {view === 'carte' && withoutCoords.length > 0 && (
            <div className="px-4 py-3 border-b border-surface-100">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Sessions sans localisation ({withoutCoords.length})
              </span>
            </div>
          )}
          <div className="divide-y divide-surface-100">
            {(view === 'liste' ? filtered : withoutCoords).map(s => {
              const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.planifiee
              return (
                <div key={s.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sc.color + '15' }}>
                    <GraduationCap className="h-5 w-5" style={{ color: sc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900 truncate">
                      {s.formation?.intitule || s.reference}
                    </div>
                    <div className="text-xs text-surface-500 flex items-center gap-3 flex-wrap mt-0.5">
                      {s.lieu && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.lieu}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(s.date_debut, { day: 'numeric', month: 'short' })}
                        {s.date_fin && s.date_fin !== s.date_debut && (' — ' + formatDate(s.date_fin, { day: 'numeric', month: 'short' }))}
                      </span>
                      {s.formateur && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.formateur.prenom} {s.formateur.nom}</span>}
                    </div>
                  </div>
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                </div>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-surface-400">
              <MapPin className="h-7 w-7 mx-auto mb-2 text-surface-300" />
              Aucune session trouvée
            </div>
          )}
        </div>
      )}
    </div>
  )
}
