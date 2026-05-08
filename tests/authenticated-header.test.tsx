// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { AuthenticatedHeader } from '@/components/layout/authenticated-header'

const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => <span>{props.alt}</span>,
}))

vi.mock('@/components/layout/kie-credits-chip', () => ({
  KieCreditsChip: () => <div>KIE Credits</div>,
}))

describe('AuthenticatedHeader', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('updates the mobile menu copy immediately after switching to English', async () => {
    render(
      <LocaleProvider locale="id">
        <AuthenticatedHeader
          user={{
            canManageAccounts: true,
            email: 'owner@example.com',
            id: 'owner-1',
            roles: ['super_admin'],
            status: 'active',
          }}
        />
      </LocaleProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Keluar' }).length).toBeGreaterThan(0)
    })

    const [, mobileEnglishButton] = screen.getAllByRole('button', { name: 'English' })

    fireEvent.click(mobileEnglishButton)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Sign out' }).length).toBeGreaterThan(0)
    })
  })
})
