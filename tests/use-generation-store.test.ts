import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useGenerationStore } from '../store/use-generation-store'
import type { GenerationVariant } from '../lib/generation/types'

function makeVariant(
  overrides: Partial<GenerationVariant>,
): GenerationVariant {
  return {
    completedAt: null,
    createdAt: null,
    error: null,
    index: 1,
    profile: 'Keep the strongest composition closest to the base brief.',
    prompt: 'Prompt',
    result: null,
    status: 'rendering',
    taskId: null,
    variantId: 'variant-1',
    ...overrides,
  }
}

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

  it('starts with the preset defaults and resets lifestyle-only fields', () => {
    const store = useGenerationStore.getState()

    expect(store.shotEnvironment).toBe('indoor')
    expect(store.characterGender).toBe('any')
    expect(store.characterAgeGroup).toBe('any')
    expect(store.figureArtDirection).toBe('none')

    store.setCharacterGender('female')
    store.setCharacterAgeGroup('young-adult')
    store.setFigureArtDirection('curvaceous-editorial')
    store.setSubjectMode('product-only')

    const state = useGenerationStore.getState()

    expect(state.subjectMode).toBe('product-only')
    expect(state.characterGender).toBe('any')
    expect(state.characterAgeGroup).toBe('any')
    expect(state.figureArtDirection).toBe('none')
  })

  it('hydrates config snapshots with missing defaults', () => {
    useGenerationStore.getState().hydrateProjectConfig({
      activeTab: 'image',
      batchSize: 1,
      cameraMovement: 'orbit',
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      subjectMode: 'lifestyle',
      textPrompt: 'Legacy snapshot',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
    } as never)

    const state = useGenerationStore.getState()

    expect(state.shotEnvironment).toBe('indoor')
    expect(state.characterGender).toBe('any')
    expect(state.characterAgeGroup).toBe('any')
    expect(state.figureArtDirection).toBe('none')
  })

  it('tracks partial success and keeps selection on a saved variant', () => {
    const store = useGenerationStore.getState()

    store.updateGenerationRun({
      model: 'kling-2.6/text-to-video',
      provider: 'market',
      runId: 'run-1',
      startedAt: 123,
      workspace: 'video',
    })
    store.setGenerationVariants([
      makeVariant({
        index: 1,
        prompt: 'Prompt 1',
        taskId: 'task-1',
        variantId: 'variant-1',
      }),
      makeVariant({
        index: 2,
        prompt: 'Prompt 2',
        taskId: 'task-2',
        variantId: 'variant-2',
      }),
    ])

    let state = useGenerationStore.getState()

    expect(state.generationRun.status).toBe('rendering')

    store.setGenerationVariants([
      makeVariant({
        index: 1,
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
      }),
      makeVariant({
        error: 'Provider rejected task 2.',
        index: 2,
        prompt: 'Prompt 2',
        status: 'error',
        taskId: 'task-2',
        variantId: 'variant-2',
      }),
    ])
    state = useGenerationStore.getState()

    expect(state.generationRun.status).toBe('partial-success')
    expect(state.generationRun.selectedVariantId).toBe('variant-1')
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
      workspace: 'image',
    })
    store.setGenerationVariants([
      makeVariant({
        error: 'First variation failed.',
        index: 1,
        status: 'error',
        variantId: 'variant-1',
      }),
      makeVariant({
        error: 'Second variation failed.',
        index: 2,
        status: 'error',
        variantId: 'variant-2',
      }),
    ])

    const state = useGenerationStore.getState()

    expect(state.generationRun.status).toBe('error')
    expect(state.generationRun.error).toBe('First variation failed.')
    expect(state.sessionStats.failedVariants).toBe(2)
  })

  it('preserves session counters when the local draft resets', () => {
    const store = useGenerationStore.getState()

    store.updateGenerationRun({
      model: 'google/nano-banana',
      provider: 'market',
      runId: 'run-3',
      startedAt: 789,
      workspace: 'image',
    })
    store.setGenerationVariants([
      makeVariant({
        error: 'Immediate submit failure.',
        index: 1,
        status: 'error',
        variantId: 'variant-1',
      }),
    ])

    store.resetGenerationState()

    const state = useGenerationStore.getState()

    expect(state.sessionStats.failedVariants).toBe(1)
    expect(state.sessionStats.completedVariants).toBe(0)
    expect(state.generationRun.status).toBe('idle')
  })
})
