import { NextResponse } from 'next/server'

import {
  buildAuthCallbackUrl,
  buildSignInUrl,
  resolveNextPath,
} from '@/lib/auth/navigation'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const formData = await request.formData()
  const email = formData.get('email')
  const next = resolveNextPath(formData.get('next'))

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        mode: 'reset',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  if (typeof email !== 'string' || email.trim().length === 0) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        error: 'missing_fields',
        mode: 'reset',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  const normalizedEmail = email.trim()
  const supabase = await createSupabaseServerClient()

  try {
    await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: buildAuthCallbackUrl(requestUrl, {
        flow: 'recovery',
        next: '/auth/update-password',
      }),
    })
  } catch {
    // Always redirect to the same neutral success state to avoid account leakage.
  }

  return NextResponse.redirect(
    buildSignInUrl(requestUrl, {
      email: normalizedEmail,
      mode: 'reset',
      next,
      reset: true,
    }),
    {
      status: 303,
    },
  )
}
