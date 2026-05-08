import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  resolveAuthenticatedUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

vi.mock('@/lib/auth/supabase/shared', () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}))

vi.mock('@/lib/auth/access-control', () => ({
  resolveAuthenticatedUser: mocks.resolveAuthenticatedUser,
  userHasCapability: (user: { canManageAccounts: boolean }, capability: string) =>
    capability === 'manage_accounts' ? user.canManageAccounts : false,
}))

describe('auth session', () => {
  beforeEach(() => {
    mocks.redirect.mockClear()
    mocks.isSupabaseConfigured.mockReturnValue(true)
    mocks.resolveAuthenticatedUser.mockReset()
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: 'member@example.com',
              id: 'user-1',
            },
          },
        }),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns the enriched authenticated user summary for active app users', async () => {
    mocks.resolveAuthenticatedUser.mockResolvedValue({
      canManageAccounts: false,
      email: 'member@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })

    const { getOptionalAuthenticatedUser } = await import('@/lib/auth/session')

    await expect(getOptionalAuthenticatedUser()).resolves.toEqual({
      canManageAccounts: false,
      email: 'member@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
  })

  it('hides blocked users from optional session reads', async () => {
    mocks.resolveAuthenticatedUser.mockResolvedValue({
      reason: 'account_disabled',
      status: 'blocked',
    })

    const { getOptionalAuthenticatedUser } = await import('@/lib/auth/session')

    await expect(getOptionalAuthenticatedUser()).resolves.toBeNull()
  })

  it('redirects authenticated members away from account-management pages when capability is missing', async () => {
    mocks.resolveAuthenticatedUser.mockResolvedValue({
      canManageAccounts: false,
      email: 'member@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })

    const { requireAccountCapability } = await import('@/lib/auth/session')

    await expect(
      requireAccountCapability('manage_accounts', '/accounts'),
    ).rejects.toThrow('REDIRECT:/')
  })
})
