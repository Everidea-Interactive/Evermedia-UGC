// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguageSelector } from '@/components/i18n/language-selector'
import { LocaleProvider } from '@/components/i18n/locale-provider'

const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

describe('LocaleProvider', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('restores original text after switching from Indonesian back to English', async () => {
    const { rerender } = render(
      <LocaleProvider locale="id">
        <span>References</span>
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Referensi').length).toBeGreaterThan(0)
    })

    rerender(
      <LocaleProvider locale="en">
        <span>References</span>
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('References')).toBeTruthy()
    })
  })

  it('switches back to English immediately after clicking EN', async () => {
    render(
      <LocaleProvider locale="id">
        <LanguageSelector />
        <span>References</span>
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Referensi')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    await waitFor(() => {
      expect(screen.getByText('References')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe(
        'true',
      )
    })
  })
})
