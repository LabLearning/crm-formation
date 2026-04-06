'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDate } from '@/lib/utils'
import type { SessionPin } from './CarteClient'

const STATUS_COLORS: Record<string, string> = {
  planifiee: '#6366f1',
  confirmee: '#2563eb',
  en_cours: '#16a34a',
  terminee: '#71717a',
}

function createIcon(color: string) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
    html: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 14 10 14s10-6.5 10-14c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="12" r="4" fill="white"/>
    </svg>`,
  })
}

interface MapViewProps {
  pins: SessionPin[]
}

export default function MapView({ pins }: MapViewProps) {
  // Centre de la France
  const center: [number, number] = [46.6034, 2.3488]
  const zoom = pins.length === 0 ? 6 : pins.length === 1 ? 10 : 6

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(pin => {
        const color = STATUS_COLORS[pin.session.status] || STATUS_COLORS.planifiee
        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createIcon(color)}
          >
            <Popup>
              <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 4 }}>
                  {pin.session.formation?.intitule || pin.session.reference}
                </div>
                <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6 }}>
                  {pin.session.lieu && <div>📍 {pin.session.lieu}</div>}
                  <div>📅 {formatDate(pin.session.date_debut, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  {pin.session.formateur && <div>👤 {pin.session.formateur.prenom} {pin.session.formateur.nom}</div>}
                  {pin.session.formation?.duree_heures && <div>⏱ {pin.session.formation.duree_heures}h</div>}
                  {pin.session.nb_places && <div>💺 {pin.session.nb_places} places</div>}
                </div>
                <div style={{ marginTop: 8, display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: 'white', backgroundColor: color }}>
                  {pin.session.status === 'en_cours' ? 'En cours' : pin.session.status === 'confirmee' ? 'Confirmée' : pin.session.status === 'terminee' ? 'Terminée' : 'Planifiée'}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
