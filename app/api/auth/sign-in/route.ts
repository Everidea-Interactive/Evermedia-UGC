import { NextResponse } from 'next/server'

import { resolveAuthenticatedUser } from '@/lib/auth/access-control'
import {
  buildSignInUrl,
  getConfiguredAppBaseUrl,
  resolveNextPath,
} from '@/lib/auth/navigation'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const formData = await request.formData()
  const email = formData.get('email')
  const password = formData.get('password')
  const next = resolveNextPath(formData.get('next'))

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        mode: 'signin',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  if (
    typeof email !== 'string' ||
    email.trim().length === 0 ||
    typeof password !== 'string' ||
    password.length === 0
  ) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        email: typeof email === 'string' ? email.trim() : null,
        error: 'missing_fields',
        mode: 'signin',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  const normalizedEmail = email.trim()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        email: normalizedEmail,
        error: 'invalid_credentials',
        mode: 'signin',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        email: normalizedEmail,
        error: 'invalid_credentials',
        mode: 'signin',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  const resolvedUser = await resolveAuthenticatedUser(user)

  if (resolvedUser.status === 'blocked') {
    await supabase.auth.signOut()

    return NextResponse.redirect(
      buildSignInUrl(requestUrl, {
        email: normalizedEmail,
        error: resolvedUser.reason,
        mode: 'signin',
        next,
      }),
      {
        status: 303,
      },
    )
  }

  return NextResponse.redirect(new URL(next, getConfiguredAppBaseUrl(requestUrl)), {
    status: 303,
  })
}
