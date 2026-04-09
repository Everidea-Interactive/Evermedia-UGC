import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', () => ({
  getTaskStatus: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  getGenerationRunBundleForUser: vi.fn(),
  saveGeneratedOutputForVariant: vi.fn(),
  syncGenerationRunStatus: vi.fn(),
  updateGenerationVariantStatus: vi.fn(),
}))

vi.mock('@/lib/persistence/serialization', () => ({
  createGenerationRunState: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getTaskStatus } from '@/lib/generation/kie'
import {
  getGenerationRunBundleForUser,
  saveGeneratedOutputForVariant,
  syncGenerationRunStatus,
  updateGenerationVariantStatus,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'
import { GET } from '@/app/api/generation/runs/[runId]/route'

describe('GET /api/generation/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
    })
  })

  it('saves newly completed outputs before returning the refreshed run', async () => {
    vi.mocked(getGenerationRunBundleForUser)
      .mockResolvedValueOnce({
        outputs: [],
        run: {
          completedAt: null,
          configSnapshot: {
            activeTab: 'image',
            batchSize: 1,
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
          variants: [
            {
              completedAt: null,
              createdAt: '2026-04-09T00:00:00.000Z',
              error: null,
              id: 'variant-1',
              profile: 'Profile 1',
              prompt: 'Prompt 1',
              resultAssetId: null,
              runId: 'run-1',
              status: 'rendering',
              taskId: 'task-1',
              variantIndex: 1,
            },
          ],
          workspace: 'image',
        },
      })
      .mockResolvedValueOnce({
        outputs: [],
        run: {
          completedAt: '2026-04-09T00:00:05.000Z',
          configSnapshot: {
            activeTab: 'image',
            batchSize: 1,
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
          status: 'success',
          userId: 'user-1',
          variants: [],
          workspace: 'image',
        },
      })
    vi.mocked(getTaskStatus).mockResolvedValue({
      error: null,
      result: {
        model: 'nano-banana-2',
        taskId: 'task-1',
        type: 'image',
        url: 'https://example.com/output.png',
      },
      status: 'success',
      taskId: 'task-1',
    })
    vi.mocked(saveGeneratedOutputForVariant).mockResolvedValue({
      createdAt: '2026-04-09T00:00:05.000Z',
      fileSize: 123,
      id: 'output-1',
      label: 'Variation 1 Output',
      mimeType: 'image/png',
      originalName: 'task-1.png',
      runId: 'run-1',
      storagePath: 'user-1/runs/run-1/outputs/task-1.png',
      userId: 'user-1',
    })
    vi.mocked(syncGenerationRunStatus).mockResolvedValue(null)
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: '2026-04-09T00:00:05.000Z',
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      model: 'nano-banana-2',
      provider: 'market',
      runId: 'run-1',
      selectedVariantId: null,
      startedAt: 0,
      status: 'success',
      variants: [],
      workspace: 'image',
    })

    const response = await GET(new Request('http://localhost/api/generation/runs/run-1'), {
      params: Promise.resolve({ runId: 'run-1' }),
    })

    expect(response.status).toBe(200)
    expect(saveGeneratedOutputForVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        sourceUrl: 'https://example.com/output.png',
        variantId: 'variant-1',
      }),
    )
    await expect(response.json()).resolves.toMatchObject({
      run: {
        runId: 'run-1',
        status: 'success',
      },
    })
  })

  it('marks provider task failures as variant errors', async () => {
    vi.mocked(getGenerationRunBundleForUser)
      .mockResolvedValueOnce({
        outputs: [],
        run: {
          completedAt: null,
          configSnapshot: {
            activeTab: 'image',
            batchSize: 1,
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
          variants: [
            {
              completedAt: null,
              createdAt: '2026-04-09T00:00:00.000Z',
              error: null,
              id: 'variant-1',
              profile: 'Profile 1',
              prompt: 'Prompt 1',
              resultAssetId: null,
              runId: 'run-1',
              status: 'rendering',
              taskId: 'task-1',
              variantIndex: 1,
            },
          ],
          workspace: 'image',
        },
      })
      .mockResolvedValueOnce({
        outputs: [],
        run: {
          completedAt: '2026-04-09T00:00:05.000Z',
          configSnapshot: {
            activeTab: 'image',
            batchSize: 1,
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
          status: 'error',
          userId: 'user-1',
          variants: [],
          workspace: 'image',
        },
      })
    vi.mocked(getTaskStatus).mockResolvedValue({
      error: 'Provider failed.',
      result: null,
      status: 'error',
      taskId: 'task-1',
    })
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: '2026-04-09T00:00:05.000Z',
      createdAt: '2026-04-09T00:00:00.000Z',
      error: 'Provider failed.',
      model: 'nano-banana-2',
      provider: 'market',
      runId: 'run-1',
      selectedVariantId: null,
      startedAt: 0,
      status: 'error',
      variants: [],
      workspace: 'image',
    })

    const response = await GET(new Request('http://localhost/api/generation/runs/run-1'), {
      params: Promise.resolve({ runId: 'run-1' }),
    })

    expect(updateGenerationVariantStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Provider failed.',
        runId: 'run-1',
        status: 'error',
        taskId: 'task-1',
      }),
    )
    expect(response.status).toBe(200)
  })
})
