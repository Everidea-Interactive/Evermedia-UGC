import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/sign-in', requestUrl), {
    status: 303,
  })
}
