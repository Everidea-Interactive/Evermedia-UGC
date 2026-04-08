import { describe, expect, it } from 'vitest'

import { getSignInViewState } from '@/lib/auth/sign-in-view'

describe('sign-in view state', () => {
  it('selects sign-in mode and keeps sign-in email isolated', () => {
    const state = getSignInViewState({
      email: 'creator@example.com',
      error: 'invalid_credentials',
      mode: 'signin',
      passwordUpdated: false,
      reset: false,
    })

    expect(state.initialMode).toBe('signin')
    expect(state.signInEmail).toBe('creator@example.com')
    expect(state.resetEmail).toBe('')
    expect(state.signInMessage?.tone).toBe('error')
    expect(state.signInMessage?.text).toContain('incorrect')
    expect(state.resetMessage).toBeNull()
  })

  it('selects reset mode and keeps reset email isolated', () => {
    const state = getSignInViewState({
      email: 'creator@example.com',
      error: null,
      mode: 'reset',
      passwordUpdated: false,
      reset: true,
    })

    expect(state.initialMode).toBe('reset')
    expect(state.signInEmail).toBe('')
    expect(state.resetEmail).toBe('creator@example.com')
    expect(state.resetMessage?.tone).toBe('info')
    expect(state.resetMessage?.text).toContain('password reset email')
    expect(state.signInMessage).toBeNull()
  })

  it('shows password updated only on sign-in mode', () => {
    const state = getSignInViewState({
      email: '',
      error: null,
      mode: 'signin',
      passwordUpdated: true,
      reset: false,
    })

    expect(state.signInMessage?.tone).toBe('info')
    expect(state.signInMessage?.text).toContain('Password updated')
    expect(state.resetMessage).toBeNull()
  })

  it('shows recovery expired only on reset mode', () => {
    const state = getSignInViewState({
      email: '',
      error: 'recovery_expired',
      mode: 'reset',
      passwordUpdated: false,
      reset: false,
    })

    expect(state.resetMessage?.tone).toBe('error')
    expect(state.resetMessage?.text).toContain('invalid or expired')
    expect(state.signInMessage).toBeNull()
  })
})
