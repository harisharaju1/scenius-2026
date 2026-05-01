import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const RESET_COOKIE = 'pw_reset_pending'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)

      // When arriving via a password-reset email, stamp a short-lived cookie so
      // the reset-password page knows the request is legitimate. Without this,
      // any logged-in user (or attacker at an unlocked computer) could POST to
      // resetPasswordAction directly.
      if (next === '/login/reset-password') {
        response.cookies.set(RESET_COOKIE, '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15, // 15 minutes
          path: '/',
        })
      }

      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
