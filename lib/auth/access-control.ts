import {
  ensureBootstrapSuperAdmin,
  findAccessRecordByUserId,
  type ManagedAccountRole,
} from '@/lib/auth/access-repository'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

export type AuthCapability = 'manage_accounts'

export type ResolvedAuthenticatedUser =
  | AuthenticatedUserSummary
  | {
      reason: 'account_disabled' | 'account_not_provisioned'
      status: 'blocked'
    }

const capabilityMap: Record<AuthCapability, ManagedAccountRole[]> = {
  manage_accounts: ['super_admin'],
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null
}

export function userHasCapability(
  user: Pick<AuthenticatedUserSummary, 'roles'> | null | undefined,
  capability: AuthCapability,
) {
  if (!user) {
    return false
  }

  const allowedRoles = capabilityMap[capability]

  return user.roles.some((role) => allowedRoles.includes(role as ManagedAccountRole))
}

export async function resolveAuthenticatedUser(user: {
  email?: string | null
  id: string
}): Promise<ResolvedAuthenticatedUser> {
  const normalizedEmail = normalizeEmail(user.email)
  const bootstrapRecord = normalizedEmail
    ? await ensureBootstrapSuperAdmin({
        email: normalizedEmail,
        userId: user.id,
      })
    : null
  const accessRecord = bootstrapRecord ?? (await findAccessRecordByUserId(user.id))

  if (!accessRecord) {
    return {
      reason: 'account_not_provisioned',
      status: 'blocked',
    }
  }

  if (accessRecord.status === 'disabled') {
    return {
      reason: 'account_disabled',
      status: 'blocked',
    }
  }

  return {
    canManageAccounts: userHasCapability(accessRecord, 'manage_accounts'),
    email: normalizedEmail,
    id: user.id,
    roles: accessRecord.roles,
    status: accessRecord.status,
  }
}
