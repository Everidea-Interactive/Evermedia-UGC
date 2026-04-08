import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/supabase/shared', () => ({
  isSupabaseConfigured: vi.fn(),
}))

import { POST } from '@/app/api/auth/sign-in/route'
import { createSupabaseServerClient } from '@/lib/auth/supabase/server'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

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

  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true)
    signInWithPassword.mockReset()
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signInWithPassword,
      },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('redirects to the next path after a successful password sign-in', async () => {
    signInWithPassword.mockResolvedValue({ error: null })

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
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://example.com/library')
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
})
