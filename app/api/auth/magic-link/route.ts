import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

function getAuthRedirectUrl(requestUrl: URL, next: string) {
  const configuredBase = process.env.SUPABASE_AUTH_REDIRECT_URL
  const callbackUrl = configuredBase
    ? new URL('/auth/callback', configuredBase)
    : new URL('/auth/callback', requestUrl.origin)

  callbackUrl.searchParams.set('next', next)

  return callbackUrl.toString()
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const formData = await request.formData()
  const email = formData.get('email')
  const next = typeof formData.get('next') === 'string' ? String(formData.get('next')) : '/'

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/sign-in', requestUrl))
  }

  if (typeof email !== 'string' || email.trim().length === 0) {
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(next)}`, requestUrl),
    )
  }

  const supabase = await createSupabaseServerClient()
  await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: getAuthRedirectUrl(requestUrl, next),
    },
  })

  const redirectUrl = new URL('/sign-in', requestUrl)
  redirectUrl.searchParams.set('sent', '1')
  redirectUrl.searchParams.set('email', email.trim())
  redirectUrl.searchParams.set('next', next)

  return NextResponse.redirect(redirectUrl)
}
