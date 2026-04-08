import { NextResponse } from 'next/server'

import { buildSignInUrl, resolveNextPath } from '@/lib/auth/navigation'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const flow = requestUrl.searchParams.get('flow')
  const next = resolveNextPath(requestUrl.searchParams.get('next'))

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        mode: flow === 'recovery' ? 'reset' : 'signin',
        next,
      }),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      flow === 'recovery'
        ? buildSignInUrl(requestUrl, {
            error: 'recovery_expired',
            mode: 'reset',
          })
        : buildSignInUrl(requestUrl, {
            mode: 'signin',
            next,
          }),
    )
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      flow === 'recovery'
        ? buildSignInUrl(requestUrl, {
            error: 'recovery_expired',
            mode: 'reset',
          })
        : buildSignInUrl(requestUrl, {
            mode: 'signin',
            next,
          }),
    )
  }

  if (flow === 'recovery') {
    return NextResponse.redirect(
      new URL('/auth/update-password?recovery=1', requestUrl),
    )
  }

  return NextResponse.redirect(new URL(next, requestUrl))
}
