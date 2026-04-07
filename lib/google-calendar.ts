import { createServiceRoleClient } from '@/lib/supabase/server'

interface GoogleEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  status: string
}

interface CalendarEvent {
  id: string
  title: string
  date_debut: string
  date_fin: string
  all_day: boolean
  source: 'google'
}

async function refreshAccessToken(formateurId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret || !refreshToken) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) return null

  // Mettre à jour le token en base
  const supabase = await createServiceRoleClient()
  await supabase
    .from('formateurs')
    .update({
      google_access_token: data.access_token,
      google_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq('id', formateurId)

  return data.access_token
}

export async function getGoogleCalendarEvents(formateurId: string): Promise<CalendarEvent[]> {
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id, google_access_token, google_refresh_token, google_token_expires_at, google_calendar_connected')
    .eq('id', formateurId)
    .single()

  if (!formateur?.google_calendar_connected || !formateur.google_refresh_token) {
    return []
  }

  // Vérifier si le token est expiré
  let accessToken = formateur.google_access_token
  const expiresAt = formateur.google_token_expires_at ? new Date(formateur.google_token_expires_at) : new Date(0)

  if (expiresAt < new Date()) {
    accessToken = await refreshAccessToken(formateurId, formateur.google_refresh_token)
    if (!accessToken) return []
  }

  // Récupérer les événements des 3 prochains mois
  const now = new Date()
  const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 1)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: threeMonths.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, next: { revalidate: 300 } }
    )

    if (!res.ok) {
      // Token invalide, essayer de rafraîchir
      if (res.status === 401 && formateur.google_refresh_token) {
        accessToken = await refreshAccessToken(formateurId, formateur.google_refresh_token)
        if (accessToken) {
          const retry = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          if (retry.ok) {
            const data = await retry.json()
            return mapEvents(data.items || [])
          }
        }
      }
      return []
    }

    const data = await res.json()
    return mapEvents(data.items || [])
  } catch {
    return []
  }
}

function mapEvents(items: GoogleEvent[]): CalendarEvent[] {
  return items
    .filter(e => e.status !== 'cancelled')
    .map(e => {
      const allDay = !!e.start.date
      return {
        id: e.id,
        title: e.summary || 'Sans titre',
        date_debut: allDay ? e.start.date! : e.start.dateTime!.split('T')[0],
        date_fin: allDay ? e.end.date! : e.end.dateTime!.split('T')[0],
        all_day: allDay,
        source: 'google' as const,
      }
    })
}
