import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', () => ({
  buildPromptSnapshot: vi.fn(),
  createRunId: vi.fn(),
  parseGenerationFormData: vi.fn(),
  submitGenerationRequest: vi.fn(),
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

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  buildPromptSnapshot,
  createRunId,
  parseGenerationFormData,
  submitGenerationRequest,
} from '@/lib/generation/kie'
import {
  createGenerationRunForUser,
  createGenerationVariantsForRun,
  getGenerationRunBundleForUser,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'
import { POST } from '@/app/api/generation/run/route'

describe('POST /api/generation/run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits a generation run and persists the run metadata', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
    })
    vi.mocked(parseGenerationFormData).mockReturnValue({
      activeModel: 'nano-banana',
      assetDescriptors: [],
      batchSize: 2,
      cameraMovement: 'orbit',
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Prompt',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
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
        figureArtDirection: 'none',
        imageModel: 'nano-banana',
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        shotEnvironment: 'indoor',
        subjectMode: 'lifestyle',
        textPrompt: 'Prompt',
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
          figureArtDirection: 'none',
          imageModel: 'nano-banana',
          outputQuality: '1080p',
          productCategory: 'cosmetics',
          shotEnvironment: 'indoor',
          subjectMode: 'lifestyle',
          textPrompt: 'Prompt',
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
})
