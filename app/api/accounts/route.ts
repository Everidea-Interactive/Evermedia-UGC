import { NextResponse } from 'next/server'

import {
  createManagedAccountAccess,
  disableManagedAccount,
  enableManagedAccount,
  setManagedAccountRoles,
  type ManagedAccountRole,
} from '@/lib/auth/access-repository'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  createManagedAuthUser,
  updateManagedAuthUserPassword,
} from '@/lib/auth/supabase-admin'

export const runtime = 'nodejs'

function redirectToAccounts(params: Record<string, string>) {
  const url = new URL('/accounts', 'https://example.com')

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return NextResponse.redirect(url, {
    status: 303,
  })
}

function parseRoles(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return ['member'] satisfies ManagedAccountRole[]
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((role) => role.trim())
        .filter((role): role is ManagedAccountRole =>
          role === 'member' || role === 'super_admin',
        ),
    ),
  )
}

function mapRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error.'

  if (message.includes('last active super admin')) {
    return 'last_super_admin'
  }

  return 'request_failed'
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return redirectToAccounts({
      error: 'missing_service_role',
    })
  }

  const user = await getOptionalAuthenticatedUser()

  if (!user?.canManageAccounts) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const intent = formData.get('intent')

  try {
    if (intent === 'create') {
      const email = formData.get('email')
      const password = formData.get('password')

      if (
        typeof email !== 'string' ||
        email.trim().length === 0 ||
        typeof password !== 'string' ||
        password.length === 0
      ) {
        return redirectToAccounts({ error: 'missing_fields' })
      }

      const createdUser = await createManagedAuthUser({
        email: email.trim().toLowerCase(),
        password,
      })

      await createManagedAccountAccess({
        roles: parseRoles(formData.get('roles')),
        status: 'active',
        userId: createdUser.id,
      })

      return redirectToAccounts({ notice: 'created' })
    }

    if (intent === 'set_password') {
      const password = formData.get('password')
      const userId = formData.get('userId')

      if (
        typeof password !== 'string' ||
        password.length === 0 ||
        typeof userId !== 'string' ||
        userId.length === 0
      ) {
        return redirectToAccounts({ error: 'missing_fields' })
      }

      await updateManagedAuthUserPassword({
        password,
        userId,
      })

      return redirectToAccounts({ notice: 'password_updated' })
    }

    if (intent === 'disable') {
      const userId = formData.get('userId')

      if (typeof userId !== 'string' || userId.length === 0) {
        return redirectToAccounts({ error: 'missing_fields' })
      }

      await disableManagedAccount({
        actorUserId: user.id,
        userId,
      })

      return redirectToAccounts({ notice: 'disabled' })
    }

    if (intent === 'enable') {
      const userId = formData.get('userId')

      if (typeof userId !== 'string' || userId.length === 0) {
        return redirectToAccounts({ error: 'missing_fields' })
      }

      await enableManagedAccount({
        actorUserId: user.id,
        userId,
      })

      return redirectToAccounts({ notice: 'enabled' })
    }

    if (intent === 'set_roles') {
      const userId = formData.get('userId')

      if (typeof userId !== 'string' || userId.length === 0) {
        return redirectToAccounts({ error: 'missing_fields' })
      }

      await setManagedAccountRoles({
        actorUserId: user.id,
        roles: parseRoles(formData.get('roles')),
        userId,
      })

      return redirectToAccounts({ notice: 'roles_updated' })
    }
  } catch (error) {
    return redirectToAccounts({
      error: mapRouteError(error),
    })
  }

  return redirectToAccounts({ error: 'unknown_intent' })
}
