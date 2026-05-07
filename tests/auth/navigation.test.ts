import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildSignInPath,
  buildSignInUrl,
  resolveSignInMode,
} from '@/lib/auth/navigation'

describe('auth navigation helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults sign-in paths to signin mode and a safe next path', () => {
    const path = buildSignInPath({
      next: 'https://malicious.example.com',
    })

    const url = new URL(path, 'https://example.com')

    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('mode')).toBe('signin')
    expect(url.searchParams.get('next')).toBe('/')
  })

  it('preserves reset mode and email when building sign-in urls', () => {
    const url = buildSignInUrl(
      new URL('https://example.com/api/auth/reset-password'),
      {
        email: 'creator@example.com',
        mode: 'reset',
        next: '/library',
        reset: true,
      },
    )

    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('email')).toBe('creator@example.com')
    expect(url.searchParams.get('mode')).toBe('reset')
    expect(url.searchParams.get('next')).toBe('/library')
    expect(url.searchParams.get('reset')).toBe('1')
  })

  it('prefers the configured public base url when building sign-in urls', () => {
    vi.stubEnv('SUPABASE_AUTH_REDIRECT_URL', 'https://studio.evermedia.id')

    const url = buildSignInUrl(
      new URL('http://127.0.0.1:3000/api/auth/sign-in'),
      {
        next: '/library',
      },
    )

    expect(url.toString()).toBe('https://studio.evermedia.id/sign-in?mode=signin&next=%2Flibrary')
  })

  it('falls back to signin mode for invalid values', () => {
    expect(resolveSignInMode('reset')).toBe('reset')
    expect(resolveSignInMode('signin')).toBe('signin')
    expect(resolveSignInMode('unknown')).toBe('signin')
    expect(resolveSignInMode(undefined)).toBe('signin')
  })
})
