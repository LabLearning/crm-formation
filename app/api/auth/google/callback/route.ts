import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.lab-learning.fr'

  if (!code || !userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/formateur-home/planning?error=missing_code`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/google/callback`

  // Échanger le code contre un access_token + refresh_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('[Google OAuth] Token error:', tokenData)
    return NextResponse.redirect(`${appUrl}/dashboard/formateur-home/planning?error=token_failed`)
  }

  // Stocker les tokens dans la fiche formateur
  const supabase = await createServiceRoleClient()

  const { data: formateur } = await supabase
    .from('formateurs')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (formateur) {
    await supabase
      .from('formateurs')
      .update({
        google_refresh_token: tokenData.refresh_token || null,
        google_access_token: tokenData.access_token,
        google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        google_calendar_connected: true,
      })
      .eq('id', formateur.id)
  }

  return NextResponse.redirect(`${appUrl}/dashboard/formateur-home/planning?google=connected`)
}
