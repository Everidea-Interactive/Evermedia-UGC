// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/generation/client', () => ({
  buildGenerationFormData: () => ({
    assetManifest: [],
    formData: new FormData(),
  }),
  getAssetPreviewUrl: vi.fn(),
  getGenerationValidation: () => ({
    canGenerate: true,
    reason: null,
  }),
}))

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
      vi.fn().mockResolvedValue({
        json: async () => ({
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
        ok: true,
      }),
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
})
