import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listManagedAccounts: vi.fn(),
  requireAccountCapability: vi.fn(),
}))

vi.mock('@/lib/auth/access-repository', () => ({
  listManagedAccounts: mocks.listManagedAccounts,
}))

vi.mock('@/lib/auth/session', () => ({
  requireAccountCapability: mocks.requireAccountCapability,
}))

describe('AccountsPage', () => {
  it('guards the page behind the manage_accounts capability and renders managed users', async () => {
    mocks.requireAccountCapability.mockResolvedValue({
      canManageAccounts: true,
      email: 'owner@example.com',
      id: 'owner-1',
      roles: ['super_admin'],
      status: 'active',
    })
    mocks.listManagedAccounts.mockResolvedValue([
      {
        createdAt: '2026-05-07T02:00:00.000Z',
        email: 'member@example.com',
        roles: ['member'],
        status: 'active',
        updatedAt: '2026-05-07T02:00:00.000Z',
        userId: 'member-1',
      },
    ])

    const { default: AccountsPage } = await import('@/app/(protected)/accounts/page')
    const page = await AccountsPage({
      searchParams: Promise.resolve({}),
    })

    expect(mocks.requireAccountCapability).toHaveBeenCalledWith(
      'manage_accounts',
      '/accounts',
    )
    expect(page).toBeTruthy()
  })
})
