// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/generation/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/generation/client')>(
      '@/lib/generation/client',
    )

  return {
    ...actual,
    buildGenerationFormData: () => ({
      assetManifest: [],
      formData: new FormData(),
    }),
    getAssetPreviewUrl: vi.fn(),
    getGenerationValidation: () => ({
      canGenerate: true,
      reason: null,
    }),
  }
})

vi.mock('@/lib/generation/pricing', () => ({
  getGenerationCostEstimate: () => ({
    available: true,
    credits: 4,
    reason: null,
    usd: 0.02,
  }),
  getGenerationCreditValidation: () => ({
    canGenerate: true,
    reason: null,
  }),
}))

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()

  const { useGenerationStore } = await import('@/store/use-generation-store')
  useGenerationStore.getState().disposeGenerationState()
})

describe('useManualGenerationController', () => {
  it('submits a generation request and hydrates the returned run', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
          completedAt: null,
          createdAt: '2026-05-06T00:00:00.000Z',
          error: null,
          experience: 'manual',
          model: 'gpt-image-2',
          provider: 'market',
          runId: 'run-123',
          selectedVariantId: null,
          startedAt: Date.now(),
          status: 'success',
          variants: [],
          workspace: 'image',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      ),
    )

    const { useGenerationStore } = await import('@/store/use-generation-store')
    useGenerationStore.getState().setTextPrompt('Render a hero product image')

    const { useManualGenerationController } = await import(
      '@/components/dashboard/use-manual-generation-controller'
    )

    const { result } = renderHook(() =>
      useManualGenerationController({
        enabled: true,
        kiePricing: null,
        kieStatus: {
          connected: true,
          credits: 200,
          error: null,
          fetchedAt: null,
          source: 'user-credits',
        },
        pricingError: null,
      }),
    )

    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(fetch).toHaveBeenCalledWith('/api/generation/run', {
      body: expect.any(FormData),
      method: 'POST',
    })
    expect(useGenerationStore.getState().generationRun).toEqual(
      expect.objectContaining({
        model: 'gpt-image-2',
        runId: 'run-123',
        status: 'success',
      }),
    )
  })

  it('includes carousel base template fields in manual submission snapshots', async () => {
    const { useGenerationStore } = await import('@/store/use-generation-store')
    useGenerationStore.getState().setActiveTab('carousel')
    useGenerationStore.getState().updateCarouselDraft({ baseTemplatePrompt: 'white card' })

    const { useManualGenerationController } = await import(
      '@/components/dashboard/use-manual-generation-controller'
    )

    const { result } = renderHook(() =>
      useManualGenerationController({
        enabled: true,
        kiePricing: null,
        kieStatus: {
          connected: true,
          credits: 200,
          error: null,
          fetchedAt: null,
          source: 'user-credits',
        },
        pricingError: null,
      }),
    )

    const snapshot = result.current.createSnapshot()

    expect(snapshot.activeTab).toBe('carousel')
    expect(snapshot.carouselDraft?.baseTemplatePrompt).toBe('white card')
  })

  it('surfaces an HTML error response instead of crashing on JSON parsing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html><h1>Bad Gateway</h1></html>', {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          status: 502,
        }),
      ),
    )

    const { useGenerationStore } = await import('@/store/use-generation-store')
    useGenerationStore.getState().setTextPrompt('Render a hero product image')

    const { useManualGenerationController } = await import(
      '@/components/dashboard/use-manual-generation-controller'
    )

    const { result } = renderHook(() =>
      useManualGenerationController({
        enabled: true,
        kiePricing: null,
        kieStatus: {
          connected: true,
          credits: 200,
          error: null,
          fetchedAt: null,
          source: 'user-credits',
        },
        pricingError: null,
      }),
    )

    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(useGenerationStore.getState().generationRun.error).toBe(
      'Unable to start generation. The server returned HTML instead of JSON.',
    )
    expect(useGenerationStore.getState().generationRun.status).toBe('error')
  })

  it('surfaces a specific message when a reverse proxy rejects the upload with 413', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html><h1>413 Content Too Large</h1></html>', {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          status: 413,
        }),
      ),
    )

    const { useGenerationStore } = await import('@/store/use-generation-store')
    useGenerationStore.getState().setTextPrompt('Render a hero product image')

    const { useManualGenerationController } = await import(
      '@/components/dashboard/use-manual-generation-controller'
    )

    const { result } = renderHook(() =>
      useManualGenerationController({
        enabled: true,
        kiePricing: null,
        kieStatus: {
          connected: true,
          credits: 200,
          error: null,
          fetchedAt: null,
          source: 'user-credits',
        },
        pricingError: null,
      }),
    )

    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(useGenerationStore.getState().generationRun.error).toBe(
      'Unable to start generation. Uploaded generation assets exceeded the server upload limit. Reduce the image size or raise the reverse-proxy body limit.',
    )
    expect(useGenerationStore.getState().generationRun.status).toBe('error')
  })
})
