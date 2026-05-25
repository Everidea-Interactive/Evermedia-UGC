import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findAccessRecordByUserId: vi.fn(),
  ensureBootstrapSuperAdmin: vi.fn(),
}))

vi.mock('@/lib/auth/access-repository', () => ({
  ensureBootstrapSuperAdmin: mocks.ensureBootstrapSuperAdmin,
  findAccessRecordByUserId: mocks.findAccessRecordByUserId,
}))

describe('auth access control', () => {
  beforeEach(() => {
    mocks.findAccessRecordByUserId.mockReset()
    mocks.ensureBootstrapSuperAdmin.mockReset()
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'owner@example.com, second@example.com ')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('bootstraps configured super admins and grants account management capability', async () => {
    mocks.ensureBootstrapSuperAdmin.mockResolvedValue({
      createdAt: new Date('2026-05-07T02:00:00.000Z'),
      roles: ['super_admin'],
      status: 'active',
      updatedAt: new Date('2026-05-07T02:00:00.000Z'),
      userId: 'user-1',
    })
    mocks.findAccessRecordByUserId.mockResolvedValue(null)

    const { resolveAuthenticatedUser } = await import('@/lib/auth/access-control')

    const result = await resolveAuthenticatedUser({
      email: 'owner@example.com',
      id: 'user-1',
    })

    expect(mocks.ensureBootstrapSuperAdmin).toHaveBeenCalledWith({
      email: 'owner@example.com',
      userId: 'user-1',
    })
    expect(result).toEqual({
      email: 'owner@example.com',
      id: 'user-1',
      canManageAccounts: true,
      roles: ['super_admin'],
      status: 'active',
    })
  })

  it('marks disabled users as blocked even when they still have roles', async () => {
    mocks.findAccessRecordByUserId.mockResolvedValue({
      createdAt: new Date('2026-05-07T02:00:00.000Z'),
      roles: ['super_admin'],
      status: 'disabled',
      updatedAt: new Date('2026-05-07T02:30:00.000Z'),
      userId: 'user-2',
    })

    const { resolveAuthenticatedUser } = await import('@/lib/auth/access-control')

    const result = await resolveAuthenticatedUser({
      email: 'disabled@example.com',
      id: 'user-2',
    })

    expect(result).toEqual({
      reason: 'account_disabled',
      status: 'blocked',
    })
  })

  it('marks authenticated but unprovisioned users as blocked', async () => {
    mocks.findAccessRecordByUserId.mockResolvedValue(null)
    mocks.ensureBootstrapSuperAdmin.mockResolvedValue(null)

    const { resolveAuthenticatedUser } = await import('@/lib/auth/access-control')

    const result = await resolveAuthenticatedUser({
      email: 'member@example.com',
      id: 'user-3',
    })

    expect(result).toEqual({
      reason: 'account_not_provisioned',
      status: 'blocked',
    })
  })

  it('treats only super admins as account managers in this pass', async () => {
    const { userHasCapability } = await import('@/lib/auth/access-control')

    expect(
      userHasCapability(
        { roles: ['member'] },
        'manage_accounts',
      ),
    ).toBe(false)

    expect(
      userHasCapability(
        { roles: ['super_admin'] },
        'manage_accounts',
      ),
    ).toBe(true)
  })
})
