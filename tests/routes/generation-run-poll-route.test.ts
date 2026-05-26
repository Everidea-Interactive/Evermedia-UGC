import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', () => ({
  getTaskStatus: vi.fn(),
}))

vi.mock('@/lib/media/image-grid', () => ({
  splitImageGridBuffer: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  deleteGenerationRunForUser: vi.fn(),
  getGenerationRunBundle: vi.fn(),
  saveGeneratedOutputBufferForVariant: vi.fn(),
  saveGeneratedOutputForVariant: vi.fn(),
  syncGenerationRunStatus: vi.fn(),
  updateGenerationVariantStatus: vi.fn(),
}))

vi.mock('@/lib/persistence/serialization', () => ({
  createGenerationRunState: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getTaskStatus } from '@/lib/generation/kie'
import { splitImageGridBuffer } from '@/lib/media/image-grid'
import {
  deleteGenerationRunForUser,
  getGenerationRunBundle,
  saveGeneratedOutputBufferForVariant,
  saveGeneratedOutputForVariant,
  syncGenerationRunStatus,
  updateGenerationVariantStatus,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'
import { DELETE, GET } from '@/app/api/generation/runs/[runId]/route'

describe('GET /api/generation/runs/[runId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
  })

  it('deletes an owned generation run', async () => {
    vi.mocked(deleteGenerationRunForUser).mockResolvedValue({
      completedAt: null,
      configSnapshot: {
        activeTab: 'image',
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
    })

    const response = await DELETE(
      new Request('http://localhost/api/generation/runs/run-1'),
      {
        params: Promise.resolve({ runId: 'run-1' }),
      },
    )

    expect(response.status).toBe(200)
    expect(deleteGenerationRunForUser).toHaveBeenCalledWith({
      runId: 'run-1',
      userId: 'user-1',
    })
    await expect(response.json()).resolves.toEqual({ runId: 'run-1' })
  })

  it('returns 404 when deleting a missing generation run', async () => {
    vi.mocked(deleteGenerationRunForUser).mockResolvedValue(null)

    const response = await DELETE(
      new Request('http://localhost/api/generation/runs/missing-run'),
      {
        params: Promise.resolve({ runId: 'missing-run' }),
      },
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Run not found' })
  })

  it('saves newly completed outputs before returning the refreshed run', async () => {
    vi.mocked(getGenerationRunBundle)
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
      experience: 'manual',
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
      configSnapshot: {
        activeTab: 'image',
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
      },
      run: {
        runId: 'run-1',
        status: 'success',
      },
    })
  })

  it('splits one completed manual image grid task into four saved outputs', async () => {
    vi.mocked(getGenerationRunBundle)
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
          id: 'run-grid',
          model: 'nano-banana-2',
          promptSnapshot: 'Prompt snapshot',
          provider: 'market',
          status: 'rendering',
          userId: 'user-1',
          variants: [1, 2, 3, 4].map((index) => ({
            completedAt: null,
            createdAt: '2026-04-09T00:00:00.000Z',
            error: null,
            id: `variant-${index}`,
            profile: `Grid 1 Image ${index}`,
            prompt: 'Prompt 1',
            resultAssetId: null,
            runId: 'run-grid',
            status: 'rendering' as const,
            taskId: 'grid-task-1',
            variantIndex: index as 1 | 2 | 3 | 4,
          })),
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
          id: 'run-grid',
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
        taskId: 'grid-task-1',
        type: 'image',
        url: 'https://example.com/grid.png',
      },
      status: 'success',
      taskId: 'grid-task-1',
    })
    vi.mocked(splitImageGridBuffer).mockResolvedValue([
      { buffer: Buffer.from('top-left'), label: 'Top left', position: 1 },
      { buffer: Buffer.from('top-right'), label: 'Top right', position: 2 },
      { buffer: Buffer.from('bottom-left'), label: 'Bottom left', position: 3 },
      { buffer: Buffer.from('bottom-right'), label: 'Bottom right', position: 4 },
    ])
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('grid-image', {
          headers: { 'Content-Type': 'image/png' },
          status: 200,
        }),
      ),
    )
    vi.mocked(saveGeneratedOutputBufferForVariant).mockResolvedValue({
      createdAt: '2026-04-09T00:00:05.000Z',
      fileSize: 8,
      id: 'output-1',
      label: 'Variation 1 Output',
      mimeType: 'image/png',
      originalName: 'grid-task-1-1.png',
      runId: 'run-grid',
      storagePath: 'user-1/runs/run-grid/outputs/grid-task-1-1.png',
      userId: 'user-1',
    })
    vi.mocked(syncGenerationRunStatus).mockResolvedValue(null)
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: '2026-04-09T00:00:05.000Z',
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      model: 'nano-banana-2',
      provider: 'market',
      experience: 'manual',
      runId: 'run-grid',
      selectedVariantId: null,
      startedAt: 0,
      status: 'success',
      variants: [],
      workspace: 'image',
    })

    const response = await GET(new Request('http://localhost/api/generation/runs/run-grid'), {
      params: Promise.resolve({ runId: 'run-grid' }),
    })

    expect(response.status).toBe(200)
    expect(getTaskStatus).toHaveBeenCalledTimes(1)
    expect(splitImageGridBuffer).toHaveBeenCalledWith(Buffer.from('grid-image'))
    expect(saveGeneratedOutputBufferForVariant).toHaveBeenCalledTimes(4)
    expect(saveGeneratedOutputBufferForVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'grid-task-1-variation-1.png',
        label: 'Variation 1 Output',
        variantId: 'variant-1',
      }),
    )
    expect(saveGeneratedOutputForVariant).not.toHaveBeenCalled()
  })

  it('marks provider task failures as variant errors', async () => {
    vi.mocked(getGenerationRunBundle)
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
      experience: 'manual',
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

  it('saves refreshed outputs under the run owner when another user reads the shared library run', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'viewer@example.com',
      id: 'viewer-2',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(getGenerationRunBundle)
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
          id: 'run-owner',
          model: 'nano-banana-2',
          promptSnapshot: 'Prompt snapshot',
          provider: 'market',
          status: 'rendering',
          userId: 'owner-1',
          variants: [
            {
              completedAt: null,
              createdAt: '2026-04-09T00:00:00.000Z',
              error: null,
              id: 'variant-1',
              profile: 'Profile 1',
              prompt: 'Prompt 1',
              resultAssetId: null,
              runId: 'run-owner',
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
          id: 'run-owner',
          model: 'nano-banana-2',
          promptSnapshot: 'Prompt snapshot',
          provider: 'market',
          status: 'success',
          userId: 'owner-1',
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
      runId: 'run-owner',
      storagePath: 'owner-1/runs/run-owner/outputs/task-1.png',
      userId: 'owner-1',
    })
    vi.mocked(syncGenerationRunStatus).mockResolvedValue(null)
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: '2026-04-09T00:00:05.000Z',
      createdAt: '2026-04-09T00:00:00.000Z',
      error: null,
      model: 'nano-banana-2',
      provider: 'market',
      experience: 'manual',
      runId: 'run-owner',
      selectedVariantId: null,
      startedAt: 0,
      status: 'success',
      variants: [],
      workspace: 'image',
    })

    const response = await GET(new Request('http://localhost/api/generation/runs/run-owner'), {
      params: Promise.resolve({ runId: 'run-owner' }),
    })

    expect(response.status).toBe(200)
    expect(saveGeneratedOutputForVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-owner',
        userId: 'owner-1',
        variantId: 'variant-1',
      }),
    )
  })
})

