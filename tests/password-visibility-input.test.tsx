// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PasswordVisibilityInput } from '@/components/auth/password-visibility-input'

describe('PasswordVisibilityInput', () => {
  afterEach(() => {
    cleanup()
  })

  it('toggles the rendered input type and accessible label', () => {
    render(
      <PasswordVisibilityInput
        className="auth-input"
        id="password"
        name="password"
        placeholder="Password"
        required
      />,
    )

    const input = screen.getByLabelText('Show password')
      .parentElement?.querySelector('input')

    expect(input?.getAttribute('type')).toBe('password')
    expect(screen.getByPlaceholderText('Password')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy()
    expect(input?.getAttribute('type')).toBe('text')
  })
})
