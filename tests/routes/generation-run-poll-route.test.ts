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

  it('splits shared carousel batch output and saves only real panel quadrants', async () => {
    vi.mocked(getGenerationRunBundle)
      .mockResolvedValueOnce({
        outputs: [],
        run: {
          completedAt: null,
          configSnapshot: {
            activeTab: 'carousel',
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
            carouselDraft: {
              baseTemplateMode: 'ai',
              baseTemplatePrompt: 'white card',
              baseTemplateAsset: null,
              panels: [],
            },
          },
          createdAt: '2026-04-09T00:00:00.000Z',
          id: 'run-carousel',
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
              id: 'variant-p1',
              profile: 'Panel 1',
              prompt: 'Prompt 1',
              resultAssetId: null,
              runId: 'run-carousel',
              status: 'rendering',
              taskId: 'carousel-task-1',
              variantIndex: 1,
            },
            {
              completedAt: null,
              createdAt: '2026-04-09T00:00:00.000Z',
              error: null,
              id: 'variant-p2',
              profile: 'Panel 2',
              prompt: 'Prompt 1',
              resultAssetId: null,
              runId: 'run-carousel',
              status: 'rendering',
              taskId: 'carousel-task-1',
              variantIndex: 2,
            },
          ],
          workspace: 'carousel',
        },
      })
      .mockResolvedValueOnce({
        outputs: [
          {
            createdAt: '2026-04-09T00:00:05.000Z',
            fileSize: 123,
            id: 'output-p1',
            label: 'Panel 1',
            mimeType: 'image/png',
            originalName: 'carousel-task-1-panel-1.png',
            runId: 'run-carousel',
            storagePath: 'user-1/runs/run-carousel/outputs/carousel-task-1-panel-1.png',
            userId: 'user-1',
          },
          {
            createdAt: '2026-04-09T00:00:05.000Z',
            fileSize: 456,
            id: 'output-p2',
            label: 'Panel 2',
            mimeType: 'image/png',
            originalName: 'carousel-task-1-panel-2.png',
            runId: 'run-carousel',
            storagePath: 'user-1/runs/run-carousel/outputs/carousel-task-1-panel-2.png',
            userId: 'user-1',
          },
        ],
        run: {
          completedAt: '2026-04-09T00:00:05.000Z',
          configSnapshot: {
            activeTab: 'carousel',
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
            carouselDraft: {
              baseTemplateMode: 'ai',
              baseTemplatePrompt: 'white card',
              baseTemplateAsset: null,
              panels: [],
            },
          },
          createdAt: '2026-04-09T00:00:00.000Z',
          id: 'run-carousel',
          model: 'nano-banana-2',
          promptSnapshot: 'Prompt snapshot',
          provider: 'market',
          status: 'success',
          userId: 'user-1',
          variants: [
            {
              completedAt: null,
              createdAt: '2026-04-09T00:00:00.000Z',
              error: null,
              id: 'variant-p1',
              profile: 'Panel 1',
              prompt: 'Prompt 1',
              resultAssetId: 'output-p1',
              runId: 'run-carousel',
              status: 'success',
              taskId: 'carousel-task-1',
              variantIndex: 1,
            },
            {
              completedAt: null,
              createdAt: '2026-04-09T00:00:00.000Z',
              error: null,
              id: 'variant-p2',
              profile: 'Panel 2',
              prompt: 'Prompt 1',
              resultAssetId: 'output-p2',
              runId: 'run-carousel',
              status: 'success',
              taskId: 'carousel-task-1',
              variantIndex: 2,
            },
          ],
          workspace: 'carousel',
        },
      })
    vi.mocked(getTaskStatus).mockResolvedValue({
      error: null,
      result: {
        model: 'nano-banana-2',
        taskId: 'carousel-task-1',
        type: 'image',
        url: 'https://example.com/carousel-grid.png',
      },
      status: 'success',
      taskId: 'carousel-task-1',
    })
    vi.mocked(splitImageGridBuffer).mockResolvedValue([
      { buffer: Buffer.from('panel-1'), label: 'Top left', position: 1 },
      { buffer: Buffer.from('panel-2'), label: 'Top right', position: 2 },
      { buffer: Buffer.from('filler-3'), label: 'Bottom left', position: 3 },
      { buffer: Buffer.from('filler-4'), label: 'Bottom right', position: 4 },
    ])
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('carousel-grid', {
          headers: { 'Content-Type': 'image/png' },
          status: 200,
        }),
      ),
    )
    vi.mocked(saveGeneratedOutputBufferForVariant)
      .mockResolvedValueOnce({
        createdAt: '2026-04-09T00:00:05.000Z',
        fileSize: 123,
        id: 'output-p1',
        label: 'Panel 1',
        mimeType: 'image/png',
        originalName: 'carousel-task-1-panel-1.png',
        runId: 'run-carousel',
        storagePath: 'user-1/runs/run-carousel/outputs/carousel-task-1-panel-1.png',
        userId: 'user-1',
      })
      .mockResolvedValueOnce({
        createdAt: '2026-04-09T00:00:05.000Z',
        fileSize: 456,
        id: 'output-p2',
        label: 'Panel 2',
        mimeType: 'image/png',
        originalName: 'carousel-task-1-panel-2.png',
        runId: 'run-carousel',
        storagePath: 'user-1/runs/run-carousel/outputs/carousel-task-1-panel-2.png',
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
      runId: 'run-carousel',
      selectedVariantId: null,
      startedAt: 0,
      status: 'success',
      variants: [
        {
          completedAt: null,
          createdAt: '2026-04-09T00:00:00.000Z',
          error: null,
          index: 1,
          profile: 'Panel 1',
          prompt: 'Prompt 1',
          result: {
            model: 'nano-banana-2',
            taskId: 'carousel-task-1',
            type: 'image',
            url: '/api/media/output-p1',
            label: 'Panel 1',
          },
          status: 'success',
          taskId: 'carousel-task-1',
          variantId: 'variant-p1',
        },
        {
          completedAt: null,
          createdAt: '2026-04-09T00:00:00.000Z',
          error: null,
          index: 2,
          profile: 'Panel 2',
          prompt: 'Prompt 1',
          result: {
            model: 'nano-banana-2',
            taskId: 'carousel-task-1',
            type: 'image',
            url: '/api/media/output-p2',
            label: 'Panel 2',
          },
          status: 'success',
          taskId: 'carousel-task-1',
          variantId: 'variant-p2',
        },
      ],
      workspace: 'carousel',
    })

    const response = await GET(new Request('http://localhost/api/generation/runs/run-carousel'), {
      params: Promise.resolve({ runId: 'run-carousel' }),
    })

    expect(response.status).toBe(200)
    expect(getTaskStatus).toHaveBeenCalledTimes(1)
    expect(splitImageGridBuffer).toHaveBeenCalledWith(Buffer.from('carousel-grid'))
    expect(saveGeneratedOutputBufferForVariant).toHaveBeenCalledTimes(2)
    expect(saveGeneratedOutputBufferForVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'carousel-task-1-panel-1.png',
        label: 'Panel 1',
        variantId: 'variant-p1',
      }),
    )
    expect(saveGeneratedOutputBufferForVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'carousel-task-1-panel-2.png',
        label: 'Panel 2',
        variantId: 'variant-p2',
      }),
    )
    expect(saveGeneratedOutputForVariant).not.toHaveBeenCalled()

    const payload = await response.json()
    expect(payload.run.variants).toHaveLength(2)
    expect(payload.run.variants[0]?.result?.label).toBe('Panel 1')
    expect(payload.run.variants[1]?.result?.label).toBe('Panel 2')
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

  it('stores motion-control completions as mp4 outputs', async () => {
    vi.mocked(getGenerationRunBundle)
      .mockResolvedValueOnce({
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
              additionalInstructions: '',
              resolution: '1080p',
            },
            outputQuality: '1080p',
            productCategory: 'cosmetics',
            shotEnvironment: 'indoor',
            subjectMode: 'lifestyle',
            textPrompt: 'Prompt',
            videoAudio: 'no-audio',
            videoDuration: 'base',
            videoModel: 'veo-3.1',
          },
          createdAt: '2026-06-08T00:00:00.000Z',
          id: 'run-motion',
          model: 'kling-3.0/motion-control',
          promptSnapshot: 'Prompt snapshot',
          provider: 'market',
          status: 'rendering',
          userId: 'user-1',
          variants: [
            {
              completedAt: null,
              createdAt: '2026-06-08T00:00:00.000Z',
              error: null,
              id: 'variant-motion-1',
              profile: 'Profile 1',
              prompt: 'Prompt 1',
              resultAssetId: null,
              runId: 'run-motion',
              status: 'rendering',
              taskId: 'task-motion-1',
              variantIndex: 1,
            },
          ],
          workspace: 'motion-control',
        },
      })
      .mockResolvedValueOnce({
        outputs: [],
        run: {
          completedAt: '2026-06-08T00:00:05.000Z',
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
              additionalInstructions: '',
              resolution: '1080p',
            },
            outputQuality: '1080p',
            productCategory: 'cosmetics',
            shotEnvironment: 'indoor',
            subjectMode: 'lifestyle',
            textPrompt: 'Prompt',
            videoAudio: 'no-audio',
            videoDuration: 'base',
            videoModel: 'veo-3.1',
          },
          createdAt: '2026-06-08T00:00:00.000Z',
          id: 'run-motion',
          model: 'kling-3.0/motion-control',
          promptSnapshot: 'Prompt snapshot',
          provider: 'market',
          status: 'success',
          userId: 'user-1',
          variants: [],
          workspace: 'motion-control',
        },
      })
    vi.mocked(getTaskStatus).mockResolvedValue({
      error: null,
      result: {
        model: 'kling-3.0/motion-control',
        taskId: 'task-motion-1',
        type: 'video',
        url: 'https://example.com/output.mp4',
      },
      status: 'success',
      taskId: 'task-motion-1',
    })
    vi.mocked(saveGeneratedOutputForVariant).mockResolvedValue({
      createdAt: '2026-06-08T00:00:05.000Z',
      fileSize: 456,
      id: 'output-motion-1',
      label: 'Variation 1 Output',
      mimeType: 'video/mp4',
      originalName: 'task-motion-1.mp4',
      runId: 'run-motion',
      storagePath: 'user-1/runs/run-motion/outputs/task-motion-1.mp4',
      userId: 'user-1',
    })
    vi.mocked(syncGenerationRunStatus).mockResolvedValue(null)
    vi.mocked(createGenerationRunState).mockReturnValue({
      completedAt: '2026-06-08T00:00:05.000Z',
      createdAt: '2026-06-08T00:00:00.000Z',
      error: null,
      experience: 'manual',
      model: 'kling-3.0/motion-control',
      provider: 'market',
      runId: 'run-motion',
      selectedVariantId: null,
      startedAt: 0,
      status: 'success',
      variants: [],
      workspace: 'motion-control',
    })

    const response = await GET(
      new Request('http://localhost/api/generation/runs/run-motion'),
      {
        params: Promise.resolve({ runId: 'run-motion' }),
      },
    )

    expect(response.status).toBe(200)
    expect(saveGeneratedOutputForVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'task-motion-1.mp4',
        fileType: 'video/mp4',
        runId: 'run-motion',
        sourceUrl: 'https://example.com/output.mp4',
        variantId: 'variant-motion-1',
      }),
    )
  })
})

