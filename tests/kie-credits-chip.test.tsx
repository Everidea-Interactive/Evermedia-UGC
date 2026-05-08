// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { KieCreditsChip } from '@/components/layout/kie-credits-chip'

function renderChip(key: string) {
  return render(
    <LocaleProvider locale="en">
      <div key={key}>
        <KieCreditsChip />
      </div>
    </LocaleProvider>,
  )
}

describe('KieCreditsChip', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.resetModules()
    delete (globalThis as typeof globalThis & { __evermediaSharedKieRuntime?: unknown })
      .__evermediaSharedKieRuntime
  })

  it('keeps the loaded balance visible across chip remounts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          connected: true,
          credits: 120,
          error: null,
          fetchedAt: '2026-05-06T00:00:00.000Z',
          source: 'chat-credit',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const firstRender = renderChip('first')

    await waitFor(() => {
      expect(screen.getByText('120')).toBeTruthy()
    })

    firstRender.unmount()

    renderChip('second')

    expect(screen.getByText('120')).toBeTruthy()
  })
})
