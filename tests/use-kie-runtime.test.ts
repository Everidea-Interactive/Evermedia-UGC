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

function createPricingResponse(credits: number) {
  return {
    creditUsdRate: 0.1,
    expiresAt: '2026-05-06T00:00:00.000Z',
    fetchedAt: '2026-05-06T00:00:00.000Z',
    matrix: {
      image: {
        'nano-banana': {
          '1K': { credits, usd: 1 },
          '2K': { credits: credits + 1, usd: 2 },
          '4K': { credits: credits + 2, usd: 3 },
        },
        'grok-imagine': {
          promptOnly: { credits: credits + 3, usd: 4 },
          withReference: { credits: credits + 4, usd: 5 },
        },
        'gpt-image-2': {
          promptOnly: {
            '1K': { credits: credits + 5, usd: 6 },
            '2K': { credits: credits + 6, usd: 7 },
            '4K': { credits: credits + 7, usd: 8 },
          },
          withReference: {
            '1K': { credits: credits + 8, usd: 9 },
            '2K': { credits: credits + 9, usd: 10 },
            '4K': { credits: credits + 10, usd: 11 },
          },
        },
      },
      video: {
        'grok-imagine-video-1.5': {
          promptOnly: {
            '720p': {
              base: { credits: credits + 11, usd: 12 },
              extended: { credits: credits + 12, usd: 13 },
            },
            '480p': {
              base: { credits: credits + 13, usd: 14 },
              extended: { credits: credits + 14, usd: 15 },
            },
          },
          withReference: {
            '720p': {
              base: { credits: credits + 15, usd: 16 },
              extended: { credits: credits + 16, usd: 17 },
            },
            '480p': {
              base: { credits: credits + 17, usd: 18 },
              extended: { credits: credits + 18, usd: 19 },
            },
          },
        },
        kling: {
          promptOnly: {
            'no-audio': {
              base: { credits: credits + 19, usd: 20 },
              extended: { credits: credits + 20, usd: 21 },
            },
            'with-audio': {
              base: { credits: credits + 21, usd: 22 },
              extended: { credits: credits + 22, usd: 23 },
            },
          },
          withReference: {
            'no-audio': {
              base: { credits: credits + 23, usd: 24 },
              extended: { credits: credits + 24, usd: 25 },
            },
            'with-audio': {
              base: { credits: credits + 25, usd: 26 },
              extended: { credits: credits + 26, usd: 27 },
            },
          },
        },
        'kling-3.0': {
          promptOnly: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 27, usd: 28 },
                extended: { credits: credits + 28, usd: 29 },
              },
              'with-audio': {
                base: { credits: credits + 29, usd: 30 },
                extended: { credits: credits + 30, usd: 31 },
              },
            },
            '1080p': {
              'no-audio': {
                base: { credits: credits + 31, usd: 32 },
                extended: { credits: credits + 32, usd: 33 },
              },
              'with-audio': {
                base: { credits: credits + 33, usd: 34 },
                extended: { credits: credits + 34, usd: 35 },
              },
            },
          },
          withReference: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 35, usd: 36 },
                extended: { credits: credits + 36, usd: 37 },
              },
              'with-audio': {
                base: { credits: credits + 37, usd: 38 },
                extended: { credits: credits + 38, usd: 39 },
              },
            },
            '1080p': {
              'no-audio': {
                base: { credits: credits + 39, usd: 40 },
                extended: { credits: credits + 40, usd: 41 },
              },
              'with-audio': {
                base: { credits: credits + 41, usd: 42 },
                extended: { credits: credits + 42, usd: 43 },
              },
            },
          },
        },
        'veo-3.1': {
          promptOnly: { credits: credits + 43, usd: 44 },
          withReference: { credits: credits + 44, usd: 45 },
        },
        'seedance-1.5-pro': {
          promptOnly: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 45, usd: 46 },
                extended: { credits: credits + 46, usd: 47 },
              },
              'with-audio': {
                base: { credits: credits + 47, usd: 48 },
                extended: { credits: credits + 48, usd: 49 },
              },
            },
            '1080p': {
              'no-audio': {
                base: { credits: credits + 49, usd: 50 },
                extended: { credits: credits + 50, usd: 51 },
              },
              'with-audio': {
                base: { credits: credits + 51, usd: 52 },
                extended: { credits: credits + 52, usd: 53 },
              },
            },
          },
          withReference: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 53, usd: 54 },
                extended: { credits: credits + 54, usd: 55 },
              },
              'with-audio': {
                base: { credits: credits + 55, usd: 56 },
                extended: { credits: credits + 56, usd: 57 },
              },
            },
            '1080p': {
              'no-audio': {
                base: { credits: credits + 57, usd: 58 },
                extended: { credits: credits + 58, usd: 59 },
              },
              'with-audio': {
                base: { credits: credits + 59, usd: 60 },
                extended: { credits: credits + 60, usd: 61 },
              },
            },
          },
        },
        'seedance-2-mini': {
          promptOnly: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 61, usd: 62 },
                extended: { credits: credits + 62, usd: 63 },
              },
              'with-audio': {
                base: { credits: credits + 63, usd: 64 },
                extended: { credits: credits + 64, usd: 65 },
              },
            },
            '480p': {
              'no-audio': {
                base: { credits: credits + 65, usd: 66 },
                extended: { credits: credits + 66, usd: 67 },
              },
              'with-audio': {
                base: { credits: credits + 67, usd: 68 },
                extended: { credits: credits + 68, usd: 69 },
              },
            },
          },
          withReference: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 69, usd: 70 },
                extended: { credits: credits + 70, usd: 71 },
              },
              'with-audio': {
                base: { credits: credits + 71, usd: 72 },
                extended: { credits: credits + 72, usd: 73 },
              },
            },
            '480p': {
              'no-audio': {
                base: { credits: credits + 73, usd: 74 },
                extended: { credits: credits + 74, usd: 75 },
              },
              'with-audio': {
                base: { credits: credits + 75, usd: 76 },
                extended: { credits: credits + 76, usd: 77 },
              },
            },
          },
        },
        'seedance-2': {
          promptOnly: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 78, usd: 79 },
                extended: { credits: credits + 79, usd: 80 },
              },
              'with-audio': {
                base: { credits: credits + 80, usd: 81 },
                extended: { credits: credits + 81, usd: 82 },
              },
            },
            '1080p': {
              'no-audio': {
                base: { credits: credits + 82, usd: 83 },
                extended: { credits: credits + 83, usd: 84 },
              },
              'with-audio': {
                base: { credits: credits + 84, usd: 85 },
                extended: { credits: credits + 85, usd: 86 },
              },
            },
          },
          withReference: {
            '720p': {
              'no-audio': {
                base: { credits: credits + 86, usd: 87 },
                extended: { credits: credits + 87, usd: 88 },
              },
              'with-audio': {
                base: { credits: credits + 88, usd: 89 },
                extended: { credits: credits + 89, usd: 90 },
              },
            },
            '1080p': {
              'no-audio': {
                base: { credits: credits + 90, usd: 91 },
                extended: { credits: credits + 91, usd: 92 },
              },
              'with-audio': {
                base: { credits: credits + 92, usd: 93 },
                extended: { credits: credits + 93, usd: 94 },
              },
            },
          },
        },
      },
    },
  } as unknown as KiePricingResponse
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
