import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/sign-in', requestUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, requestUrl))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(next)}`, requestUrl),
    )
  }

  return NextResponse.redirect(new URL(next, requestUrl))
}
