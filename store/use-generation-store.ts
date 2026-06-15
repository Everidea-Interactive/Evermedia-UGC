'use client'

import { create } from 'zustand'

import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CarouselBaseTemplateMode,
  CarouselDraft,
  CarouselPanelDraft,
  CharacterAgeGroup,
  CharacterGender,
  ContentConcept,
  CreativeBrief,
  CreativePlan,
  CreativePlanningStatus,
  ContentFormat,
  CreativeStyle,
  FigureArtDirection,
  GenerationExperience,
  GuidedAnalysisPlan,
  GuidedAnalysisStatus,
  GenerationRun,
  GenerationRunStatus,
  GenerationSessionStats,
  GenerationVariant,
  ImageModelOption,
  IdeationResult,
  KieAnalysisModel,
  MotionControlDraft,
  MediaKind,
  MotionControlResolution,
  NamedAssetKey,
  NamedAssetSlots,
  OutputQuality,
  PromptEnhancement,
  ProductCategory,
  ShotEnvironment,
  StoryboardShot,
  SubjectMode,
  VideoAudio,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import type { Locale } from '@/lib/i18n'
import {
  getMaxVideoReferenceCount,
  supportsVideoEndFrameGuidance,
  supportsVideoFirstLastFramePair,
} from '@/lib/generation/model-mapping'
import { isConvertibleUploadImage } from '@/lib/generation/image-upload-support'
import type { ProjectConfigSnapshot } from '@/lib/persistence/types'
import { normalizeProjectConfigSnapshot } from '@/lib/persistence/serialization'
import { createInitialPromptEnhancement } from '@/lib/generation/prompt-enhancements'

type GuidedInputState = {
  analysisModel: KieAnalysisModel
  contentConcept: ContentConcept
  endFrameAsset: AssetSlot
  heroAsset: AssetSlot
  productUrl: string
  shotCount: BatchSize
}

type CreativeBriefField = keyof CreativeBrief
type IdeationInputState = {
  analysisModel: KieAnalysisModel
  briefText: string
  contentConcept: ContentConcept
  contentFormat: ContentFormat
  heroAsset: AssetSlot
  outputLanguage: Locale
  productUrl: string
}

type GenerationStateShape = {
  activeTab: WorkspaceTab
  analysisError: string | null
  analysisStatus: GuidedAnalysisStatus
  assets: NamedAssetSlots
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  carouselDraft: CarouselDraft
  carouselStageEventId: number
  characterAgeGroup: CharacterAgeGroup
  creativeBrief: CreativeBrief
  creativePlan: CreativePlan | null
  creativePlanningError: string | null
  creativePlanningStatus: CreativePlanningStatus
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  experience: GenerationExperience
  figureArtDirection: FigureArtDirection
  generationRun: GenerationRun
  generationErrorEventId: number
  guidedVideoStageEventId: number
  guidedInput: GuidedInputState
  guidedPlan: GuidedAnalysisPlan | null
  ideationError: string | null
  ideationInput: IdeationInputState
  ideationResult: IdeationResult | null
  ideationStatus: GuidedAnalysisStatus
  imageModel: ImageModelOption
  motionControl: MotionControlDraft
  outputQuality: OutputQuality
  promptEnhancement: PromptEnhancement
  productCategory: ProductCategory
  products: AssetSlot[]
  manualVideoStageEventId: number
  sessionStats: GenerationSessionStats
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoReferences: AssetSlot[]
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}

type GenerationStore = GenerationStateShape & {
  addCarouselPanel: () => void
  clearNamedAsset: (slot: NamedAssetKey) => void
  setCarouselBaseTemplateMode: (mode: CarouselBaseTemplateMode) => void
  setCarouselBaseTemplatePrompt: (prompt: string) => void
  setCarouselBaseTemplateAsset: (file: File | null) => void
  clearGuidedEndFrameAsset: () => void
  clearGuidedHeroAsset: () => void
  clearIdeationHeroAsset: () => void
  clearMotionControlMotionVideo: () => void
  clearMotionControlReferenceImage: () => void
  clearProductSlot: (id: string) => void
  clearVideoReference: (id: string) => void
  deleteCarouselPanel: (panelId: string) => void
  disposeGenerationState: () => void
  forwardGuidedImageResultToVideo: (file: File) => void
  forwardManualImageResultToCarousel: (file: File) => void
  forwardManualImageResultToVideo: (file: File) => void
  moveCarouselPanel: (panelId: string, direction: 'up' | 'down') => void
  updateCarouselDraft: (patch: Partial<CarouselDraft>) => void
  updateCarouselPanel: (panelId: string, patch: Partial<CarouselPanelDraft>) => void
  hydrateGenerationRun: (run: GenerationRun | null) => void
  hydrateProjectConfig: (configSnapshot: ProjectConfigSnapshot) => void
  resetGenerationRun: () => void
  resetGenerationState: () => void
  resetGuidedState: () => void
  resetIdeationState: () => void
  selectGenerationVariant: (variantId: string | null) => void
  setActiveTab: (activeTab: WorkspaceTab) => void
  setAnalysisError: (error: string | null) => void
  setAnalysisStatus: (status: GuidedAnalysisStatus) => void
  setBatchSize: (batchSize: BatchSize) => void
  setCameraMovement: (cameraMovement: CameraMovement | null) => void
  setCharacterAgeGroup: (characterAgeGroup: CharacterAgeGroup) => void
  setCharacterGender: (characterGender: CharacterGender) => void
  setCreativePlan: (plan: CreativePlan | null) => void
  setCreativePlanningError: (error: string | null) => void
  setCreativePlanningStatus: (status: CreativePlanningStatus) => void
  setCreativeBriefField: <Key extends CreativeBriefField>(
    key: Key,
    value: CreativeBrief[Key],
  ) => void
  setCreativeStyle: (creativeStyle: CreativeStyle) => void
  setExperience: (experience: GenerationExperience) => void
  setFigureArtDirection: (figureArtDirection: FigureArtDirection) => void
  setGenerationError: (error: string) => void
  setGenerationVariants: (variants: GenerationVariant[]) => void
  setGuidedAnalysisModel: (model: KieAnalysisModel) => void
  setGuidedContentConcept: (concept: ContentConcept) => void
  setGuidedEndFrameFile: (file: File | null) => void
  setGuidedHeroFile: (file: File | null) => void
  setGuidedPlan: (plan: GuidedAnalysisPlan | null) => void
  setGuidedProductUrl: (productUrl: string) => void
  setGuidedShotCount: (shotCount: BatchSize) => void
  setIdeationAnalysisModel: (model: KieAnalysisModel) => void
  setIdeationBriefText: (briefText: string) => void
  setIdeationContentConcept: (concept: ContentConcept) => void
  setIdeationContentFormat: (contentFormat: ContentFormat) => void
  setIdeationError: (error: string | null) => void
  setIdeationFailure: (error: string) => void
  setIdeationHeroFile: (file: File | null) => void
  setIdeationOutputLanguage: (outputLanguage: Locale) => void
  setIdeationProductUrl: (productUrl: string) => void
  setIdeationResult: (result: IdeationResult | null) => void
  setIdeationStatus: (status: GuidedAnalysisStatus) => void
  setImageModel: (imageModel: ImageModelOption) => void
  setMotionControlAdditionalInstructions: (value: string) => void
  setMotionControlMotionVideoFile: (file: File | null) => void
  setMotionControlMotionVideoDuration: (value: number | null) => void
  setMotionControlReferenceImageFile: (file: File | null) => void
  setMotionControlResolution: (value: MotionControlResolution) => void
  setNamedAssetFile: (slot: NamedAssetKey, file: File | null) => void
  setOutputQuality: (outputQuality: OutputQuality) => void
  setPromptEnhancement: (patch: Partial<PromptEnhancement>) => void
  setProductCategory: (productCategory: ProductCategory) => void
  setProductSlotFile: (id: string, file: File | null) => void
  setShotEnvironment: (shotEnvironment: ShotEnvironment) => void
  setSubjectMode: (subjectMode: SubjectMode) => void
  setTextPrompt: (textPrompt: string) => void
  setVideoReferenceFile: (id: string, file: File | null) => void
  setVideoAudio: (videoAudio: VideoAudio) => void
  setVideoDuration: (videoDuration: VideoDuration) => void
  setVideoModel: (videoModel: VideoModelOption) => void
  selectCreativePlanCta: (ctaId: string) => void
  updateStoryboardShot: (
    slug: string,
    patch: Partial<StoryboardShot>,
  ) => void
  updateGuidedShotPrompt: (slug: string, prompt: string) => void
  updateGenerationRun: (patch: Partial<GenerationRun>) => void
  updateGenerationVariant: (variantId: string, patch: Partial<GenerationVariant>) => void
}

const fixedProductSlotCount = 2
const fixedVideoReferenceCount = 3

function buildProductLabel(position: number) {
  return `Product ${position}`
}

function revokePreviewUrl(previewUrl: string | null) {
  if (!previewUrl?.startsWith('blob:') || typeof URL === 'undefined') {
    return
  }

  URL.revokeObjectURL(previewUrl)
}

function createPreviewUrl(file: File | null) {
  if (
    !file ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return null
  }

  return URL.createObjectURL(file)
}

function createSlot(id: string, label: string): AssetSlot {
  return {
    durationSeconds: null,
    error: null,
    file: null,
    id,
    label,
    mimeType: null,
    previewUrl: null,
    size: null,
    uploadStatus: 'idle',
  }
}

function createEmptyCarouselPanel(order: number): CarouselPanelDraft {
  return {
    id: crypto.randomUUID(),
    order,
    templateMode: 'inherit',
    templatePrompt: '',
    imageMode: 'manual',
    imagePrompt: '',
    imageAsset: null,
    textMode: 'manual',
    textPrompt: '',
    textValue: '',
  }
}

function createInitialCarouselDraft(): CarouselDraft {
  return {
    baseTemplateMode: 'manual',
    baseTemplatePrompt: '',
    baseTemplateAsset: null,
    panels: [createEmptyCarouselPanel(1)],
  }
}

function createProductSlots() {
  return Array.from({ length: fixedProductSlotCount }, (_, index) =>
    createSlot(`product-${index + 1}`, buildProductLabel(index + 1)),
  )
}

function createVideoReferenceSlots() {
  return Array.from({ length: fixedVideoReferenceCount }, (_, index) =>
    createSlot(`video-reference-${index + 1}`, `Reference ${index + 1}`),
  )
}

function createGuidedInputState(): GuidedInputState {
  return {
    analysisModel: 'gemini-2.5-flash',
    contentConcept: 'affiliate',
    endFrameAsset: createSlot('guided-end-frame', 'End Frame'),
    heroAsset: createSlot('guided-hero', 'Hero Product'),
    productUrl: '',
    shotCount: 1,
  }
}

function createCreativeBrief(): CreativeBrief {
  return {
    audience: 'broad',
    goal: 'conversion',
    platform: 'tiktok',
    productHighlights: '',
    tone: '',
  }
}

function createIdeationInputState(): IdeationInputState {
  return {
    analysisModel: 'gemini-2.5-flash',
    briefText: '',
    contentConcept: 'affiliate',
    contentFormat: 'video',
    heroAsset: createSlot('ideation-hero', 'Hero Product'),
    outputLanguage: 'en',
    productUrl: '',
  }
}

function createMotionControlDraft(): MotionControlDraft {
  return {
    additionalInstructions: '',
    motionVideo: createSlot('motion-control-video', 'Motion Reference Video'),
    referenceImage: createSlot('motion-control-image', 'Reference Image'),
    resolution: '1080p',
  }
}

function createEmptyRunState(): GenerationRun {
  return {
    completedAt: null,
    createdAt: null,
    error: null,
    experience: 'manual',
    model: null,
    provider: null,
    runId: null,
    selectedVariantId: null,
    startedAt: null,
    status: 'idle',
    variants: [],
    workspace: null,
  }
}

function createEmptySessionStats(): GenerationSessionStats {
  return {
    completedVariants: 0,
    failedVariants: 0,
  }
}

function createLifestyleDefaults() {
  return {
    characterAgeGroup: 'any' as const,
    characterGender: 'any' as const,
    figureArtDirection: 'none' as const,
  }
}

function createSubjectModeState(subjectMode: SubjectMode) {
  return subjectMode === 'lifestyle'
    ? {
        subjectMode,
      }
    : {
        subjectMode,
        ...createLifestyleDefaults(),
    }
}

function composeStoryboardRenderPrompt(shot: StoryboardShot) {
  const escapedVoiceover = shot.voiceoverLine.replace(/"/g, '\\"').trim()
  const escapedCta = shot.ctaText.replace(/"/g, '\\"').trim()
  const segments = [
    shot.visualPrompt,
    shot.environmentPrompt,
    escapedVoiceover
      ? `Include clear spoken voiceover that says exactly: "${escapedVoiceover}".`
      : '',
    shot.soundPrompt,
    escapedCta
      ? `End with a spoken CTA that says exactly: "${escapedCta}".`
      : '',
    escapedCta
      ? `If any readable on-screen CTA text appears, it must be exactly "${escapedCta}" in Latin letters only. Do not translate or replace it.`
      : 'Do not show subtitles, captions, or any readable on-screen text.',
    'Avoid foreign-language characters, translated captions, extra UI text, logos, or watermarks.',
  ]

  return segments
    .filter((segment) => segment.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function createInitialState(): GenerationStateShape {
  return {
    activeTab: 'image',
    analysisError: null,
    analysisStatus: 'idle',
    assets: {
      brandLogo: createSlot('brandLogo', 'Brand Logo'),
      clothing: createSlot('clothing', 'Clothing'),
      endFrame: createSlot('endFrame', 'End Frame'),
      firstFrame: createSlot('firstFrame', 'First Frame'),
      face1: createSlot('face1', 'Face 1'),
      face2: createSlot('face2', 'Face 2'),
      location: createSlot('location', 'Location'),
    },
    batchSize: 1,
    cameraMovement: 'orbit',
    carouselDraft: createInitialCarouselDraft(),
    carouselStageEventId: 0,
    characterAgeGroup: 'any',
    characterGender: 'any',
    creativeBrief: createCreativeBrief(),
    creativePlan: null,
    creativePlanningError: null,
    creativePlanningStatus: 'idle',
    creativeStyle: 'ugc-lifestyle',
    experience: 'manual',
    figureArtDirection: 'none',
    generationRun: createEmptyRunState(),
    generationErrorEventId: 0,
    guidedVideoStageEventId: 0,
    guidedInput: createGuidedInputState(),
    guidedPlan: null,
    ideationError: null,
    ideationInput: createIdeationInputState(),
    ideationResult: null,
    ideationStatus: 'idle',
    imageModel: 'nano-banana',
    motionControl: createMotionControlDraft(),
    outputQuality: '1080p',
    promptEnhancement: createInitialPromptEnhancement(),
    productCategory: 'cosmetics',
    products: createProductSlots(),
    manualVideoStageEventId: 0,
    sessionStats: createEmptySessionStats(),
    shotEnvironment: 'indoor',
    subjectMode: 'lifestyle',
    textPrompt: '',
    videoReferences: createVideoReferenceSlots(),
    videoAudio: 'no-audio',
    videoDuration: 'base',
    videoModel: 'veo-3.1',
  }
}

function releaseSlots(slots: AssetSlot[]) {
  for (const slot of slots) {
    revokePreviewUrl(slot.previewUrl)
  }
}

function releaseGuidedInput(input: GuidedInputState) {
  revokePreviewUrl(input.heroAsset.previewUrl)
  revokePreviewUrl(input.endFrameAsset.previewUrl)
}

function releaseIdeationInput(input: IdeationInputState) {
  revokePreviewUrl(input.heroAsset.previewUrl)
}

function releaseMotionControlDraft(input: MotionControlDraft) {
  revokePreviewUrl(input.referenceImage.previewUrl)
  revokePreviewUrl(input.motionVideo.previewUrl)
}

function setSlotFile(slot: AssetSlot, file: File | null): AssetSlot {
  const previewUrl = createPreviewUrl(file)

  if (previewUrl !== slot.previewUrl) {
    revokePreviewUrl(slot.previewUrl)
  }

  return {
    ...slot,
    durationSeconds: null,
    error: null,
    file,
    mimeType: file ? file.type || (isConvertibleUploadImage(file) ? 'image/*' : null) : null,
    previewUrl,
    size: file?.size ?? null,
    uploadStatus: file ? 'staged' : 'idle',
  }
}

function normalizeActiveTabForExperience(
  activeTab: WorkspaceTab,
  experience: GenerationExperience,
): WorkspaceTab {
  if (experience === 'guided' && activeTab === 'motion-control') {
    return 'image'
  }

  return activeTab
}

function fileMatchesMediaKind(file: File, kind: MediaKind) {
  if (kind === 'image' && isConvertibleUploadImage(file)) {
    return true
  }

  return file.type.startsWith(`${kind}/`)
}

function getMediaKindError(kind: MediaKind) {
  return kind === 'image'
    ? 'Please upload an image file.'
    : 'Please upload a video file.'
}

function setValidatedSlotFile(
  slot: AssetSlot,
  file: File | null,
  kind: MediaKind,
): AssetSlot {
  if (!file) {
    return setSlotFile(slot, file)
  }

  if (fileMatchesMediaKind(file, kind)) {
    return setSlotFile(slot, file)
  }

  return {
    ...slot,
    error: getMediaKindError(kind),
  }
}

function trimVideoReferenceSlots(
  slots: AssetSlot[],
  videoModel: VideoModelOption,
) {
  const maxReferenceCount = getMaxVideoReferenceCount(videoModel)

  return slots.map((slot, index) =>
    index < maxReferenceCount ? slot : setSlotFile(slot, null),
  )
}

function resolveRunStatus(variants: GenerationVariant[]): GenerationRunStatus {
  if (variants.length === 0) {
    return 'idle'
  }

  if (variants.some((variant) => variant.status === 'rendering')) {
    return 'rendering'
  }

  const successCount = variants.filter((variant) => variant.status === 'success').length
  const errorCount = variants.filter((variant) => variant.status === 'error').length
  const cancelledCount = variants.filter(
    (variant) => variant.status === 'cancelled',
  ).length

  if (successCount === variants.length) {
    return 'success'
  }

  if (errorCount === variants.length) {
    return 'error'
  }

  if (cancelledCount === variants.length) {
    return 'cancelled'
  }

  return 'partial-success'
}

function getSelectedVariantId(
  variants: GenerationVariant[],
  selectedVariantId: string | null,
) {
  const selectedVariant = variants.find(
    (variant) => variant.variantId === selectedVariantId,
  )

  if (selectedVariant?.status === 'success' && selectedVariant.result) {
    return selectedVariant.variantId
  }

  return (
    variants.find((variant) => variant.status === 'success' && variant.result)?.variantId ??
    null
  )
}

function createSessionStats(variants: GenerationVariant[]): GenerationSessionStats {
  return {
    completedVariants: variants.filter((variant) => variant.status === 'success').length,
    failedVariants: variants.filter((variant) => variant.status === 'error').length,
  }
}

function syncGenerationRun(run: GenerationRun, variants: GenerationVariant[]): GenerationRun {
  const status = resolveRunStatus(variants)

  return {
    ...run,
    error:
      status === 'error'
        ? variants.find((variant) => variant.error)?.error ?? run.error
        : null,
    selectedVariantId: getSelectedVariantId(variants, run.selectedVariantId),
    status,
    variants,
  }
}

function createAssetSlotFromFile(file: File): AssetSlot {
  return {
    durationSeconds: null,
    error: null,
    file,
    id: crypto.randomUUID(),
    label: file.name,
    mimeType: file.type || (isConvertibleUploadImage(file) ? 'image/*' : null),
    previewUrl: createPreviewUrl(file),
    size: file.size,
    uploadStatus: 'staged',
  }
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  ...createInitialState(),
  addCarouselPanel: () =>
    set((state) => ({
      carouselDraft: {
        ...state.carouselDraft,
        panels: [
          ...state.carouselDraft.panels,
          createEmptyCarouselPanel(state.carouselDraft.panels.length + 1),
        ],
      },
    })),
  deleteCarouselPanel: (panelId) =>
    set((state) => {
      const nextPanels = state.carouselDraft.panels
        .filter((panel) => panel.id !== panelId)
        .map((panel, index) => ({ ...panel, order: index + 1 }))

      return {
        carouselDraft: {
          ...state.carouselDraft,
          panels: nextPanels.length > 0 ? nextPanels : [createEmptyCarouselPanel(1)],
        },
      }
    }),
  moveCarouselPanel: (panelId, direction) =>
    set((state) => {
      const panels = [...state.carouselDraft.panels]
      const index = panels.findIndex((p) => p.id === panelId)
      if (index === -1) return state

      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= panels.length) return state

      const [movedPanel] = panels.splice(index, 1)
      panels.splice(swapIndex, 0, movedPanel)

      return {
        carouselDraft: {
          ...state.carouselDraft,
          panels: panels.map((p, i) => ({ ...p, order: i + 1 })),
        },
      }
    }),
  updateCarouselPanel: (panelId, patch) =>
    set((state) => ({
      carouselDraft: {
        ...state.carouselDraft,
        panels: state.carouselDraft.panels.map((panel) =>
          panel.id === panelId ? { ...panel, ...patch } : panel,
        ),
      },
    })),
  updateCarouselDraft: (patch) =>
    set((state) => ({
      carouselDraft: {
        ...state.carouselDraft,
        ...patch,
      },
    })),
  clearNamedAsset: (slot) =>
    set((state) => ({
      assets: {
        ...state.assets,
        ...(slot === 'firstFrame'
          ? { endFrame: setSlotFile(state.assets.endFrame, null) }
          : null),
        [slot]: setSlotFile(state.assets[slot], null),
      },
    })),
  clearGuidedEndFrameAsset: () =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        endFrameAsset: setSlotFile(state.guidedInput.endFrameAsset, null),
      },
    })),
  clearGuidedHeroAsset: () =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        heroAsset: setSlotFile(state.guidedInput.heroAsset, null),
      },
    })),
  clearIdeationHeroAsset: () =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        heroAsset: setSlotFile(state.ideationInput.heroAsset, null),
      },
    })),
  clearMotionControlMotionVideo: () =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        motionVideo: setSlotFile(state.motionControl.motionVideo, null),
      },
    })),
  clearMotionControlReferenceImage: () =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        referenceImage: setSlotFile(state.motionControl.referenceImage, null),
      },
    })),
  clearProductSlot: (id) =>
    set((state) => ({
      products: state.products.map((slot) =>
        slot.id === id ? setSlotFile(slot, null) : slot,
      ),
    })),
  clearVideoReference: (id) =>
    set((state) => ({
      videoReferences: state.videoReferences.map((slot) =>
        slot.id === id ? setSlotFile(slot, null) : slot,
      ),
    })),
  disposeGenerationState: () => {
    const state = get()

    releaseSlots(Object.values(state.assets))
    releaseSlots(state.products)
    releaseSlots(state.videoReferences)
    releaseGuidedInput(state.guidedInput)
    releaseIdeationInput(state.ideationInput)
    releaseMotionControlDraft(state.motionControl)

    set(createInitialState())
  },
  forwardGuidedImageResultToVideo: (file) =>
    set((state) => ({
      activeTab: 'video',
      analysisError: null,
      analysisStatus: 'idle',
      experience: 'guided',
      guidedInput: {
        ...state.guidedInput,
        endFrameAsset: setSlotFile(state.guidedInput.endFrameAsset, null),
        heroAsset: setSlotFile(state.guidedInput.heroAsset, file),
      },
      guidedPlan: null,
      guidedVideoStageEventId: state.guidedVideoStageEventId + 1,
      outputQuality: state.outputQuality === '4k' ? '1080p' : state.outputQuality,
    })),
  setCarouselBaseTemplateMode: (mode) =>
    set((state) => ({
      carouselDraft: { ...state.carouselDraft, baseTemplateMode: mode },
    })),
  setCarouselBaseTemplatePrompt: (prompt) =>
    set((state) => ({
      carouselDraft: { ...state.carouselDraft, baseTemplatePrompt: prompt },
    })),
  setCarouselBaseTemplateAsset: (file) =>
    set((state) => ({
      carouselDraft: {
        ...state.carouselDraft,
        baseTemplateAsset: file ? createAssetSlotFromFile(file) : null,
      },
    })),
  forwardManualImageResultToCarousel: (file) =>
    set((state) => ({
      activeTab: 'carousel',
      carouselDraft: {
        ...createInitialCarouselDraft(),
        panels: [createEmptyCarouselPanel(1)],
        baseTemplateMode: 'manual',
        baseTemplateAsset: createAssetSlotFromFile(file),
      },
      carouselStageEventId: state.carouselStageEventId + 1,
      experience: 'manual',
    })),
  forwardManualImageResultToVideo: (file) =>
    set((state) => {
      const nextVideoReferences = trimVideoReferenceSlots(
        state.videoReferences.map((slot, index) =>
          setSlotFile(slot, index === 0 ? file : null),
        ),
        state.videoModel,
      )

      return {
        activeTab: 'video',
        experience: 'manual',
        manualVideoStageEventId: state.manualVideoStageEventId + 1,
        outputQuality: state.outputQuality === '4k' ? '1080p' : state.outputQuality,
        videoReferences: nextVideoReferences,
      }
    }),
  hydrateGenerationRun: (run) =>
    set(() => {
      const nextRun = run
        ? {
            ...run,
            selectedVariantId: getSelectedVariantId(
              run.variants,
              run.selectedVariantId,
            ),
          }
        : createEmptyRunState()

      return {
        generationRun: nextRun,
        sessionStats: createSessionStats(nextRun.variants),
      }
    }),
  hydrateProjectConfig: (configSnapshot) =>
    set((state) => {
      const normalizedConfig = normalizeProjectConfigSnapshot(configSnapshot)
      const hydratedGuidedPlan = normalizedConfig.guided
        ? {
            creativeStyle: normalizedConfig.creativeStyle,
            productCategory: normalizedConfig.productCategory,
            shots: normalizedConfig.guided.shots,
            summary: normalizedConfig.guided.summary,
          }
        : null
      const guidedShotCount =
        normalizedConfig.guided &&
        normalizedConfig.guided.shots.length >= 1 &&
        normalizedConfig.guided.shots.length <= 4
          ? (normalizedConfig.guided.shots.length as BatchSize)
          : createGuidedInputState().shotCount

      releaseSlots(Object.values(state.assets))
      releaseSlots(state.products)
      releaseSlots(state.videoReferences)
      releaseGuidedInput(state.guidedInput)
      releaseIdeationInput(state.ideationInput)
      releaseMotionControlDraft(state.motionControl)

      return {
        ...createInitialState(),
        activeTab: normalizeActiveTabForExperience(
          normalizedConfig.activeTab,
          normalizedConfig.experience,
        ),
        analysisError: null,
        analysisStatus: hydratedGuidedPlan ? 'ready' : 'idle',
        batchSize: normalizedConfig.batchSize,
        cameraMovement: normalizedConfig.cameraMovement,
        carouselDraft:
          normalizedConfig.carouselDraft ?? createInitialCarouselDraft(),
        characterAgeGroup: normalizedConfig.characterAgeGroup,
        characterGender: normalizedConfig.characterGender,
        creativeBrief:
          normalizedConfig.guided?.creativeBrief ?? createCreativeBrief(),
        creativePlan: normalizedConfig.guided?.creativePlan ?? null,
        creativePlanningError: null,
        creativePlanningStatus: normalizedConfig.guided?.creativePlan
          ? 'ready'
          : 'idle',
        creativeStyle: normalizedConfig.creativeStyle,
        experience: normalizedConfig.experience,
        figureArtDirection: normalizedConfig.figureArtDirection,
        imageModel: normalizedConfig.imageModel,
        guidedInput: {
          ...createGuidedInputState(),
          analysisModel:
            normalizedConfig.guided?.analysisModel ?? createGuidedInputState().analysisModel,
          contentConcept:
            normalizedConfig.guided?.contentConcept ??
            createGuidedInputState().contentConcept,
          productUrl: normalizedConfig.guided?.productUrl ?? '',
          shotCount: guidedShotCount,
        },
        guidedPlan: hydratedGuidedPlan,
        outputQuality: normalizedConfig.outputQuality,
        promptEnhancement: createInitialPromptEnhancement(),
        productCategory: normalizedConfig.productCategory,
        motionControl: {
          ...createMotionControlDraft(),
          additionalInstructions:
            normalizedConfig.motionControl?.additionalInstructions ?? '',
          resolution: normalizedConfig.motionControl?.resolution ?? '1080p',
        },
        sessionStats: state.sessionStats,
        shotEnvironment: normalizedConfig.shotEnvironment,
        subjectMode: normalizedConfig.subjectMode,
        textPrompt: normalizedConfig.textPrompt,
        videoAudio: normalizedConfig.videoAudio,
        videoDuration: normalizedConfig.videoDuration,
        videoModel: normalizedConfig.videoModel,
      }
    }),
  resetGenerationRun: () =>
    set(() => ({
      generationErrorEventId: 0,
      generationRun: createEmptyRunState(),
      sessionStats: createEmptySessionStats(),
    })),
  resetGenerationState: () => {
    const state = get()
    const nextState = createInitialState()

    releaseSlots(Object.values(state.assets))
    releaseSlots(state.products)
    releaseSlots(state.videoReferences)
    releaseIdeationInput(state.ideationInput)
    releaseMotionControlDraft(state.motionControl)

    set({
      activeTab: nextState.activeTab,
      assets: nextState.assets,
      batchSize: nextState.batchSize,
      cameraMovement: nextState.cameraMovement,
      characterAgeGroup: nextState.characterAgeGroup,
      characterGender: nextState.characterGender,
      creativeBrief: nextState.creativeBrief,
      creativeStyle: nextState.creativeStyle,
      figureArtDirection: nextState.figureArtDirection,
        generationRun: nextState.generationRun,
        generationErrorEventId: nextState.generationErrorEventId,
        ideationError: nextState.ideationError,
        ideationInput: nextState.ideationInput,
        ideationResult: nextState.ideationResult,
        ideationStatus: nextState.ideationStatus,
        imageModel: nextState.imageModel,
      motionControl: nextState.motionControl,
      outputQuality: nextState.outputQuality,
      promptEnhancement: nextState.promptEnhancement,
      productCategory: nextState.productCategory,
      products: nextState.products,
      sessionStats: state.sessionStats,
      shotEnvironment: nextState.shotEnvironment,
      subjectMode: nextState.subjectMode,
      textPrompt: nextState.textPrompt,
      videoReferences: nextState.videoReferences,
      videoAudio: nextState.videoAudio,
      videoDuration: nextState.videoDuration,
      videoModel: nextState.videoModel,
    })
  },
  resetGuidedState: () => {
    const state = get()
    const nextState = createInitialState()

    releaseGuidedInput(state.guidedInput)

    set({
      analysisError: nextState.analysisError,
      analysisStatus: nextState.analysisStatus,
      creativeBrief: nextState.creativeBrief,
      creativePlan: nextState.creativePlan,
      creativePlanningError: nextState.creativePlanningError,
      creativePlanningStatus: nextState.creativePlanningStatus,
      generationErrorEventId: nextState.generationErrorEventId,
      generationRun: nextState.generationRun,
      guidedInput: nextState.guidedInput,
      guidedPlan: nextState.guidedPlan,
      sessionStats: state.sessionStats,
    })
  },
  resetIdeationState: () => {
    const state = get()
    const nextState = createInitialState()

    releaseIdeationInput(state.ideationInput)

    set({
      ideationError: nextState.ideationError,
      ideationInput: nextState.ideationInput,
      ideationResult: nextState.ideationResult,
      ideationStatus: nextState.ideationStatus,
      sessionStats: state.sessionStats,
    })
  },
  selectGenerationVariant: (variantId) =>
    set((state) => ({
      generationRun: {
        ...state.generationRun,
        selectedVariantId: getSelectedVariantId(
          state.generationRun.variants,
          variantId,
        ),
      },
    })),
  setActiveTab: (activeTab) =>
    set((state) => ({
      activeTab: normalizeActiveTabForExperience(activeTab, state.experience),
    })),
  setAnalysisError: (analysisError) => set({ analysisError }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setBatchSize: (batchSize) => set({ batchSize }),
  setCameraMovement: (cameraMovement) => set({ cameraMovement }),
  setCharacterAgeGroup: (characterAgeGroup) =>
    set((state) =>
      state.subjectMode === 'lifestyle' ? { characterAgeGroup } : {},
    ),
  setCharacterGender: (characterGender) =>
    set((state) =>
      state.subjectMode === 'lifestyle' ? { characterGender } : {},
    ),
  setCreativePlan: (creativePlan) =>
    set((state) => ({
      creativePlan,
      creativePlanningError: null,
      creativePlanningStatus: creativePlan ? 'ready' : 'idle',
      guidedPlan:
        creativePlan && state.guidedPlan
          ? {
              ...state.guidedPlan,
              shots: state.guidedPlan.shots.map((shot) => {
                const storyboardShot = creativePlan.storyboard.find(
                  (candidate) => candidate.slug === shot.slug,
                )

                return storyboardShot
                  ? {
                      ...shot,
                      prompt: storyboardShot.renderPrompt,
                      shotEnvironment: storyboardShot.shotEnvironment,
                      subjectMode: storyboardShot.subjectMode,
                      title: storyboardShot.title,
                      tags: storyboardShot.tags,
                    }
                  : shot
              }),
            }
          : state.guidedPlan,
    })),
  setCreativePlanningError: (creativePlanningError) => set({ creativePlanningError }),
  setCreativePlanningStatus: (creativePlanningStatus) => set({ creativePlanningStatus }),
  setCreativeBriefField: (key, value) =>
    set((state) => ({
      creativeBrief: {
        ...state.creativeBrief,
        [key]: value,
      },
    })),
  setCreativeStyle: (creativeStyle) => set({ creativeStyle }),
  setExperience: (experience) =>
    set((state) => ({
      activeTab: normalizeActiveTabForExperience(state.activeTab, experience),
      experience,
    })),
  setFigureArtDirection: (figureArtDirection) =>
    set((state) =>
      state.subjectMode === 'lifestyle' ? { figureArtDirection } : {},
    ),
  setGenerationError: (error) =>
    set((state) => {
      const variants = state.generationRun.variants.map((variant) =>
        variant.status === 'rendering'
          ? {
              ...variant,
              error,
              status: 'error' as const,
            }
          : variant,
      )
      const nextRun = syncGenerationRun(
        {
          ...state.generationRun,
          error,
          status: 'error',
        },
        variants,
      )

      return {
        generationErrorEventId: state.generationErrorEventId + 1,
        generationRun:
          variants.length > 0
            ? {
                ...nextRun,
                error,
              }
            : {
                ...state.generationRun,
                error,
                status: 'error',
              },
        sessionStats: createSessionStats(variants),
      }
    }),
  setGenerationVariants: (variants) =>
    set((state) => ({
      generationRun: syncGenerationRun(state.generationRun, variants),
      sessionStats: createSessionStats(variants),
    })),
  setGuidedAnalysisModel: (analysisModel) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        analysisModel,
      },
    })),
  setGuidedContentConcept: (contentConcept) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        contentConcept,
      },
    })),
  setGuidedEndFrameFile: (file) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        endFrameAsset: setValidatedSlotFile(
          state.guidedInput.endFrameAsset,
          file,
          'image',
        ),
      },
    })),
  setGuidedHeroFile: (file) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        heroAsset: setValidatedSlotFile(state.guidedInput.heroAsset, file, 'image'),
      },
    })),
  setGuidedPlan: (guidedPlan) =>
    set((state) => ({
      analysisError: null,
      analysisStatus: guidedPlan ? 'ready' : 'idle',
      creativePlan: guidedPlan ? state.creativePlan : null,
      creativePlanningError: guidedPlan ? state.creativePlanningError : null,
      creativePlanningStatus: guidedPlan
        ? state.creativePlanningStatus
        : 'idle',
      guidedPlan,
    })),
  setGuidedProductUrl: (productUrl) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        productUrl,
      },
    })),
  setGuidedShotCount: (shotCount) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        shotCount,
      },
    })),
  setIdeationAnalysisModel: (analysisModel) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        analysisModel,
      },
    })),
  setIdeationBriefText: (briefText) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        briefText,
      },
    })),
  setIdeationContentConcept: (contentConcept) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        contentConcept,
      },
    })),
  setIdeationContentFormat: (contentFormat) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        contentFormat,
      },
    })),
  setIdeationError: (ideationError) => set({ ideationError }),
  setIdeationFailure: (error) =>
    set((state) => ({
      generationErrorEventId: state.generationErrorEventId + 1,
      generationRun: {
        ...state.generationRun,
        error,
        status: 'error',
      },
      ideationError: error,
      ideationStatus: 'error',
    })),
  setIdeationHeroFile: (file) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        heroAsset: setValidatedSlotFile(state.ideationInput.heroAsset, file, 'image'),
      },
    })),
  setIdeationOutputLanguage: (outputLanguage) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        outputLanguage,
      },
    })),
  setIdeationProductUrl: (productUrl) =>
    set((state) => ({
      ideationInput: {
        ...state.ideationInput,
        productUrl,
      },
    })),
  setIdeationResult: (ideationResult) =>
    set(() => ({
      ideationError: null,
      ideationResult,
      ideationStatus: ideationResult ? 'ready' : 'idle',
    })),
  setIdeationStatus: (ideationStatus) => set({ ideationStatus }),
  setImageModel: (imageModel) => set({ imageModel }),
  setMotionControlAdditionalInstructions: (value) =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        additionalInstructions: value,
      },
    })),
  setMotionControlMotionVideoFile: (file) =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        motionVideo: setValidatedSlotFile(
          state.motionControl.motionVideo,
          file,
          'video',
        ),
      },
    })),
  setMotionControlMotionVideoDuration: (value) =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        motionVideo: {
          ...state.motionControl.motionVideo,
          durationSeconds:
            typeof value === 'number' && Number.isFinite(value) && value > 0
              ? Number(value.toFixed(3))
              : null,
        },
      },
    })),
  setMotionControlReferenceImageFile: (file) =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        referenceImage: setValidatedSlotFile(
          state.motionControl.referenceImage,
          file,
          'image',
        ),
      },
    })),
  setMotionControlResolution: (value) =>
    set((state) => ({
      motionControl: {
        ...state.motionControl,
        resolution: value,
      },
    })),
  setNamedAssetFile: (slot, file) =>
    set((state) => ({
      assets: {
        ...state.assets,
        ...(slot === 'firstFrame' && !file
          ? { endFrame: setSlotFile(state.assets.endFrame, null) }
          : null),
        [slot]: setValidatedSlotFile(state.assets[slot], file, 'image'),
      },
    })),
  setOutputQuality: (outputQuality) => set({ outputQuality }),
  setPromptEnhancement: (patch) =>
    set((state) => ({
      promptEnhancement: {
        ...state.promptEnhancement,
        ...patch,
      },
    })),
  setProductCategory: (productCategory) => set({ productCategory }),
  setProductSlotFile: (id, file) =>
    set((state) => ({
      products: state.products.map((slot) =>
        slot.id === id ? setValidatedSlotFile(slot, file, 'image') : slot,
      ),
    })),
  setShotEnvironment: (shotEnvironment) => set({ shotEnvironment }),
  setSubjectMode: (subjectMode) => set(createSubjectModeState(subjectMode)),
  setTextPrompt: (textPrompt) => set({ textPrompt }),
  setVideoReferenceFile: (id, file) =>
    set((state) => ({
      videoReferences: state.videoReferences.map((slot) =>
        slot.id === id ? setValidatedSlotFile(slot, file, 'image') : slot,
      ),
    })),
  setVideoAudio: (videoAudio) => set({ videoAudio }),
  setVideoDuration: (videoDuration) => set({ videoDuration }),
  setVideoModel: (videoModel) =>
    set((state) => ({
      assets: {
        ...state.assets,
        firstFrame: supportsVideoFirstLastFramePair(videoModel)
          ? state.assets.firstFrame
          : setSlotFile(state.assets.firstFrame, null),
        endFrame: supportsVideoEndFrameGuidance(videoModel)
          ? state.assets.endFrame
          : setSlotFile(state.assets.endFrame, null),
      },
      videoModel,
      videoReferences: trimVideoReferenceSlots(state.videoReferences, videoModel),
    })),
  selectCreativePlanCta: (ctaId) =>
    set((state) => {
      if (!state.creativePlan) {
        return {}
      }

      const selectedCta =
        state.creativePlan.ctaOptions.find((cta) => cta.id === ctaId) ?? null
      const storyboard = state.creativePlan.storyboard.map((shot, index, shots) => {
        const isLastShot = index === shots.length - 1

        if (!isLastShot) {
          return shot
        }

        const ctaText = selectedCta?.label ?? shot.ctaText
        const nextShot = {
          ...shot,
          ctaText,
        }
        const renderPrompt = composeStoryboardRenderPrompt(nextShot)

        return {
          ...nextShot,
          ctaText,
          prompt: renderPrompt,
          renderPrompt,
        }
      })

      return {
        creativePlan: {
          ...state.creativePlan,
          selectedCtaId: ctaId,
          storyboard,
        },
        guidedPlan: state.guidedPlan
          ? {
              ...state.guidedPlan,
              shots: state.guidedPlan.shots.map((shot, index, shots) => {
                const isLastShot = index === shots.length - 1
                const storyboardShot = storyboard.find(
                  (candidate) => candidate.slug === shot.slug,
                )

                return isLastShot && storyboardShot
                  ? {
                      ...shot,
                      prompt: storyboardShot.renderPrompt,
                    }
                  : shot
              }),
            }
          : state.guidedPlan,
      }
    }),
  updateStoryboardShot: (slug, patch) =>
    set((state) => {
      if (!state.creativePlan) {
        return {}
      }

      const nextStoryboard = state.creativePlan.storyboard.map((shot) =>
        shot.slug === slug
          ? (() => {
              const nextShot = {
                ...shot,
                ...patch,
              }

              return {
                ...nextShot,
                prompt:
                  typeof patch.renderPrompt === 'string' || typeof patch.prompt === 'string'
                    ? nextShot.renderPrompt
                    : composeStoryboardRenderPrompt(nextShot),
                renderPrompt:
                  typeof patch.renderPrompt === 'string'
                    ? patch.renderPrompt
                    : composeStoryboardRenderPrompt(nextShot),
              }
            })()
          : shot,
      )
      const updatedShot = nextStoryboard.find((shot) => shot.slug === slug)
      const nextGuidedPlan = updatedShot && state.guidedPlan
        ? {
            ...state.guidedPlan,
            shots: state.guidedPlan.shots.map((shot) =>
              shot.slug === slug
                ? {
                    ...shot,
                    prompt:
                      updatedShot.renderPrompt || updatedShot.prompt || shot.prompt,
                    shotEnvironment: updatedShot.shotEnvironment,
                    subjectMode: updatedShot.subjectMode,
                    title: updatedShot.title,
                    tags: updatedShot.tags,
                  }
                : shot,
            ),
          }
        : state.guidedPlan

      return {
        creativePlan: {
          ...state.creativePlan,
          storyboard: nextStoryboard,
        },
        guidedPlan: nextGuidedPlan,
      }
    }),
  updateGuidedShotPrompt: (slug, prompt) =>
    set((state) => {
      const nextGuidedPlan = state.guidedPlan
        ? {
            ...state.guidedPlan,
            shots: state.guidedPlan.shots.map((shot) =>
              shot.slug === slug
                ? {
                    ...shot,
                    prompt,
                  }
                : shot,
            ),
          }
        : null

      return {
        creativePlan: state.creativePlan
          ? {
              ...state.creativePlan,
              storyboard: state.creativePlan.storyboard.map((shot) =>
                shot.slug === slug
                  ? {
                      ...shot,
                      prompt,
                      renderPrompt: prompt,
                    }
                  : shot,
              ),
            }
          : state.creativePlan,
        guidedPlan: nextGuidedPlan,
      }
    }),
  updateGenerationRun: (patch) =>
    set((state) => ({
      generationRun: {
        ...state.generationRun,
        ...patch,
      },
    })),
  updateGenerationVariant: (variantId, patch) =>
    set((state) => {
      const variants = state.generationRun.variants.map((variant) =>
        variant.variantId === variantId
          ? {
              ...variant,
              ...patch,
            }
          : variant,
      )

      return {
        generationRun: syncGenerationRun(state.generationRun, variants),
        sessionStats: createSessionStats(variants),
      }
    }),
}))

export function isGenerationInProgress(
  state: ReturnType<typeof useGenerationStore.getState>,
): boolean {
  return (
    state.generationRun.status === 'rendering' ||
    state.analysisStatus === 'analyzing' ||
    state.ideationStatus === 'analyzing'
  )
}

export type {
  AssetSlot,
  AudiencePreset,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  ContentConcept,
  CreativeBrief,
  CreativeGoal,
  CreativePlan,
  CreativePlanningStatus,
  ContentFormat,
  CreativeStyle,
  FigureArtDirection,
  GenerationExperience,
  GuidedAnalysisPlan,
  GuidedAnalysisStatus,
  GenerationRun,
  GenerationRunStatus,
  GenerationSessionStats,
  GenerationVariant,
  ImageModelOption,
  IdeationResult,
  KieAnalysisModel,
  NamedAssetKey,
  OutputQuality,
  PromptEnhancement,
  PlatformPreset,
  ProductCategory,
  ShotEnvironment,
  StoryboardShot,
  SubjectMode,
  VideoDuration,
  VideoAudio,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
