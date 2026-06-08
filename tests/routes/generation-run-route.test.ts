import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/generation/kie')>(
      '@/lib/generation/kie',
    )

  return {
    buildPromptSnapshot: vi.fn(),
    createRunId: vi.fn(),
    GenerationRequestError: actual.GenerationRequestError,
    getKieStatus: vi.fn(),
    parseGenerationFormData: actual.parseGenerationFormData,
    parseCarouselDraft: actual.parseCarouselDraft,
    submitGenerationRequest: vi.fn(),
    uploadFileToKie: actual.uploadFileToKie,
  }
})

vi.mock('@/lib/generation/kie-pricing', () => ({
  getKiePricing: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  createGenerationRunForUser: vi.fn(),
  createGenerationVariantsForRun: vi.fn(),
  getGenerationRunBundleForUser: vi.fn(),
}))

vi.mock('@/lib/persistence/serialization', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/persistence/serialization')>(
      '@/lib/persistence/serialization',
    )

  return {
    ...actual,
    createGenerationRunState: vi.fn(),
  }
})

import * as kieModule from '@/lib/generation/kie'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  buildPromptSnapshot,
  createRunId,
  GenerationRequestError,
  getKieStatus,
  submitGenerationRequest,
} from '@/lib/generation/kie'
import { getKiePricing } from '@/lib/generation/kie-pricing'
import {
  createGenerationRunForUser,
  createGenerationVariantsForRun,
  getGenerationRunBundleForUser,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'
import { POST } from '@/app/api/generation/run/route'
import type { KiePricingResponse } from '@/lib/generation/types'

function createPricingResponse(): KiePricingResponse {
  return {
    creditUsdRate: 0.005,
    expiresAt: '2026-04-09T01:00:00.000Z',
    fetchedAt: '2026-04-09T00:00:00.000Z',
    matrix: {
      image: {
        'nano-banana': {
          '1K': { credits: 8, usd: 0.04 },
          '2K': { credits: 12, usd: 0.06 },
          '4K': { credits: 12, usd: 0.06 },
        },
      },
      video: {
        'kling-3.0-motion-control': {
          '720p': { credits: 20, usd: 0.1 },
          '1080p': { credits: 27, usd: 0.135 },
        },
        'veo-3.1': {
          promptOnly: {
            '720p': { credits: 60, usd: 0.3 },
            '1080p': { credits: 60, usd: 0.3 },
          },
          withReference: {
            '720p': { credits: 60, usd: 0.3 },
            '1080p': { credits: 60, usd: 0.3 },
          },
        },
      },
    } as unknown as KiePricingResponse['matrix'],
  }
}

describe('POST /api/generation/run', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getKieStatus).mockResolvedValue({
      connected: true,
      credits: 500,
      error: null,
      fetchedAt: '2026-04-09T00:00:00.000Z',
      source: 'chat-credit',
    })
    vi.mocked(getKiePricing).mockResolvedValue(createPricingResponse())
  })

  it('submits a generation run and persists the run metadata', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.spyOn(kieModule, 'parseGenerationFormData').mockReturnValue({
      activeModel: 'nano-banana',
      assetDescriptors: [],
      batchSize: 2,
      cameraMovement: 'orbit',
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      experience: 'manual',
      figureArtDirection: 'none',
      guided: null,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Prompt',
      videoAudio: 'no-audio',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
      carouselDraft: null,
    })
    vi.mocked(buildPromptSnapshot).mockReturnValue('Prompt snapshot')
    vi.mocked(createRunId).mockReturnValue('run-1')
    vi.mocked(submitGenerationRequest).mockResolvedValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      model: 'nano-banana-2',
      provider: 'market',
      runId: 'run-1',
      status: 'rendering',
      variants: [
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Profile 1',
          prompt: 'Prompt 1',
          result: null,
          status: 'rendering',
          taskId: 'task-1',
          variantId: 'run-1-variant-1',
        },
      ],
      workspace: 'image',
    })
    vi.mocked(createGenerationRunForUser).mockResolvedValue({
      completedAt: null,
      configSnapshot: {
        activeTab: 'image',
        batchSize: 2,
        cameraMovement: 'orbit',
        characterAgeGroup: 'any',
        characterGender: 'any',
        creativeStyle: 'ugc-lifestyle',
        experience: 'manual',
        figureArtDirection: 'none',
        guided: null,
        imageModel: 'nano-banana',
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        shotEnvironment: 'indoor',
        subjectMode: 'lifestyle',
        textPrompt: 'Prompt',
      videoAudio: 'no-audio',
      videoDuration: 'base',
        videoModel: 'veo-3.1',
      },
      createdAt: '2026-04-09T00:00:00.000Z',
      id: 'run-1',
      model: 'nano-banana-2',
      promptSnapshot: 'Prompt snapshot',
      provider: 'market',
      status: 'rendering',
      userId: 'user-1',
      variants: [],
      workspace: 'image',
    })
    vi.mocked(createGenerationVariantsForRun).mockResolvedValue([])
    vi.mocked(getGenerationRunBundleForUser).mockResolvedValue({
      outputs: [],
      run: {
        completedAt: null,
        configSnapshot: {
          activeTab: 'image',
          batchSize: 2,
          cameraMovement: 'orbit',
          characterAgeGroup: 'any',
          characterGender: 'any',
          creativeStyle: 'ugc-lifestyle',
          experience: 'manual',
          figureArtDirection: 'none',
          guided: null,
          imageModel: 'nano-banana',
          outputQuality: '1080p',
          productCategory: 'cosmetics',
          shotEnvironment: 'indoor',
          subjectMode: 'lifestyle',
          textPrompt: 'Prompt',
      videoAudio: 'no-audio',
      videoDuration: 'base',
          videoModel: 'veo-3.1',
        },
        createdAt: '2026-04-09T00:00:00.000Z',
        id: 'run-1',
        model: 'nano-banana-2',
        promptSnapshot: 'Prompt snapshot',
        provider: 'market',
        status: 'rendering',
        userId: 'user-1',
        variants: [],
        workspace: 'image',
      },
    })
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      model: 'nano-banana-2',
      provider: 'market',
      experience: 'manual',
      runId: 'run-1',
      selectedVariantId: null,
      startedAt: 0,
      status: 'rendering',
      variants: [],
      workspace: 'image',
    })

    const request = new Request('http://localhost/api/generation/run', {
      body: new FormData(),
      method: 'POST',
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(createGenerationRunForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        promptSnapshot: 'Prompt snapshot',
        runId: 'run-1',
        userId: 'user-1',
      }),
    )
    expect(createGenerationVariantsForRun).toHaveBeenCalledWith(
      'run-1',
      expect.arrayContaining([
        expect.objectContaining({
          profile: 'Profile 1',
          status: 'rendering',
          taskId: 'task-1',
        }),
      ]),
    )

    await expect(response.json()).resolves.toMatchObject({
      runId: 'run-1',
      status: 'rendering',
    })
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue(null)

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        body: new FormData(),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(401)
  })

  it('returns 402 when the user does not have enough KIE credits', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(getKieStatus).mockResolvedValue({
      connected: true,
      credits: 4,
      error: null,
      fetchedAt: '2026-04-09T00:00:00.000Z',
      source: 'chat-credit',
    })
    vi.spyOn(kieModule, 'parseGenerationFormData').mockReturnValue({
      activeModel: 'nano-banana',
      assetDescriptors: [],
      batchSize: 1,
      cameraMovement: 'orbit',
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      experience: 'manual',
      figureArtDirection: 'none',
      guided: null,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Prompt',
      videoAudio: 'no-audio',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
      carouselDraft: null,
    })

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        body: new FormData(),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(402)
    expect(submitGenerationRequest).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: 'Not enough KIE credits. 12 required, 4 available.',
    })
  })

  it('returns 400 when request parsing fails with a validation error', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.spyOn(kieModule, 'parseGenerationFormData').mockImplementation(() => {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Invalid value for imageModel.',
        status: 400,
      })
    })

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        body: new FormData(),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid value for imageModel.',
    })
  })

  it('returns 503 when upstream KIE submission fails', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.spyOn(kieModule, 'parseGenerationFormData').mockReturnValue({
      activeModel: 'nano-banana',
      assetDescriptors: [],
      batchSize: 1,
      cameraMovement: 'orbit',
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      experience: 'manual',
      figureArtDirection: 'none',
      guided: null,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Prompt',
      videoAudio: 'no-audio',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
      carouselDraft: null,
    })
    vi.mocked(submitGenerationRequest).mockRejectedValue(
      new GenerationRequestError({
        code: 'service_unavailable',
        message: '503 Service Unavailable: upstream failed',
        status: 503,
      }),
    )

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        body: new FormData(),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: '503 Service Unavailable: upstream failed',
    })
  })

  it('accepts motion-control requests when duration metadata is provided', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.spyOn(kieModule, 'parseGenerationFormData').mockReturnValue({
      activeModel: 'kling-3.0',
      assetDescriptors: [
        {
          fieldName: 'asset_motionControlReferenceImage',
          file: new File(['image'], 'reference.png', { type: 'image/png' }),
          kind: 'named',
          label: 'Reference Image',
          order: 0,
        },
        {
          fieldName: 'asset_motionControlMotionVideo',
          file: new File(['video'], 'motion.mp4', { type: 'video/mp4' }),
          kind: 'product',
          label: 'Motion Video',
          order: 1,
          productId: 'motion-video',
        },
      ],
      batchSize: 1,
      cameraMovement: 'orbit',
      carouselDraft: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      experience: 'manual',
      figureArtDirection: 'none',
      guided: null,
      imageModel: 'nano-banana',
      motionControl: {
        additionalInstructions: 'Keep bottle readable.',
        preset: 'product',
        resolution: '1080p',
      },
      motionControlDurationSeconds: 5.25,
      motionControlResolution: '1080p',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Prompt',
      videoAudio: 'no-audio',
      videoDuration: 'base',
      videoModel: 'kling-3.0',
      workspace: 'motion-control',
    })
    vi.mocked(buildPromptSnapshot).mockReturnValue('Motion prompt snapshot')
    vi.mocked(createRunId).mockReturnValue('run-motion-1')
    vi.mocked(submitGenerationRequest).mockResolvedValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      model: 'kling-3.0/motion-control',
      provider: 'market',
      runId: 'run-motion-1',
      status: 'rendering',
      variants: [
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Variant 1',
          prompt: 'Prompt 1',
          result: null,
          status: 'rendering',
          taskId: 'task-motion-1',
          variantId: 'run-motion-1-variant-1',
        },
      ],
      workspace: 'motion-control',
    })
    vi.mocked(createGenerationRunForUser).mockResolvedValue({
      completedAt: null,
      configSnapshot: {
        activeTab: 'motion-control',
        batchSize: 1,
        cameraMovement: 'orbit',
        characterAgeGroup: 'any',
        characterGender: 'any',
        creativeStyle: 'ugc-lifestyle',
        experience: 'manual',
        figureArtDirection: 'none',
        guided: null,
        imageModel: 'nano-banana',
        motionControl: {
          additionalInstructions: 'Keep bottle readable.',
          preset: 'product',
          resolution: '1080p',
        },
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        shotEnvironment: 'indoor',
        subjectMode: 'lifestyle',
        textPrompt: 'Prompt',
        videoAudio: 'no-audio',
        videoDuration: 'base',
        videoModel: 'kling-3.0',
      },
      createdAt: '2026-04-09T00:00:00.000Z',
      id: 'run-motion-1',
      model: 'kling-3.0/motion-control',
      promptSnapshot: 'Motion prompt snapshot',
      provider: 'market',
      status: 'rendering',
      userId: 'user-1',
      variants: [],
      workspace: 'motion-control',
    })
    vi.mocked(createGenerationVariantsForRun).mockResolvedValue([])
    vi.mocked(getGenerationRunBundleForUser).mockResolvedValue({
      outputs: [],
      run: {
        completedAt: null,
        configSnapshot: {
          activeTab: 'motion-control',
          batchSize: 1,
          cameraMovement: 'orbit',
          characterAgeGroup: 'any',
          characterGender: 'any',
          creativeStyle: 'ugc-lifestyle',
          experience: 'manual',
          figureArtDirection: 'none',
          guided: null,
          imageModel: 'nano-banana',
          motionControl: {
            additionalInstructions: 'Keep bottle readable.',
            preset: 'product',
            resolution: '1080p',
          },
          outputQuality: '1080p',
          productCategory: 'cosmetics',
          shotEnvironment: 'indoor',
          subjectMode: 'lifestyle',
          textPrompt: 'Prompt',
          videoAudio: 'no-audio',
          videoDuration: 'base',
          videoModel: 'kling-3.0',
        },
        createdAt: '2026-04-09T00:00:00.000Z',
        id: 'run-motion-1',
        model: 'kling-3.0/motion-control',
        promptSnapshot: 'Motion prompt snapshot',
        provider: 'market',
        status: 'rendering',
        userId: 'user-1',
        variants: [],
        workspace: 'motion-control',
      },
    })
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      experience: 'manual',
      model: 'kling-3.0/motion-control',
      provider: 'market',
      runId: 'run-motion-1',
      selectedVariantId: null,
      startedAt: 0,
      status: 'rendering',
      variants: [],
      workspace: 'motion-control',
    })

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        body: new FormData(),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(submitGenerationRequest).toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      runId: 'run-motion-1',
      workspace: 'motion-control',
    })
  })

  it('persists guided config metadata for guided runs', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.spyOn(kieModule, 'parseGenerationFormData').mockReturnValue({
      activeModel: 'nano-banana',
      assetDescriptors: [],
      batchSize: 2,
      cameraMovement: null,
      carouselDraft: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'tv-commercial',
      experience: 'guided',
      figureArtDirection: 'none',
      guided: {
        analysisModel: 'gemini-2.5-flash',
        creativeBrief: null,
        creativePlan: null,
        contentConcept: 'driven-ads',
        productUrl: 'https://example.com/product',
        shots: [
          {
            prompt: 'Prompt 1',
            shotEnvironment: 'indoor',
            slug: 'shot-1',
            subjectMode: 'product-only',
            tags: ['hero'],
            title: 'Shot 1',
          },
          {
            prompt: 'Prompt 2',
            shotEnvironment: 'outdoor',
            slug: 'shot-2',
            subjectMode: 'lifestyle',
            tags: ['lifestyle'],
            title: 'Shot 2',
          },
        ],
        summary: 'Guided summary',
      },
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoAudio: 'no-audio',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })
    vi.mocked(buildPromptSnapshot).mockReturnValue('Guided summary')
    vi.mocked(createRunId).mockReturnValue('run-guided')
    vi.mocked(submitGenerationRequest).mockResolvedValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      model: 'nano-banana-2',
      provider: 'market',
      runId: 'run-guided',
      status: 'rendering',
      variants: [
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Shot 1',
          prompt: 'Prompt 1',
          result: null,
          status: 'rendering',
          taskId: 'task-1',
          variantId: 'run-guided-variant-1',
        },
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 2,
          profile: 'Shot 2',
          prompt: 'Prompt 2',
          result: null,
          status: 'rendering',
          taskId: 'task-2',
          variantId: 'run-guided-variant-2',
        },
      ],
      workspace: 'image',
    })
    vi.mocked(createGenerationRunForUser).mockResolvedValue({
      completedAt: null,
      configSnapshot: {
        activeTab: 'image',
        batchSize: 2,
        cameraMovement: null,
        characterAgeGroup: 'any',
        characterGender: 'any',
        creativeStyle: 'tv-commercial',
        experience: 'guided',
        figureArtDirection: 'none',
        guided: {
          analysisModel: 'gemini-2.5-flash',
          creativeBrief: null,
          creativePlan: null,
          contentConcept: 'driven-ads',
          productUrl: 'https://example.com/product',
          shots: [
            {
              prompt: 'Prompt 1',
              shotEnvironment: 'indoor',
              slug: 'shot-1',
              subjectMode: 'product-only',
              tags: ['hero'],
              title: 'Shot 1',
            },
            {
              prompt: 'Prompt 2',
              shotEnvironment: 'outdoor',
              slug: 'shot-2',
              subjectMode: 'lifestyle',
              tags: ['lifestyle'],
              title: 'Shot 2',
            },
          ],
          summary: 'Guided summary',
        },
        imageModel: 'nano-banana',
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        shotEnvironment: 'indoor',
        subjectMode: 'product-only',
        textPrompt: '',
      videoAudio: 'no-audio',
      videoDuration: 'base',
        videoModel: 'veo-3.1',
      },
      createdAt: '2026-04-09T00:00:00.000Z',
      id: 'run-guided',
      model: 'nano-banana-2',
      promptSnapshot: 'Guided summary',
      provider: 'market',
      status: 'rendering',
      userId: 'user-1',
      variants: [],
      workspace: 'image',
    })
    vi.mocked(createGenerationVariantsForRun).mockResolvedValue([])
    vi.mocked(getGenerationRunBundleForUser).mockResolvedValue({
      outputs: [],
      run: {
        completedAt: null,
        configSnapshot: {
          activeTab: 'image',
          batchSize: 2,
          cameraMovement: null,
          characterAgeGroup: 'any',
          characterGender: 'any',
          creativeStyle: 'tv-commercial',
          experience: 'guided',
          figureArtDirection: 'none',
        guided: {
          analysisModel: 'gemini-2.5-flash',
          creativeBrief: null,
          creativePlan: null,
          contentConcept: 'driven-ads',
          productUrl: 'https://example.com/product',
          shots: [
              {
                prompt: 'Prompt 1',
                shotEnvironment: 'indoor',
                slug: 'shot-1',
                subjectMode: 'product-only',
                tags: ['hero'],
                title: 'Shot 1',
              },
              {
                prompt: 'Prompt 2',
                shotEnvironment: 'outdoor',
                slug: 'shot-2',
                subjectMode: 'lifestyle',
                tags: ['lifestyle'],
                title: 'Shot 2',
              },
            ],
            summary: 'Guided summary',
          },
          imageModel: 'nano-banana',
          outputQuality: '1080p',
          productCategory: 'cosmetics',
          shotEnvironment: 'indoor',
          subjectMode: 'product-only',
          textPrompt: '',
      videoAudio: 'no-audio',
      videoDuration: 'base',
          videoModel: 'veo-3.1',
        },
        createdAt: '2026-04-09T00:00:00.000Z',
        id: 'run-guided',
        model: 'nano-banana-2',
        promptSnapshot: 'Guided summary',
        provider: 'market',
        status: 'rendering',
        userId: 'user-1',
        variants: [],
        workspace: 'image',
      },
    })
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      model: 'nano-banana-2',
      provider: 'market',
      experience: 'guided',
      runId: 'run-guided',
      selectedVariantId: null,
      startedAt: 0,
      status: 'rendering',
      variants: [],
      workspace: 'image',
    })

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        body: new FormData(),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(createGenerationRunForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        configSnapshot: expect.objectContaining({
          experience: 'guided',
          guided: expect.objectContaining({
            analysisModel: 'gemini-2.5-flash',
            contentConcept: 'driven-ads',
            summary: 'Guided summary',
          }),
        }),
      }),
    )
    expect(createGenerationVariantsForRun).toHaveBeenCalledWith(
      'run-guided',
      expect.arrayContaining([
        expect.objectContaining({
          profile: 'Shot 1',
          prompt: 'Prompt 1',
        }),
        expect.objectContaining({
          profile: 'Shot 2',
          prompt: 'Prompt 2',
        }),
      ]),
    )
  })

  it('accepts manual carousel generation requests', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(buildPromptSnapshot).mockReturnValue('carousel snapshot')
    vi.mocked(createRunId).mockReturnValue('run-carousel-1')
    vi.mocked(submitGenerationRequest).mockResolvedValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      model: 'nano-banana-2',
      provider: 'market',
      runId: 'run-carousel-1',
      status: 'rendering',
      variants: [
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Panel 1',
          prompt: 'Panel one',
          result: null,
          status: 'rendering',
          taskId: 'task-1',
          variantId: 'run-carousel-1-variant-1',
        },
      ],
      workspace: 'carousel',
    })
    vi.mocked(createGenerationRunForUser).mockResolvedValue({
      completedAt: null,
      configSnapshot: {
        activeTab: 'carousel',
        batchSize: 1,
        cameraMovement: null,
        characterAgeGroup: 'any',
        characterGender: 'any',
        creativeStyle: 'ugc-lifestyle',
        experience: 'manual',
        figureArtDirection: 'none',
        guided: null,
        imageModel: 'nano-banana',
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        shotEnvironment: 'indoor',
        subjectMode: 'lifestyle',
        textPrompt: '',
        videoAudio: 'no-audio',
        videoDuration: 'base',
        videoModel: 'veo-3.1',
        carouselDraft: {
          baseTemplateMode: 'ai',
          baseTemplatePrompt: 'white card',
          baseTemplateAsset: null,
          panels: [
            {
              id: 'panel-1',
              order: 1,
              templateMode: 'inherit',
              templatePrompt: '',
              imageMode: 'ai',
              imagePrompt: 'a portrait on top of a white panel',
              imageAsset: null,
              textMode: 'manual',
              textPrompt: '',
              textValue: 'Panel one',
            },
          ],
        },
      },
      createdAt: '2026-04-09T00:00:00.000Z',
      id: 'run-carousel-1',
      model: 'nano-banana-2',
      promptSnapshot: 'carousel snapshot',
      provider: 'market',
      status: 'rendering',
      userId: 'user-1',
      variants: [],
      workspace: 'carousel',
    })
    vi.mocked(createGenerationVariantsForRun).mockResolvedValue([])
    vi.mocked(getGenerationRunBundleForUser).mockResolvedValue({
      outputs: [],
      run: {
        completedAt: null,
        configSnapshot: {
          activeTab: 'carousel',
          batchSize: 1,
          cameraMovement: null,
          characterAgeGroup: 'any',
          characterGender: 'any',
          creativeStyle: 'ugc-lifestyle',
          experience: 'manual',
          figureArtDirection: 'none',
          guided: null,
          imageModel: 'nano-banana',
          outputQuality: '1080p',
          productCategory: 'cosmetics',
          shotEnvironment: 'indoor',
          subjectMode: 'lifestyle',
          textPrompt: '',
          videoAudio: 'no-audio',
          videoDuration: 'base',
          videoModel: 'veo-3.1',
          carouselDraft: {
            baseTemplateMode: 'ai',
            baseTemplatePrompt: 'white card',
            baseTemplateAsset: null,
            panels: [
              {
                id: 'panel-1',
                order: 1,
                templateMode: 'inherit',
                templatePrompt: '',
                imageMode: 'ai',
                imagePrompt: 'a portrait on top of a white panel',
                imageAsset: null,
                textMode: 'manual',
                textPrompt: '',
                textValue: 'Panel one',
              },
            ],
          },
        },
        createdAt: '2026-04-09T00:00:00.000Z',
        id: 'run-carousel-1',
        model: 'nano-banana-2',
        promptSnapshot: 'carousel snapshot',
        provider: 'market',
        status: 'rendering',
        userId: 'user-1',
        variants: [],
        workspace: 'carousel',
      },
    })
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: null,
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      model: 'nano-banana-2',
      provider: 'market',
      experience: 'manual',
      runId: 'run-carousel-1',
      selectedVariantId: null,
      startedAt: 0,
      status: 'rendering',
      variants: [],
      workspace: 'carousel',
    })

    const formData = new FormData()
    formData.append('workspace', 'carousel')
    formData.append('experience', 'manual')
    formData.append('batchSize', '1')
    formData.append('imageModel', 'nano-banana')
    formData.append('videoModel', 'veo-3.1')
    formData.append('outputQuality', '1080p')
    formData.append('productCategory', 'cosmetics')
    formData.append('creativeStyle', 'ugc-lifestyle')
    formData.append('subjectMode', 'lifestyle')
    formData.append('shotEnvironment', 'indoor')
    formData.append('characterGender', 'any')
    formData.append('characterAgeGroup', 'any')
    formData.append('figureArtDirection', 'none')
    formData.append('textPrompt', '')
    formData.append('videoDuration', 'base')
    formData.append('videoAudio', 'no-audio')
    formData.append('cameraMovement', '')
    formData.append(
      'carouselDraft',
      JSON.stringify({
        baseTemplateMode: 'ai',
        baseTemplatePrompt: 'white card',
        baseTemplateAsset: null,
        panels: [
          {
            id: 'panel-1',
            order: 1,
            templateMode: 'inherit',
            templatePrompt: '',
            imageMode: 'ai',
            imagePrompt: 'a portrait on top of a white panel',
            textMode: 'manual',
            textPrompt: '',
            textValue: 'Panel one',
          },
        ],
      }),
    )

    const response = await POST(
      new Request('http://localhost/api/generation/run', {
        method: 'POST',
        body: formData,
      }),
    )

    expect(response.status).toBe(200)
  })
})

