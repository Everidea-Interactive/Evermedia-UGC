import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/supabase/shared', () => ({
  isSupabaseConfigured: vi.fn(),
}))

import { GET } from '@/app/auth/callback/route'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

describe('GET /auth/callback', () => {
  const exchangeCodeForSession = vi.fn()

  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true)
    exchangeCodeForSession.mockReset()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('redirects back to sign-in when the code is missing', async () => {
    const response = await GET(
      new Request('https://example.com/auth/callback?next=%2Flibrary'),
    )

    const location = new URL(response.headers.get('location')!)

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('mode')).toBe('signin')
    expect(location.searchParams.get('next')).toBe('/library')
  })

  it('redirects recovery callbacks into the password update screen', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await GET(
      new Request(
        'https://example.com/auth/callback?code=recovery-code&flow=recovery&next=%2Fauth%2Fupdate-password',
      ),
    )

    expect(exchangeCodeForSession).toHaveBeenCalledWith('recovery-code')
    expect(response.headers.get('location')).toBe(
      'https://example.com/auth/update-password?recovery=1',
    )
  })

  it('redirects recovery failures back to sign-in with recovery_expired', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: {
        message: 'expired',
      },
    })

    const response = await GET(
      new Request(
        'https://example.com/auth/callback?code=recovery-code&flow=recovery&next=%2Fauth%2Fupdate-password',
      ),
    )

    const location = new URL(response.headers.get('location')!)

    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('error')).toBe('recovery_expired')
    expect(location.searchParams.get('mode')).toBe('reset')
  })
})
