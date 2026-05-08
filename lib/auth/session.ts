import { redirect } from 'next/navigation'

import { resolveAuthenticatedUser, userHasCapability, type AuthCapability } from '@/lib/auth/access-control'
import { buildSignInPath } from '@/lib/auth/navigation'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

export async function getOptionalAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const resolvedUser = await resolveAuthenticatedUser(user)

  return resolvedUser.status === 'blocked' ? null : resolvedUser
}

export async function requireAuthenticatedUser(nextPath: string) {
  if (!isSupabaseConfigured()) {
    redirect(
      buildSignInPath({
        next: nextPath,
      }),
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(
      buildSignInPath({
        next: nextPath,
      }),
    )
  }

  const resolvedUser = await resolveAuthenticatedUser(authUser)

  if (resolvedUser.status === 'blocked') {
    redirect(
      buildSignInPath({
        error: resolvedUser.reason,
        next: nextPath,
      }),
    )
  }

  return resolvedUser
}

export async function redirectIfAuthenticated(nextPath: string) {
  const user = await getOptionalAuthenticatedUser()

  if (user) {
    redirect(nextPath)
  }
}

export async function requireAccountCapability(
  capability: AuthCapability,
  nextPath: string,
): Promise<AuthenticatedUserSummary> {
  const user = await requireAuthenticatedUser(nextPath)

  if (!userHasCapability(user, capability)) {
    redirect('/')
  }

  return user
}
