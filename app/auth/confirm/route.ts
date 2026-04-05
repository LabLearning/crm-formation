import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    // Use service role to verify OTP (more reliable than anon client)
    const serviceClient = await createServiceRoleClient()
    const { data: verifyData, error: verifyError } = await serviceClient.auth.verifyOtp({
      token_hash,
      type,
    })

    if (!verifyError && verifyData?.user) {
      // For invite type, redirect to setup page with user id
      if (type === 'invite') {
        // Sign in the user via the anon client to set session cookies
        const supabase = await createServerSupabaseClient()
        if (verifyData.session) {
          await supabase.auth.setSession({
            access_token: verifyData.session.access_token,
            refresh_token: verifyData.session.refresh_token,
          })
        }
        return NextResponse.redirect(`${origin}/setup-account?uid=${verifyData.user.id}`)
      }

      // For other types, set session and redirect
      const supabase = await createServerSupabaseClient()
      if (verifyData.session) {
        await supabase.auth.setSession({
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
        })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Auth Confirm] verifyOtp failed:', verifyError?.message)
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`)
}
