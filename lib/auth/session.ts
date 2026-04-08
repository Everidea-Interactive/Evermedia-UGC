import { redirect } from 'next/navigation'

import { buildSignInPath } from '@/lib/auth/navigation'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

function normalizeUser(user: { email?: string | null; id: string }) {
  const normalizedUser: AuthenticatedUserSummary = {
    email: user.email ?? null,
    id: user.id,
  }

  return normalizedUser
}

export async function getOptionalAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user ? normalizeUser(user) : null
}

export async function requireAuthenticatedUser(nextPath: string) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    redirect(
      buildSignInPath({
        next: nextPath,
      }),
    )
  }

  return user
}

export async function redirectIfAuthenticated(nextPath: string) {
  const user = await getOptionalAuthenticatedUser()

  if (user) {
    redirect(nextPath)
  }
}
