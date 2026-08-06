import type { Temporalite } from '@/lib/geo-france'

export interface SessionPin {
  id: string
  lat: number
  lng: number
  precise: boolean
  tempo: Temporalite
  session: any
}
