// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthenticatedShell } from '@/components/layout/authenticated-shell'

vi.mock('next/image', () => ({
  default: () => <span>logo</span>,
}))

vi.mock('@/components/layout/kie-credits-chip', () => ({
  KieCreditsChip: () => <div>KIE Credits</div>,
}))

vi.mock('@/components/i18n/language-selector', () => ({
  LanguageSelector: () => <div>language-selector</div>,
}))

afterEach(() => {
  cleanup()
})

describe('AuthenticatedShell', () => {
  it('shows the Accounts nav item for super admins', () => {
    render(
      <AuthenticatedShell
        locale="en"
        user={{
          canManageAccounts: true,
          email: 'owner@example.com',
          id: 'owner-1',
          roles: ['super_admin'],
          status: 'active',
        }}
      >
        <div>child</div>
      </AuthenticatedShell>,
    )

    expect(screen.getByRole('link', { name: 'Accounts' })).toBeTruthy()
  })

  it('hides the Accounts nav item for members', () => {
    render(
      <AuthenticatedShell
        locale="en"
        user={{
          canManageAccounts: false,
          email: 'member@example.com',
          id: 'member-1',
          roles: ['member'],
          status: 'active',
        }}
      >
        <div>child</div>
      </AuthenticatedShell>,
    )

    expect(screen.queryByRole('link', { name: 'Accounts' })).toBeNull()
  })

  it('reveals the mobile menu content after toggling the menu button', () => {
    render(
      <AuthenticatedShell
        locale="en"
        user={{
          canManageAccounts: true,
          email: 'owner@example.com',
          id: 'owner-1',
          roles: ['super_admin'],
          status: 'active',
        }}
      >
        <div>child</div>
      </AuthenticatedShell>,
    )

    const toggle = screen.getByRole('button', { name: 'Open navigation menu' })

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByRole('link', { name: 'Accounts' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Sign out' })).toHaveLength(1)

    fireEvent.click(toggle)

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const [, mobileCredits] = screen.getAllByText('KIE Credits')
    const [, mobileStudioLink] = screen.getAllByRole('link', { name: 'Studio' })

    expect(
      mobileCredits.compareDocumentPosition(mobileStudioLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Accounts' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Sign out' })).toHaveLength(2)
    expect(screen.getAllByText('owner@example.com')).toHaveLength(2)
  })
})
