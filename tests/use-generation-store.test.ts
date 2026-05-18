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

  it('trims staged manual video references when the selected model supports fewer inputs', () => {
    const store = useGenerationStore.getState()
    const ref1 = new File(['ref-1'], 'ref-1.png', { type: 'image/png' })
    const ref2 = new File(['ref-2'], 'ref-2.png', { type: 'image/png' })
    const ref3 = new File(['ref-3'], 'ref-3.png', { type: 'image/png' })

    expect(store.videoReferences.map((slot) => slot.label)).toEqual([
      'Reference 1',
      'Reference 2',
      'Reference 3',
    ])

    store.setVideoReferenceFile('video-reference-1', ref1)
    store.setVideoReferenceFile('video-reference-2', ref2)
    store.setVideoReferenceFile('video-reference-3', ref3)

    let state = useGenerationStore.getState()
    expect(state.videoReferences[0]?.file?.name).toBe('ref-1.png')
    expect(state.videoReferences[1]?.file?.name).toBe('ref-2.png')
    expect(state.videoReferences[2]?.file?.name).toBe('ref-3.png')

    store.setVideoModel('seedance-1.5-pro')
    state = useGenerationStore.getState()

    expect(state.videoReferences[0]?.file?.name).toBe('ref-1.png')
    expect(state.videoReferences[1]?.file?.name).toBe('ref-2.png')
    expect(state.videoReferences[2]?.file).toBeNull()

    const stagedPreview = state.videoReferences[0]?.previewUrl
    store.clearVideoReference('video-reference-1')
    state = useGenerationStore.getState()

    expect(revokeObjectURL).toHaveBeenCalledWith(stagedPreview)
    expect(state.videoReferences[0]?.file).toBeNull()
    expect(state.videoReferences[0]?.uploadStatus).toBe('idle')

    store.resetGenerationState()
    state = useGenerationStore.getState()
    expect(state.videoReferences.every((slot) => slot.file === null)).toBe(true)
  })

  it('forwards a manual image result into manual video staging with normalized settings', () => {
    const store = useGenerationStore.getState()
    const forwardedFile = new File(['manual-forward'], 'manual-forward.png', {
      type: 'image/png',
    })
    const staleRef = new File(['stale-ref'], 'stale-ref.png', {
      type: 'image/png',
    })

    store.setActiveTab('image')
    store.setExperience('manual')
    store.setOutputQuality('4k')
    store.setVideoReferenceFile('video-reference-2', staleRef)

    store.forwardManualImageResultToVideo(forwardedFile)

    const state = useGenerationStore.getState()

    expect(state.experience).toBe('manual')
    expect(state.activeTab).toBe('video')
    expect(state.outputQuality).toBe('1080p')
    expect(state.videoReferences[0]?.file?.name).toBe('manual-forward.png')
    expect(state.videoReferences[1]?.file).toBeNull()
    expect(state.videoReferences[2]?.file).toBeNull()
  })

  it('forwards a guided image result into guided video and clears the stale plan', () => {
    const store = useGenerationStore.getState()
    const heroFile = new File(['guided-forward'], 'guided-forward.png', {
      type: 'image/png',
    })
    const staleEndFrame = new File(['end'], 'end.png', { type: 'image/png' })

    store.setExperience('guided')
    store.setActiveTab('image')
    store.setGuidedEndFrameFile(staleEndFrame)
    store.setGuidedPlan({
      creativeStyle: 'ugc-lifestyle',
      productCategory: 'cosmetics',
      shots: [
        {
          prompt: 'Old prompt',
          shotEnvironment: 'indoor',
          slug: 'old-prompt',
          subjectMode: 'product-only',
          tags: [],
          title: 'Old Prompt',
        },
      ],
      summary: 'Old summary',
    })

    store.forwardGuidedImageResultToVideo(heroFile)

    const state = useGenerationStore.getState()

    expect(state.experience).toBe('guided')
    expect(state.activeTab).toBe('video')
    expect(state.guidedInput.heroAsset.file?.name).toBe('guided-forward.png')
    expect(state.guidedInput.endFrameAsset.file).toBeNull()
    expect(state.guidedPlan).toBeNull()
    expect(state.analysisStatus).toBe('idle')
    expect(state.analysisError).toBeNull()
  })

  it('hydrates config snapshots with missing defaults', () => {
    useGenerationStore.getState().hydrateProjectConfig({
      activeTab: 'image',
      batchSize: 1,
      cameraMovement: 'orbit',
      creativeStyle: 'ugc-lifestyle',
      experience: 'manual',
      guided: null,
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
    expect(state.experience).toBe('manual')
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

  it('surfaces submit-time generation errors before a run id exists', () => {
    const store = useGenerationStore.getState()

    store.resetGenerationRun()
    store.setGenerationError('Unable to start generation.')

    const state = useGenerationStore.getState()

    expect(state.generationRun.runId).toBeNull()
    expect(state.generationRun.status).toBe('error')
    expect(state.generationRun.error).toBe('Unable to start generation.')
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

  it('keeps guided state separate from the manual draft and resets it independently', () => {
    const store = useGenerationStore.getState()

    store.setTextPrompt('Manual draft prompt')
    store.setGuidedProductUrl('https://example.com/product')
    store.setGuidedShotCount(3)
    store.setGuidedPlan({
      creativeStyle: 'tv-commercial',
      productCategory: 'cosmetics',
      shots: [
        {
          prompt: 'Prompt 1',
          shotEnvironment: 'indoor',
          slug: 'shot-1',
          subjectMode: 'product-only',
          tags: ['hero'],
          title: 'Shot 1',
        },
      ],
      summary: 'Guided summary',
    })
    store.setExperience('guided')

    let state = useGenerationStore.getState()

    expect(state.textPrompt).toBe('Manual draft prompt')
    expect(state.guidedInput.productUrl).toBe('https://example.com/product')
    expect(state.guidedPlan?.summary).toBe('Guided summary')
    expect(state.experience).toBe('guided')

    store.resetGuidedState()
    state = useGenerationStore.getState()

    expect(state.textPrompt).toBe('Manual draft prompt')
    expect(state.guidedInput.productUrl).toBe('')
    expect(state.guidedPlan).toBeNull()
    expect(state.analysisStatus).toBe('idle')
  })

  it('keeps ideation state separate and resets it independently', () => {
    const store = useGenerationStore.getState()

    store.setTextPrompt('Manual draft prompt')
    store.setIdeationContentFormat('photos')
    store.setIdeationOutputLanguage('id')
    store.setIdeationProductUrl('https://example.com/product')
    store.setIdeationBriefText('Creator-first acne serum campaign.')
    store.setIdeationResult({
      concepts: [
        {
          angle: 'Angle 1',
          audience: 'Audience 1',
          cta: 'CTA 1',
          hook: 'Hook 1',
          keyMessage: 'Message 1',
          title: 'Concept 1',
          visualDirection: 'Visual 1',
        },
        {
          angle: 'Angle 2',
          audience: 'Audience 2',
          cta: 'CTA 2',
          hook: 'Hook 2',
          keyMessage: 'Message 2',
          title: 'Concept 2',
          visualDirection: 'Visual 2',
        },
        {
          angle: 'Angle 3',
          audience: 'Audience 3',
          cta: 'CTA 3',
          hook: 'Hook 3',
          keyMessage: 'Message 3',
          title: 'Concept 3',
          visualDirection: 'Visual 3',
        },
      ],
      summary: 'Three ideation concepts.',
    })
    store.setExperience('ideation')

    let state = useGenerationStore.getState()

    expect(state.textPrompt).toBe('Manual draft prompt')
    expect(state.ideationInput.contentFormat).toBe('photos')
    expect(state.ideationInput.outputLanguage).toBe('id')
    expect(state.ideationInput.productUrl).toBe('https://example.com/product')
    expect(state.ideationResult?.summary).toBe('Three ideation concepts.')
    expect(state.experience).toBe('ideation')

    store.resetIdeationState()
    state = useGenerationStore.getState()

    expect(state.textPrompt).toBe('Manual draft prompt')
    expect(state.ideationInput.contentFormat).toBe('video')
    expect(state.ideationInput.productUrl).toBe('')
    expect(state.ideationInput.briefText).toBe('')
    expect(state.ideationInput.outputLanguage).toBe('en')
    expect(state.ideationResult).toBeNull()
    expect(state.ideationStatus).toBe('idle')
  })

  it('routes ideation failures through the shared error modal state', () => {
    const store = useGenerationStore.getState()

    store.resetGenerationRun()
    store.setIdeationFailure('Unable to generate the ideation brief.')

    const state = useGenerationStore.getState()

    expect(state.ideationStatus).toBe('error')
    expect(state.ideationError).toBe('Unable to generate the ideation brief.')
    expect(state.generationErrorEventId).toBe(1)
    expect(state.generationRun.status).toBe('error')
    expect(state.generationRun.error).toBe('Unable to generate the ideation brief.')
  })
})
