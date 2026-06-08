// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('useManualGenerationController motion control', () => {
  it('keeps motion-control generate enabled while submit path resolves duration metadata', async () => {
    vi.resetModules()
    vi.doMock('@/lib/generation/video-metadata', () => ({
      readVideoDurationSeconds: vi.fn().mockResolvedValue(5.25),
    }))
    vi.doMock('@/lib/generation/pricing', () => ({
      getGenerationCostEstimate: () => ({
        available: false,
        credits: null,
        reason: 'Checking motion video duration.',
        usd: null,
      }),
      getGenerationCreditValidation: (input: {
        estimate: {
          available: boolean
          reason: string | null
        }
      }) => ({
        canGenerate: input.estimate.available,
        reason: input.estimate.reason,
      }),
    }))

    const { useGenerationStore } = await import('@/store/use-generation-store')
    const store = useGenerationStore.getState()
    store.setActiveTab('motion-control')
    store.setMotionControlReferenceImageFile(
      new File(['image'], 'reference.png', {
        type: 'image/png',
      }),
    )
    store.setMotionControlMotionVideoFile(
      new File(['video'], 'motion.mp4', {
        type: 'video/mp4',
      }),
    )
    store.setMotionControlResolution('1080p')

    const { useManualGenerationController } = await import(
      '@/components/dashboard/use-manual-generation-controller'
    )

    const { result } = renderHook(() =>
      useManualGenerationController({
        enabled: true,
        kiePricing: {
          creditUsdRate: 0.005,
          expiresAt: '2026-06-08T01:00:00.000Z',
          fetchedAt: '2026-06-08T00:00:00.000Z',
          matrix: null,
        },
        kieStatus: {
          connected: true,
          credits: 500,
          error: null,
          fetchedAt: '2026-06-08T00:00:00.000Z',
          source: 'user-credits',
        },
        pricingError: null,
      }),
    )

    expect(result.current.canGenerate).toBe(true)
    useGenerationStore.getState().disposeGenerationState()
  })

  it('reads motion video duration during submit when metadata has not populated store yet', async () => {
    vi.resetModules()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            completedAt: null,
            createdAt: '2026-06-08T00:00:00.000Z',
            error: null,
            experience: 'manual',
            model: 'kling-3.0/motion-control',
            provider: 'market',
            runId: 'run-motion-123',
            selectedVariantId: null,
            startedAt: Date.now(),
            status: 'success',
            variants: [],
            workspace: 'motion-control',
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

    const readVideoDurationSeconds = vi.fn().mockResolvedValue(5.25)
    vi.doMock('@/lib/generation/video-metadata', () => ({
      readVideoDurationSeconds,
    }))
    vi.doMock('@/lib/generation/pricing', () => ({
      getGenerationCostEstimate: (snapshot: {
        motionControl?: {
          motionVideo: {
            durationSeconds?: number | null
          }
        }
      }) => {
        const durationSeconds = snapshot.motionControl?.motionVideo.durationSeconds

        return typeof durationSeconds === 'number' && durationSeconds > 0
          ? {
              available: true,
              credits: 10,
              reason: null,
              usd: 0.05,
            }
          : {
              available: false,
              credits: null,
              reason: 'Checking motion video duration.',
              usd: null,
            }
      },
      getGenerationCreditValidation: (input: {
        estimate: {
          available: boolean
          reason: string | null
        }
      }) => ({
        canGenerate: input.estimate.available,
        reason: input.estimate.reason,
      }),
    }))

    const referenceImage = new File(['image'], 'reference.png', {
      type: 'image/png',
    })
    const motionVideo = new File(['video'], 'motion.mp4', {
      type: 'video/mp4',
    })

    const { useGenerationStore } = await import('@/store/use-generation-store')
    const store = useGenerationStore.getState()
    store.setActiveTab('motion-control')
    store.setMotionControlReferenceImageFile(referenceImage)
    store.setMotionControlMotionVideoFile(motionVideo)
    store.setMotionControlResolution('1080p')

    const { useManualGenerationController } = await import(
      '@/components/dashboard/use-manual-generation-controller'
    )

    const { result } = renderHook(() =>
      useManualGenerationController({
        enabled: true,
        kiePricing: {
          creditUsdRate: 0.005,
          expiresAt: '2026-06-08T01:00:00.000Z',
          fetchedAt: '2026-06-08T00:00:00.000Z',
          matrix: null,
        },
        kieStatus: {
          connected: true,
          credits: 500,
          error: null,
          fetchedAt: '2026-06-08T00:00:00.000Z',
          source: 'user-credits',
        },
        pricingError: null,
      }),
    )

    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(readVideoDurationSeconds).toHaveBeenCalledWith(motionVideo)
    expect(fetch).toHaveBeenCalledWith('/api/generation/run', {
      body: expect.any(FormData),
      method: 'POST',
    })
    expect(
      useGenerationStore.getState().motionControl.motionVideo.durationSeconds,
    ).toBe(5.25)
    useGenerationStore.getState().disposeGenerationState()
  })
})
