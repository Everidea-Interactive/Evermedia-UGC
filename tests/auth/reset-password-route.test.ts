import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/supabase/shared', () => ({
  isSupabaseConfigured: vi.fn(),
}))

import { POST } from '@/app/api/auth/reset-password/route'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

function createResetRequest({
  email,
  next = '/',
}: {
  email?: string
  next?: string
}) {
  const formData = new FormData()

  if (email !== undefined) {
    formData.set('email', email)
  }

  formData.set('next', next)

  return new Request('https://example.com/api/auth/reset-password', {
    body: formData,
    method: 'POST',
  })
}

describe('POST /api/auth/reset-password', () => {
  const resetPasswordForEmail = vi.fn()

  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true)
    resetPasswordForEmail.mockReset()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        resetPasswordForEmail,
      },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('sends the recovery email with the configured callback redirect', async () => {
    vi.stubEnv('SUPABASE_AUTH_REDIRECT_URL', 'https://auth.evermedia.test')
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const response = await POST(
      createResetRequest({
        email: 'creator@example.com',
        next: '/library',
      }),
    )

    const location = new URL(response.headers.get('location')!)

    expect(resetPasswordForEmail).toHaveBeenCalledWith('creator@example.com', {
      redirectTo:
        'https://auth.evermedia.test/auth/callback?next=%2Fauth%2Fupdate-password&flow=recovery',
    })
    expect(response.status).toBe(303)
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('email')).toBe('creator@example.com')
    expect(location.searchParams.get('mode')).toBe('reset')
    expect(location.searchParams.get('reset')).toBe('1')
    expect(location.searchParams.get('next')).toBe('/library')
  })

  it('returns the same neutral success redirect when Supabase throws', async () => {
    resetPasswordForEmail.mockRejectedValue(new Error('network failure'))

    const response = await POST(
      createResetRequest({
        email: 'creator@example.com',
        next: '/library',
      }),
    )

    const location = new URL(response.headers.get('location')!)

    expect(response.status).toBe(303)
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('email')).toBe('creator@example.com')
    expect(location.searchParams.get('mode')).toBe('reset')
    expect(location.searchParams.get('reset')).toBe('1')
    expect(location.searchParams.get('next')).toBe('/library')
  })
})
