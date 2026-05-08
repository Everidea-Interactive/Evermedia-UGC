import { and, asc, eq } from 'drizzle-orm'

import { getDatabase } from '@/lib/db/client'
import { appUsers, authRoles, userRoleAssignments } from '@/lib/db/schema'
import { listManagedAuthUsers } from '@/lib/auth/supabase-admin'

export type ManagedAccountRole = 'member' | 'super_admin'
export type ManagedAccountStatus = 'active' | 'disabled'

export type ManagedAccountAccessRecord = {
  createdAt: Date
  roles: ManagedAccountRole[]
  status: ManagedAccountStatus
  updatedAt: Date
  userId: string
}

export type ManagedAccountListItem = {
  createdAt: string
  email: string | null
  lastSignInAt: string | null
  roles: ManagedAccountRole[]
  status: ManagedAccountStatus
  updatedAt: string
  userId: string
}

const defaultRoles: Array<{
  id: ManagedAccountRole
  label: string
}> = [
  {
    id: 'member',
    label: 'Member',
  },
  {
    id: 'super_admin',
    label: 'Super Admin',
  },
]

function dedupeRoles(roles: string[]): ManagedAccountRole[] {
  const unique = Array.from(new Set(roles))

  return unique.filter((role): role is ManagedAccountRole =>
    role === 'member' || role === 'super_admin',
  )
}

async function ensureDefaultRoles() {
  const db = getDatabase()

  await db.insert(authRoles).values(defaultRoles).onConflictDoNothing()
}

async function upsertAppUser(input: {
  status: ManagedAccountStatus
  userId: string
}) {
  const db = getDatabase()

  await db
    .insert(appUsers)
    .values({
      status: input.status,
      updatedAt: new Date(),
      userId: input.userId,
    })
    .onConflictDoUpdate({
      set: {
        status: input.status,
        updatedAt: new Date(),
      },
      target: appUsers.userId,
    })
}

async function replaceUserRoles(userId: string, roles: ManagedAccountRole[]) {
  const db = getDatabase()

  await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId))

  if (roles.length === 0) {
    return
  }

  await db.insert(userRoleAssignments).values(
    roles.map((roleId) => ({
      roleId,
      userId,
    })),
  )
}

function mapAccessRows(
  rows: Array<{
    app_users: typeof appUsers.$inferSelect
    user_role_assignments: typeof userRoleAssignments.$inferSelect | null
  }>,
) {
  if (rows.length === 0) {
    return null
  }

  return {
    createdAt: rows[0].app_users.createdAt,
    roles: dedupeRoles(
      rows
        .map((row) => row.user_role_assignments?.roleId ?? null)
        .filter((role): role is string => Boolean(role)),
    ),
    status: rows[0].app_users.status as ManagedAccountStatus,
    updatedAt: rows[0].app_users.updatedAt,
    userId: rows[0].app_users.userId,
  } satisfies ManagedAccountAccessRecord
}

async function getAccessRowsForUser(userId: string) {
  const db = getDatabase()

  return db
    .select()
    .from(appUsers)
    .leftJoin(userRoleAssignments, eq(appUsers.userId, userRoleAssignments.userId))
    .where(eq(appUsers.userId, userId))
    .orderBy(asc(userRoleAssignments.roleId))
}

async function countActiveSuperAdmins() {
  const db = getDatabase()
  const rows = await db
    .select({ userId: appUsers.userId })
    .from(appUsers)
    .innerJoin(userRoleAssignments, eq(appUsers.userId, userRoleAssignments.userId))
    .where(
      and(
        eq(appUsers.status, 'active'),
        eq(userRoleAssignments.roleId, 'super_admin'),
      ),
    )

  return rows.length
}

async function assertCanLoseSuperAdmin(userId: string) {
  const record = await findAccessRecordByUserId(userId)

  if (!record) {
    return
  }

  if (
    record.status === 'active' &&
    record.roles.includes('super_admin') &&
    (await countActiveSuperAdmins()) <= 1
  ) {
    throw new Error('Cannot remove the last active super admin.')
  }
}

export async function findAccessRecordByUserId(userId: string) {
  const rows = await getAccessRowsForUser(userId)

  return mapAccessRows(rows)
}

export async function ensureBootstrapSuperAdmin(input: {
  email: string
  userId: string
}) {
  const bootstrapEmails = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (!bootstrapEmails.includes(input.email.trim().toLowerCase())) {
    return null
  }

  await ensureDefaultRoles()
  const existing = await findAccessRecordByUserId(input.userId)

  if (!existing) {
    await upsertAppUser({
      status: 'active',
      userId: input.userId,
    })
    await replaceUserRoles(input.userId, ['super_admin'])

    return findAccessRecordByUserId(input.userId)
  }

  if (!existing.roles.includes('super_admin')) {
    await replaceUserRoles(input.userId, dedupeRoles([...existing.roles, 'super_admin']))
  }

  return findAccessRecordByUserId(input.userId)
}

export async function createManagedAccountAccess(input: {
  roles: ManagedAccountRole[]
  status: ManagedAccountStatus
  userId: string
}) {
  await ensureDefaultRoles()
  const roles = dedupeRoles(input.roles)

  await upsertAppUser({
    status: input.status,
    userId: input.userId,
  })
  await replaceUserRoles(input.userId, roles.length > 0 ? roles : ['member'])
}

export async function disableManagedAccount(input: {
  actorUserId: string
  userId: string
}) {
  await assertCanLoseSuperAdmin(input.userId)
  await upsertAppUser({
    status: 'disabled',
    userId: input.userId,
  })
}

export async function enableManagedAccount(input: {
  actorUserId: string
  userId: string
}) {
  const existing = await findAccessRecordByUserId(input.userId)

  if (!existing) {
    throw new Error('Managed account not found.')
  }

  await upsertAppUser({
    status: 'active',
    userId: input.userId,
  })
}

export async function setManagedAccountRoles(input: {
  actorUserId: string
  roles: ManagedAccountRole[]
  userId: string
}) {
  const roles = dedupeRoles(input.roles)

  if (roles.length === 0) {
    throw new Error('At least one role is required.')
  }

  const existing = await findAccessRecordByUserId(input.userId)

  if (!existing) {
    throw new Error('Managed account not found.')
  }

  if (existing.roles.includes('super_admin') && !roles.includes('super_admin')) {
    await assertCanLoseSuperAdmin(input.userId)
  }

  await ensureDefaultRoles()
  await replaceUserRoles(input.userId, roles)
  await upsertAppUser({
    status: existing.status,
    userId: input.userId,
  })
}

export async function listManagedAccounts(): Promise<ManagedAccountListItem[]> {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(appUsers)
    .leftJoin(userRoleAssignments, eq(appUsers.userId, userRoleAssignments.userId))
    .orderBy(asc(appUsers.createdAt), asc(userRoleAssignments.roleId))

  const userIds = Array.from(new Set(rows.map((row) => row.app_users.userId)))
  const authUsers = await listManagedAuthUsers()
  const authUsersById = new Map(authUsers.map((user) => [user.id, user]))

  return userIds.map((userId) => {
    const groupedRows = rows.filter((row) => row.app_users.userId === userId)
    const access = mapAccessRows(groupedRows)

    if (!access) {
      throw new Error(`Managed access record missing for ${userId}.`)
    }

    const authUser = authUsersById.get(userId)

    return {
      createdAt: access.createdAt.toISOString(),
      email: authUser?.email ?? null,
      lastSignInAt: authUser?.lastSignInAt ?? null,
      roles: access.roles,
      status: access.status,
      updatedAt: access.updatedAt.toISOString(),
      userId,
    }
  })
}
