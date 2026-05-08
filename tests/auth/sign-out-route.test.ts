import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/supabase/shared', () => ({
  isSupabaseConfigured: vi.fn(),
}))

import { POST } from '@/app/api/auth/sign-out/route'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

describe('POST /api/auth/sign-out', () => {
  const signOut = vi.fn()

  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true)
    signOut.mockReset()
    signOut.mockResolvedValue({ error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signOut,
      },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('redirects back to the configured public sign-in url behind a proxy', async () => {
    vi.stubEnv('SUPABASE_AUTH_REDIRECT_URL', 'https://studio.evermedia.id')

    const response = await POST(
      new Request('http://127.0.0.1:3000/api/auth/sign-out', {
        method: 'POST',
      }),
    )

    expect(signOut).toHaveBeenCalled()
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://studio.evermedia.id/sign-in')
  })
})
