import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/auth/supabase/shared', () => ({
  isSupabaseConfigured: vi.fn(),
}))

vi.mock('@/lib/auth/access-control', () => ({
  resolveAuthenticatedUser: vi.fn(),
}))

import { POST } from '@/app/api/auth/sign-in/route'
import { resolveAuthenticatedUser } from '@/lib/auth/access-control'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'
import { cookies } from 'next/headers'

function createSignInRequest({
  email,
  next = '/',
  password,
}: {
  email?: string
  next?: string
  password?: string
}) {
  const formData = new FormData()

  if (email !== undefined) {
    formData.set('email', email)
  }

  if (password !== undefined) {
    formData.set('password', password)
  }

  formData.set('next', next)

  return new Request('https://example.com/api/auth/sign-in', {
    body: formData,
    method: 'POST',
  })
}

describe('POST /api/auth/sign-in', () => {
  const signInWithPassword = vi.fn()
  const getUser = vi.fn()
  const signOut = vi.fn()

  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true)
    signInWithPassword.mockReset()
    getUser.mockReset()
    signOut.mockReset()
    vi.mocked(resolveAuthenticatedUser).mockReset()
    getUser.mockResolvedValue({
      data: {
        user: {
          email: 'creator@example.com',
          id: 'user-1',
        },
      },
    })
    signOut.mockResolvedValue({ error: null })
    vi.mocked(cookies).mockResolvedValue({
      delete: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
    } as never)
    vi.mocked(resolveAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'creator@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser,
        signInWithPassword,
        signOut,
      },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('redirects to the next path after a successful password sign-in', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: 'creator@example.com',
          id: 'user-1',
        },
      },
      error: null,
    })

    const response = await POST(
      createSignInRequest({
        email: 'creator@example.com',
        next: '/library',
        password: '  not-trimmed  ',
      }),
    )

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'creator@example.com',
      password: '  not-trimmed  ',
    })
    expect(resolveAuthenticatedUser).toHaveBeenCalledWith({
      email: 'creator@example.com',
      id: 'user-1',
    })
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/library')
  })

  it('redirects successful sign-ins to the configured public base url behind a proxy', async () => {
    vi.stubEnv('SUPABASE_AUTH_REDIRECT_URL', 'https://studio.evermedia.id')
    signInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: 'creator@example.com',
          id: 'user-1',
        },
      },
      error: null,
    })

    const formData = new FormData()
    formData.set('email', 'creator@example.com')
    formData.set('password', 'valid-password')
    formData.set('next', '/library')

    const response = await POST(
      new Request('http://127.0.0.1:3000/api/auth/sign-in', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://studio.evermedia.id/library')
  })

  it('redirects back with missing_fields when email or password is blank', async () => {
    const response = await POST(
      createSignInRequest({
        email: 'creator@example.com',
        next: '/library',
      }),
    )

    const location = new URL(response.headers.get('location')!)

    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(response.status).toBe(303)
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('email')).toBe('creator@example.com')
    expect(location.searchParams.get('error')).toBe('missing_fields')
    expect(location.searchParams.get('mode')).toBe('signin')
    expect(location.searchParams.get('next')).toBe('/library')
  })

  it('redirects back with invalid_credentials on auth failure', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: {
        message: 'Invalid login credentials',
      },
    })

    const response = await POST(
      createSignInRequest({
        email: 'creator@example.com',
        next: '/library',
        password: 'wrong-password',
      }),
    )

    const location = new URL(response.headers.get('location')!)

    expect(response.status).toBe(303)
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('email')).toBe('creator@example.com')
    expect(location.searchParams.get('error')).toBe('invalid_credentials')
    expect(location.searchParams.get('mode')).toBe('signin')
    expect(location.searchParams.get('next')).toBe('/library')
  })

  it('signs the user back out and redirects with account_disabled when app access is blocked', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: 'creator@example.com',
          id: 'user-1',
        },
      },
      error: null,
    })
    vi.mocked(resolveAuthenticatedUser).mockResolvedValue({
      reason: 'account_disabled',
      status: 'blocked',
    })

    const response = await POST(
      createSignInRequest({
        email: 'creator@example.com',
        next: '/library',
        password: 'valid-password',
      }),
    )

    const location = new URL(response.headers.get('location')!)

    expect(signOut).toHaveBeenCalled()
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('error')).toBe('account_disabled')
    expect(location.searchParams.get('mode')).toBe('signin')
  })

  it('signs the user back out and redirects with account_not_provisioned when access was never granted', async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: {
          email: 'creator@example.com',
          id: 'user-1',
        },
      },
      error: null,
    })
    vi.mocked(resolveAuthenticatedUser).mockResolvedValue({
      reason: 'account_not_provisioned',
      status: 'blocked',
    })

    const response = await POST(
      createSignInRequest({
        email: 'creator@example.com',
        next: '/library',
        password: 'valid-password',
      }),
    )

    const location = new URL(response.headers.get('location')!)

    expect(signOut).toHaveBeenCalled()
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('error')).toBe('account_not_provisioned')
    expect(location.searchParams.get('mode')).toBe('signin')
  })
})
