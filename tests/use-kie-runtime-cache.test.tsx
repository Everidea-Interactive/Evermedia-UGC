// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

type KieStatusHookModule = typeof import('@/lib/generation/use-kie-runtime')

function createStatusProbe(module: KieStatusHookModule) {
  return function StatusProbe() {
    const { data, isLoading } = module.useKieStatusRuntime()

    return <div>{isLoading ? 'loading' : String(data.credits)}</div>
  }
}

describe('shared KIE runtime cache', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.resetModules()
    sessionStorage.clear()
    delete (globalThis as typeof globalThis & { __evermediaSharedKieRuntime?: unknown })
      .__evermediaSharedKieRuntime
  })

  it('hydrates the last known credit balance from session storage before the next fetch resolves', async () => {
    sessionStorage.setItem(
      'evermedia:kie-status',
      JSON.stringify({
        connected: true,
        credits: 120,
        error: null,
        fetchedAt: '2026-05-06T00:00:00.000Z',
        source: 'chat-credit',
      }),
    )

    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(() => {
            return undefined
          }),
      ),
    )

    const runtimeModule = await import('@/lib/generation/use-kie-runtime')
    const StatusProbe = createStatusProbe(runtimeModule)

    render(<StatusProbe />)

    expect(screen.getByText('120')).toBeTruthy()
  })
})
