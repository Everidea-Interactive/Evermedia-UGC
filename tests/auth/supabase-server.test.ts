import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const cookieStore = {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  }

  return {
    cookieStore,
    cookies: vi.fn(async () => cookieStore),
    createServerClient: vi.fn((_url, _anonKey, options) => options),
  }
})

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

import { createSupabaseServerClient } from '@/lib/auth/supabase/server'

describe('createSupabaseServerClient', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    mocks.cookieStore.getAll.mockReturnValue([])
    mocks.cookieStore.set.mockReset()
    mocks.cookies.mockClear()
    mocks.createServerClient.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('writes cookies when the request context allows mutation', async () => {
    const supabase = (await createSupabaseServerClient()) as {
      cookies: {
        getAll: () => unknown
        setAll: (
          cookiesToSet: Array<{
            name: string
            options?: unknown
            value: string
          }>,
        ) => void
      }
    }

    supabase.cookies.setAll([
      {
        name: 'sb-access-token',
        value: 'token',
      },
    ])

    expect(mocks.createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        cookies: expect.any(Object),
      }),
    )
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      'sb-access-token',
      'token',
      undefined,
    )
  })

  it('ignores the Next.js readonly cookies error during server component reads', async () => {
    mocks.cookieStore.set.mockImplementation(() => {
      throw new Error(
        'Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options',
      )
    })

    const supabase = (await createSupabaseServerClient()) as {
      cookies: {
        setAll: (
          cookiesToSet: Array<{
            name: string
            options?: unknown
            value: string
          }>,
        ) => void
      }
    }

    expect(() =>
      supabase.cookies.setAll([
        {
          name: 'sb-access-token',
          value: 'token',
        },
      ]),
    ).not.toThrow()
  })

  it('rethrows unrelated cookie errors', async () => {
    mocks.cookieStore.set.mockImplementation(() => {
      throw new Error('boom')
    })

    const supabase = (await createSupabaseServerClient()) as {
      cookies: {
        setAll: (
          cookiesToSet: Array<{
            name: string
            options?: unknown
            value: string
          }>,
        ) => void
      }
    }

    expect(() =>
      supabase.cookies.setAll([
        {
          name: 'sb-access-token',
          value: 'token',
        },
      ]),
    ).toThrow('boom')
  })
})
