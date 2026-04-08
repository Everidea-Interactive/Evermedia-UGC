import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useGenerationStore } from '../store/use-generation-store'

describe('useGenerationStore', () => {
  const createObjectURL = vi.fn()
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    createObjectURL.mockImplementation(
      (file: File) => `blob:${file.name}-${createObjectURL.mock.calls.length + 1}`,
    )
    revokeObjectURL.mockImplementation(() => undefined)

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    useGenerationStore.getState().disposeGenerationState()
  })

  afterEach(() => {
    useGenerationStore.getState().disposeGenerationState()
    createObjectURL.mockReset()
    revokeObjectURL.mockReset()
    vi.unstubAllGlobals()
  })

  it('stores file-backed asset previews and clears them cleanly', () => {
    const faceFile = new File(['face'], 'face.png', { type: 'image/png' })
    const replacementFile = new File(['face-2'], 'face-2.png', {
      type: 'image/png',
    })

    useGenerationStore.getState().setNamedAssetFile('face1', faceFile)

    let state = useGenerationStore.getState()

    expect(state.assets.face1.file?.name).toBe('face.png')
    expect(state.assets.face1.mimeType).toBe('image/png')
    expect(state.assets.face1.uploadStatus).toBe('staged')
    expect(state.assets.face1.previewUrl).toMatch(/^blob:face\.png-/)
    const firstPreviewUrl = state.assets.face1.previewUrl

    useGenerationStore.getState().setNamedAssetFile('face1', replacementFile)
    state = useGenerationStore.getState()

    expect(revokeObjectURL).toHaveBeenCalledWith(firstPreviewUrl)
    expect(state.assets.face1.file?.name).toBe('face-2.png')
    expect(state.assets.face1.previewUrl).toMatch(/^blob:face-2\.png-/)
    const secondPreviewUrl = state.assets.face1.previewUrl

    useGenerationStore.getState().clearNamedAsset('face1')
    state = useGenerationStore.getState()

    expect(revokeObjectURL).toHaveBeenCalledWith(secondPreviewUrl)
    expect(state.assets.face1.file).toBeNull()
    expect(state.assets.face1.previewUrl).toBeNull()
    expect(state.assets.face1.uploadStatus).toBe('idle')
  })

  it('tracks grouped variant selection and partial-success resolution', () => {
    const store = useGenerationStore.getState()

    store.setImageModel('grok-imagine')
    store.setVideoModel('kling')
    store.updateGenerationRun({
      model: 'kling-2.6/text-to-video',
      provider: 'market',
      runId: 'run-1',
      startedAt: 123,
      uploadedAssets: [],
      workspace: 'video',
    })
    store.setGenerationVariants([
      {
        error: null,
        index: 1,
        profile: 'Keep the strongest hero composition closest to the base brief.',
        prompt: 'Prompt 1',
        result: null,
        status: 'rendering',
        taskId: 'task-1',
        variantId: 'variant-1',
      },
      {
        error: null,
        index: 2,
        profile:
          'Explore an alternate framing and composition while preserving brand intent and subject identity.',
        prompt: 'Prompt 2',
        result: null,
        status: 'rendering',
        taskId: 'task-2',
        variantId: 'variant-2',
      },
    ])

    let state = useGenerationStore.getState()

    expect(state.imageModel).toBe('grok-imagine')
    expect(state.videoModel).toBe('kling')
    expect(state.generationRun.status).toBe('rendering')

    store.setGenerationVariants([
      {
        error: null,
        index: 1,
        profile: 'Keep the strongest hero composition closest to the base brief.',
        prompt: 'Prompt 1',
        result: {
          model: 'kling-2.6/text-to-video',
          taskId: 'task-1',
          type: 'video',
          url: 'https://example.com/video.mp4',
        },
        status: 'success',
        taskId: 'task-1',
        variantId: 'variant-1',
      },
      {
        error: 'Provider rejected task 2.',
        index: 2,
        profile:
          'Explore an alternate framing and composition while preserving brand intent and subject identity.',
        prompt: 'Prompt 2',
        result: null,
        status: 'error',
        taskId: 'task-2',
        variantId: 'variant-2',
      },
    ])
    state = useGenerationStore.getState()

    expect(state.generationRun.status).toBe('partial-success')
    expect(state.generationRun.selectedVariantId).toBe('variant-1')
    expect(state.sessionStats.completedVariants).toBe(1)
    expect(state.sessionStats.failedVariants).toBe(1)

    store.setGenerationVariants(state.generationRun.variants)
    state = useGenerationStore.getState()

    expect(state.sessionStats.completedVariants).toBe(1)
    expect(state.sessionStats.failedVariants).toBe(1)

    store.selectGenerationVariant('variant-2')
    state = useGenerationStore.getState()

    expect(state.generationRun.selectedVariantId).toBe('variant-1')
  })

  it('resolves all-error grouped runs as error state', () => {
    const store = useGenerationStore.getState()

    store.updateGenerationRun({
      model: 'google/nano-banana',
      provider: 'market',
      runId: 'run-2',
      startedAt: 456,
      uploadedAssets: [],
      workspace: 'image',
    })
    store.setGenerationVariants([
      {
        error: 'First variation failed.',
        index: 1,
        profile: 'Keep the strongest hero composition closest to the base brief.',
        prompt: 'Prompt 1',
        result: null,
        status: 'error',
        taskId: null,
        variantId: 'variant-1',
      },
      {
        error: 'Second variation failed.',
        index: 2,
        profile:
          'Explore an alternate framing and composition while preserving brand intent and subject identity.',
        prompt: 'Prompt 2',
        result: null,
        status: 'error',
        taskId: null,
        variantId: 'variant-2',
      },
    ])

    const state = useGenerationStore.getState()

    expect(state.generationRun.status).toBe('error')
    expect(state.generationRun.error).toBe('First variation failed.')
    expect(state.sessionStats.failedVariants).toBe(2)
  })

  it('preserves session counters when the board resets', () => {
    const store = useGenerationStore.getState()

    store.updateGenerationRun({
      model: 'google/nano-banana',
      provider: 'market',
      runId: 'run-3',
      startedAt: 789,
      uploadedAssets: [],
      workspace: 'image',
    })
    store.setGenerationVariants([
      {
        error: 'Immediate submit failure.',
        index: 1,
        profile: 'Keep the strongest hero composition closest to the base brief.',
        prompt: 'Prompt 1',
        result: null,
        status: 'error',
        taskId: null,
        variantId: 'variant-1',
      },
    ])

    store.resetGenerationState()

    const state = useGenerationStore.getState()

    expect(state.sessionStats.failedVariants).toBe(1)
    expect(state.sessionStats.completedVariants).toBe(0)
    expect(state.generationRun.status).toBe('idle')
  })
})
