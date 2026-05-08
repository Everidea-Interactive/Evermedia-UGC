import { NextResponse } from 'next/server'

import { localeCookieName, normalizeLocale } from '@/lib/i18n'

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    locale?: unknown
  } | null
  const locale = normalizeLocale(payload?.locale)
  const response = NextResponse.json({ locale })

  response.cookies.set(localeCookieName, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
