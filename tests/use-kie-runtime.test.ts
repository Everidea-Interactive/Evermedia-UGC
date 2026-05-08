import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createKieRuntime,
  type KieRuntimeResult,
} from '@/lib/generation/use-kie-runtime'
import type {
  KiePricingResponse,
  KieStatusResponse,
} from '@/lib/generation/types'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

function createPricingResponse(credits: number): KiePricingResponse {
  return {
    creditUsdRate: 0.1,
    expiresAt: '2026-05-06T00:00:00.000Z',
    fetchedAt: '2026-05-06T00:00:00.000Z',
    matrix: {
      image: {
        'gpt-image-2': {
          promptOnly: {
            '1K': { credits, usd: 1 },
            '2K': { credits: credits + 1, usd: 2 },
            '4K': { credits: credits + 2, usd: 3 },
          },
          withReference: {
            '1K': { credits: credits + 3, usd: 4 },
            '2K': { credits: credits + 4, usd: 5 },
            '4K': { credits: credits + 5, usd: 6 },
          },
        },
        'grok-imagine': {
          promptOnly: { credits: credits + 6, usd: 7 },
          withReference: { credits: credits + 7, usd: 8 },
        },
        'nano-banana': {
          '1K': { credits: credits + 8, usd: 9 },
          '2K': { credits: credits + 9, usd: 10 },
          '4K': { credits: credits + 10, usd: 11 },
        },
      },
      video: {
        'grok-imagine': {
          promptOnly: {
            '720p': {
              base: { credits: credits + 11, usd: 12 },
              extended: { credits: credits + 12, usd: 13 },
            },
            '1080p': {
              base: { credits: credits + 13, usd: 14 },
              extended: { credits: credits + 14, usd: 15 },
            },
          },
          withReference: {
            '720p': {
              base: { credits: credits + 15, usd: 16 },
              extended: { credits: credits + 16, usd: 17 },
            },
            '1080p': {
              base: { credits: credits + 17, usd: 18 },
              extended: { credits: credits + 18, usd: 19 },
            },
          },
        },
        kling: {
          promptOnly: {
            base: { credits: credits + 19, usd: 20 },
            extended: { credits: credits + 20, usd: 21 },
          },
          withReference: {
            base: { credits: credits + 21, usd: 22 },
            extended: { credits: credits + 22, usd: 23 },
          },
        },
        'seedance-1.5-pro': {
          promptOnly: {
            '720p': {
              base: { credits: credits + 23, usd: 24 },
              extended: { credits: credits + 24, usd: 25 },
            },
            '1080p': {
              base: { credits: credits + 25, usd: 26 },
              extended: { credits: credits + 26, usd: 27 },
            },
          },
          withReference: {
            '720p': {
              base: { credits: credits + 27, usd: 28 },
              extended: { credits: credits + 28, usd: 29 },
            },
            '1080p': {
              base: { credits: credits + 29, usd: 30 },
              extended: { credits: credits + 30, usd: 31 },
            },
          },
        },
        'veo-3.1': {
          promptOnly: { credits: credits + 31, usd: 32 },
          withReference: { credits: credits + 32, usd: 33 },
        },
      },
    },
  }
}

function createStatusResponse(
  overrides: Partial<KieStatusResponse> = {},
): KieStatusResponse {
  return {
    connected: true,
    credits: 120,
    error: null,
    fetchedAt: '2026-05-06T00:00:00.000Z',
    source: 'chat-credit',
    ...overrides,
  }
}

describe('createKieRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not start pricing polling for status-only subscribers and deduplicates concurrent status refreshes', async () => {
    const firstStatusRequest = deferred<KieRuntimeResult<KieStatusResponse>>()
    const fetchPricing = vi
      .fn<() => Promise<KieRuntimeResult<KiePricingResponse | null>>>()
      .mockResolvedValue({
        data: createPricingResponse(42),
        error: null,
      })
    const fetchStatus = vi
      .fn<() => Promise<KieRuntimeResult<KieStatusResponse>>>()
      .mockReturnValueOnce(firstStatusRequest.promise)
      .mockResolvedValueOnce({
        data: createStatusResponse({ credits: 98 }),
        error: null,
      })

    const runtime = createKieRuntime({
      fetchPricing,
      fetchStatus,
      initialPricing: null,
      initialStatus: createStatusResponse({
        connected: false,
        credits: null,
        fetchedAt: null,
        source: null,
      }),
      pricingRefreshIntervalMs: 5_000,
      pricingOnErrorData: () => null,
      statusOnErrorData: (error) =>
        createStatusResponse({
          connected: false,
          credits: null,
          error: error.message,
          fetchedAt: '2026-05-06T00:00:01.000Z',
          source: null,
        }),
      statusRefreshIntervalMs: 1_000,
    })

    const statusListener = vi.fn()
    const unsubscribe = runtime.subscribeStatus(statusListener)

    expect(fetchStatus).toHaveBeenCalledTimes(1)
    expect(fetchPricing).toHaveBeenCalledTimes(0)
    expect(runtime.getStatusSnapshot()).toMatchObject({
      data: {
        connected: false,
        credits: null,
      },
      error: null,
      isLoading: true,
    })

    const statusRefreshA = runtime.refreshStatus()
    const statusRefreshB = runtime.refreshStatus()

    expect(statusRefreshA).toBe(statusRefreshB)
    expect(fetchStatus).toHaveBeenCalledTimes(1)

    firstStatusRequest.resolve({
      data: createStatusResponse({ credits: 111 }),
      error: null,
    })
    await statusRefreshA

    expect(runtime.getStatusSnapshot()).toMatchObject({
      data: {
        connected: true,
        credits: 111,
      },
      error: null,
      isLoading: false,
    })
    expect(runtime.getPricingSnapshot()).toMatchObject({
      data: null,
      error: null,
      isLoading: true,
    })
    expect(statusListener).toHaveBeenCalledTimes(1)

    await runtime.refreshStatus()
    expect(fetchStatus).toHaveBeenCalledTimes(2)
    expect(fetchPricing).toHaveBeenCalledTimes(0)
    expect(runtime.getStatusSnapshot().data.credits).toBe(98)

    unsubscribe()
  })

  it('does not start status polling for pricing-only subscribers', async () => {
    const firstPricingRequest = deferred<KieRuntimeResult<KiePricingResponse | null>>()
    const fetchPricing = vi
      .fn<() => Promise<KieRuntimeResult<KiePricingResponse | null>>>()
      .mockReturnValueOnce(firstPricingRequest.promise)
      .mockResolvedValueOnce({
        data: createPricingResponse(52),
        error: null,
      })
    const fetchStatus = vi
      .fn<() => Promise<KieRuntimeResult<KieStatusResponse>>>()
      .mockResolvedValue({
        data: createStatusResponse({ credits: 88 }),
        error: null,
      })

    const runtime = createKieRuntime({
      fetchPricing,
      fetchStatus,
      initialPricing: null,
      initialStatus: createStatusResponse({
        connected: false,
        credits: null,
        fetchedAt: null,
        source: null,
      }),
      pricingRefreshIntervalMs: 5_000,
      pricingOnErrorData: () => null,
      statusOnErrorData: (error) =>
        createStatusResponse({
          connected: false,
          credits: null,
          error: error.message,
          fetchedAt: '2026-05-06T00:00:02.000Z',
          source: null,
        }),
      statusRefreshIntervalMs: 1_000,
    })

    const pricingListener = vi.fn()
    const unsubscribe = runtime.subscribePricing(pricingListener)

    expect(fetchPricing).toHaveBeenCalledTimes(1)
    expect(fetchStatus).toHaveBeenCalledTimes(0)
    expect(runtime.getPricingSnapshot()).toMatchObject({
      data: null,
      error: null,
      isLoading: true,
    })

    firstPricingRequest.resolve({
      data: createPricingResponse(41),
      error: null,
    })
    await runtime.refreshPricing()

    expect(runtime.getPricingSnapshot()).toMatchObject({
      data: {
        matrix: createPricingResponse(41).matrix,
      },
      error: null,
      isLoading: false,
    })
    expect(runtime.getStatusSnapshot()).toMatchObject({
      data: {
        connected: false,
        credits: null,
      },
      error: null,
      isLoading: true,
    })
    expect(pricingListener).toHaveBeenCalledTimes(1)
    expect(fetchStatus).toHaveBeenCalledTimes(0)

    unsubscribe()
  })

  it('notifies only branch-matched subscribers when pricing or status changes', async () => {
    const fetchPricing = vi
      .fn<() => Promise<KieRuntimeResult<KiePricingResponse | null>>>()
      .mockResolvedValueOnce({
        data: createPricingResponse(9),
        error: null,
      })
      .mockResolvedValueOnce({
        data: createPricingResponse(14),
        error: null,
      })
    const fetchStatus = vi
      .fn<() => Promise<KieRuntimeResult<KieStatusResponse>>>()
      .mockResolvedValueOnce({
        data: createStatusResponse({ credits: 77 }),
        error: null,
      })
      .mockRejectedValueOnce(new Error('Status endpoint offline.'))

    const runtime = createKieRuntime({
      fetchPricing,
      fetchStatus,
      initialPricing: null,
      initialStatus: createStatusResponse({
        connected: false,
        credits: null,
        fetchedAt: null,
        source: null,
      }),
      pricingRefreshIntervalMs: 5_000,
      pricingOnErrorData: () => null,
      statusOnErrorData: (error) =>
        createStatusResponse({
          connected: false,
          credits: null,
          error: error.message,
          fetchedAt: '2026-05-06T00:00:03.000Z',
          source: null,
        }),
      statusRefreshIntervalMs: 1_000,
    })

    const statusListener = vi.fn()
    const pricingListener = vi.fn()
    const unsubscribeStatus = runtime.subscribeStatus(statusListener)
    const unsubscribePricing = runtime.subscribePricing(pricingListener)

    expect(fetchStatus).toHaveBeenCalledTimes(1)
    expect(fetchPricing).toHaveBeenCalledTimes(1)

    await Promise.all([runtime.refreshPricing(), runtime.refreshStatus()])

    expect(statusListener).toHaveBeenCalledTimes(1)
    expect(pricingListener).toHaveBeenCalledTimes(1)
    expect(runtime.getStatusSnapshot()).toMatchObject({
      data: {
        connected: true,
        credits: 77,
      },
      error: null,
      isLoading: false,
    })
    expect(runtime.getPricingSnapshot()).toMatchObject({
      data: {
        matrix: createPricingResponse(9).matrix,
      },
      error: null,
      isLoading: false,
    })

    await runtime.refreshPricing()

    expect(pricingListener).toHaveBeenCalledTimes(2)
    expect(statusListener).toHaveBeenCalledTimes(1)
    expect(runtime.getPricingSnapshot().data?.matrix).toEqual(
      createPricingResponse(14).matrix,
    )

    await runtime.refreshStatus()

    expect(statusListener).toHaveBeenCalledTimes(2)
    expect(pricingListener).toHaveBeenCalledTimes(2)
    expect(runtime.getStatusSnapshot()).toMatchObject({
      data: {
        connected: false,
        credits: null,
        error: 'Status endpoint offline.',
      },
      error: 'Status endpoint offline.',
      isLoading: false,
    })

    unsubscribeStatus()
    unsubscribePricing()
  })
})
