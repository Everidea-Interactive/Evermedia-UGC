// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

type KieStatusHookModule = typeof import('@/lib/generation/use-kie-runtime')

function createStatusProbe(module: KieStatusHookModule, label: string) {
  return function StatusProbe() {
    const { data, isLoading } = module.useKieStatusRuntime()

    return (
      <div>
        {label}:{isLoading ? 'loading' : String(data.credits)}
      </div>
    )
  }
}

describe('shared KIE runtime singleton', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.resetModules()
    delete (globalThis as typeof globalThis & { __evermediaSharedKieRuntime?: unknown })
      .__evermediaSharedKieRuntime
  })

  it('keeps the last loaded credit balance when the runtime module is re-evaluated', async () => {
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

    const firstModule = await import('@/lib/generation/use-kie-runtime')
    const FirstProbe = createStatusProbe(firstModule, 'first')

    render(<FirstProbe />)

    await waitFor(() => {
      expect(screen.getByText('first:120')).toBeTruthy()
    })

    cleanup()
    vi.resetModules()

    const secondModule = await import('@/lib/generation/use-kie-runtime')
    const SecondProbe = createStatusProbe(secondModule, 'second')

    render(<SecondProbe />)

    expect(screen.getByText('second:120')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
