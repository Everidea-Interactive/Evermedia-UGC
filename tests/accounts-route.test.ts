import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/auth/supabase-admin', () => ({
  createManagedAuthUser: vi.fn(),
  listManagedAuthUsers: vi.fn(),
  updateManagedAuthUserPassword: vi.fn(),
}))

vi.mock('@/lib/auth/access-repository', () => ({
  createManagedAccountAccess: vi.fn(),
  disableManagedAccount: vi.fn(),
  enableManagedAccount: vi.fn(),
  listManagedAccountAccess: vi.fn(),
  setManagedAccountRoles: vi.fn(),
}))

import { POST } from '@/app/api/accounts/route'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  createManagedAuthUser,
  updateManagedAuthUserPassword,
} from '@/lib/auth/supabase-admin'
import {
  createManagedAccountAccess,
  disableManagedAccount,
  enableManagedAccount,
  setManagedAccountRoles,
} from '@/lib/auth/access-repository'

function createAccountsRequest(fields: Record<string, string>) {
  const formData = new FormData()

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }

  return new Request('http://127.0.0.1:3000/api/accounts', {
    body: formData,
    method: 'POST',
  })
}

describe('POST /api/accounts', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    vi.stubEnv('SUPABASE_AUTH_REDIRECT_URL', 'https://studio.evermedia.id')
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: true,
      email: 'owner@example.com',
      id: 'owner-1',
      roles: ['super_admin'],
      status: 'active',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('creates a managed member account by default', async () => {
    vi.mocked(createManagedAuthUser).mockResolvedValue({
      email: 'member@example.com',
      id: 'managed-1',
    })
    vi.mocked(createManagedAccountAccess).mockResolvedValue(undefined)

    const response = await POST(
      createAccountsRequest({
        email: 'member@example.com',
        intent: 'create',
        password: 'secret-pass-123',
        roles: 'member',
      }),
    )

    expect(createManagedAuthUser).toHaveBeenCalledWith({
      email: 'member@example.com',
      password: 'secret-pass-123',
    })
    expect(createManagedAccountAccess).toHaveBeenCalledWith({
      roles: ['member'],
      status: 'active',
      userId: 'managed-1',
    })
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(
      'https://studio.evermedia.id/accounts?notice=created',
    )
  })

  it('updates a managed user password', async () => {
    vi.mocked(updateManagedAuthUserPassword).mockResolvedValue(undefined)

    const response = await POST(
      createAccountsRequest({
        intent: 'set_password',
        password: 'updated-secret-123',
        userId: 'managed-1',
      }),
    )

    expect(updateManagedAuthUserPassword).toHaveBeenCalledWith({
      password: 'updated-secret-123',
      userId: 'managed-1',
    })
    expect(response.status).toBe(303)
  })

  it('disables and re-enables managed accounts', async () => {
    vi.mocked(disableManagedAccount).mockResolvedValue(undefined)
    vi.mocked(enableManagedAccount).mockResolvedValue(undefined)

    const disableResponse = await POST(
      createAccountsRequest({
        intent: 'disable',
        userId: 'managed-1',
      }),
    )

    const enableResponse = await POST(
      createAccountsRequest({
        intent: 'enable',
        userId: 'managed-1',
      }),
    )

    expect(disableManagedAccount).toHaveBeenCalledWith({
      actorUserId: 'owner-1',
      userId: 'managed-1',
    })
    expect(enableManagedAccount).toHaveBeenCalledWith({
      actorUserId: 'owner-1',
      userId: 'managed-1',
    })
    expect(disableResponse.status).toBe(303)
    expect(enableResponse.status).toBe(303)
  })

  it('updates managed roles and protects the last active super admin', async () => {
    vi.mocked(setManagedAccountRoles).mockRejectedValue(
      new Error('Cannot remove the last active super admin.'),
    )

    const response = await POST(
      createAccountsRequest({
        intent: 'set_roles',
        roles: 'member',
        userId: 'owner-1',
      }),
    )

    expect(setManagedAccountRoles).toHaveBeenCalledWith({
      actorUserId: 'owner-1',
      roles: ['member'],
      userId: 'owner-1',
    })
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toContain('error=last_super_admin')
  })

  it('returns configuration failure when the service role key is missing', async () => {
    vi.unstubAllEnvs()

    const response = await POST(
      createAccountsRequest({
        email: 'member@example.com',
        intent: 'create',
        password: 'secret-pass-123',
      }),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toContain('error=missing_service_role')
  })
})
