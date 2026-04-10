'use client'

import { create } from 'zustand'

import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  ContentConcept,
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
  KieAnalysisModel,
  NamedAssetKey,
  NamedAssetSlots,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import type { ProjectConfigSnapshot } from '@/lib/persistence/types'
import { normalizeProjectConfigSnapshot } from '@/lib/persistence/serialization'

type GuidedInputState = {
  analysisModel: KieAnalysisModel
  contentConcept: ContentConcept
  heroAsset: AssetSlot
  productUrl: string
  shotCount: BatchSize
}

type GenerationStateShape = {
  activeTab: WorkspaceTab
  analysisError: string | null
  analysisStatus: GuidedAnalysisStatus
  assets: NamedAssetSlots
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  experience: GenerationExperience
  figureArtDirection: FigureArtDirection
  generationRun: GenerationRun
  guidedInput: GuidedInputState
  guidedPlan: GuidedAnalysisPlan | null
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  products: AssetSlot[]
  sessionStats: GenerationSessionStats
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}

type GenerationStore = GenerationStateShape & {
  clearNamedAsset: (slot: NamedAssetKey) => void
  clearGuidedHeroAsset: () => void
  clearProductSlot: (id: string) => void
  disposeGenerationState: () => void
  hydrateGenerationRun: (run: GenerationRun | null) => void
  hydrateProjectConfig: (configSnapshot: ProjectConfigSnapshot) => void
  resetGenerationRun: () => void
  resetGenerationState: () => void
  resetGuidedState: () => void
  selectGenerationVariant: (variantId: string | null) => void
  setActiveTab: (activeTab: WorkspaceTab) => void
  setAnalysisError: (error: string | null) => void
  setAnalysisStatus: (status: GuidedAnalysisStatus) => void
  setBatchSize: (batchSize: BatchSize) => void
  setCameraMovement: (cameraMovement: CameraMovement | null) => void
  setCharacterAgeGroup: (characterAgeGroup: CharacterAgeGroup) => void
  setCharacterGender: (characterGender: CharacterGender) => void
  setCreativeStyle: (creativeStyle: CreativeStyle) => void
  setExperience: (experience: GenerationExperience) => void
  setFigureArtDirection: (figureArtDirection: FigureArtDirection) => void
  setGenerationError: (error: string) => void
  setGenerationVariants: (variants: GenerationVariant[]) => void
  setGuidedAnalysisModel: (model: KieAnalysisModel) => void
  setGuidedContentConcept: (concept: ContentConcept) => void
  setGuidedHeroFile: (file: File | null) => void
  setGuidedPlan: (plan: GuidedAnalysisPlan | null) => void
  setGuidedProductUrl: (productUrl: string) => void
  setGuidedShotCount: (shotCount: BatchSize) => void
  setImageModel: (imageModel: ImageModelOption) => void
  setNamedAssetFile: (slot: NamedAssetKey, file: File | null) => void
  setOutputQuality: (outputQuality: OutputQuality) => void
  setProductCategory: (productCategory: ProductCategory) => void
  setProductSlotFile: (id: string, file: File | null) => void
  setShotEnvironment: (shotEnvironment: ShotEnvironment) => void
  setSubjectMode: (subjectMode: SubjectMode) => void
  setTextPrompt: (textPrompt: string) => void
  setVideoDuration: (videoDuration: VideoDuration) => void
  setVideoModel: (videoModel: VideoModelOption) => void
  updateGuidedShotPrompt: (slug: string, prompt: string) => void
  updateGenerationRun: (patch: Partial<GenerationRun>) => void
  updateGenerationVariant: (variantId: string, patch: Partial<GenerationVariant>) => void
}

const fixedProductSlotCount = 2

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
  if (!file || typeof URL === 'undefined') {
    return null
  }

  return URL.createObjectURL(file)
}

function createSlot(id: string, label: string): AssetSlot {
  return {
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

function createProductSlots() {
  return Array.from({ length: fixedProductSlotCount }, (_, index) =>
    createSlot(`product-${index + 1}`, buildProductLabel(index + 1)),
  )
}

function createGuidedInputState(): GuidedInputState {
  return {
    analysisModel: 'gemini-2.5-flash',
    contentConcept: 'affiliate',
    heroAsset: createSlot('guided-hero', 'Hero Product'),
    productUrl: '',
    shotCount: 4,
  }
}

function createEmptyRunState(): GenerationRun {
  return {
    completedAt: null,
    createdAt: null,
    error: null,
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

function createInitialState(): GenerationStateShape {
  return {
    activeTab: 'image',
    analysisError: null,
    analysisStatus: 'idle',
    assets: {
      clothing: createSlot('clothing', 'Clothing'),
      endFrame: createSlot('endFrame', 'End Frame'),
      face1: createSlot('face1', 'Face 1'),
      face2: createSlot('face2', 'Face 2'),
      location: createSlot('location', 'Location'),
    },
    batchSize: 1,
    cameraMovement: 'orbit',
    characterAgeGroup: 'any',
    characterGender: 'any',
    creativeStyle: 'ugc-lifestyle',
    experience: 'manual',
    figureArtDirection: 'none',
    generationRun: createEmptyRunState(),
    guidedInput: createGuidedInputState(),
    guidedPlan: null,
    imageModel: 'nano-banana',
    outputQuality: '1080p',
    productCategory: 'cosmetics',
    products: createProductSlots(),
    sessionStats: createEmptySessionStats(),
    shotEnvironment: 'indoor',
    subjectMode: 'lifestyle',
    textPrompt: '',
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
}

function setSlotFile(slot: AssetSlot, file: File | null): AssetSlot {
  const previewUrl = createPreviewUrl(file)

  if (previewUrl !== slot.previewUrl) {
    revokePreviewUrl(slot.previewUrl)
  }

  return {
    ...slot,
    error: null,
    file,
    mimeType: file?.type ?? null,
    previewUrl,
    size: file?.size ?? null,
    uploadStatus: file ? 'staged' : 'idle',
  }
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

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  ...createInitialState(),
  clearNamedAsset: (slot) =>
    set((state) => ({
      assets: {
        ...state.assets,
        [slot]: setSlotFile(state.assets[slot], null),
      },
    })),
  clearGuidedHeroAsset: () =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        heroAsset: setSlotFile(state.guidedInput.heroAsset, null),
      },
    })),
  clearProductSlot: (id) =>
    set((state) => ({
      products: state.products.map((slot) =>
        slot.id === id ? setSlotFile(slot, null) : slot,
      ),
    })),
  disposeGenerationState: () => {
    const state = get()

    releaseSlots(Object.values(state.assets))
    releaseSlots(state.products)
    releaseGuidedInput(state.guidedInput)

    set(createInitialState())
  },
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
      releaseGuidedInput(state.guidedInput)

      return {
        ...createInitialState(),
        activeTab: normalizedConfig.activeTab,
        analysisError: null,
        analysisStatus: hydratedGuidedPlan ? 'ready' : 'idle',
        batchSize: normalizedConfig.batchSize,
        cameraMovement: normalizedConfig.cameraMovement,
        characterAgeGroup: normalizedConfig.characterAgeGroup,
        characterGender: normalizedConfig.characterGender,
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
        productCategory: normalizedConfig.productCategory,
        sessionStats: state.sessionStats,
        shotEnvironment: normalizedConfig.shotEnvironment,
        subjectMode: normalizedConfig.subjectMode,
        textPrompt: normalizedConfig.textPrompt,
        videoDuration: normalizedConfig.videoDuration,
        videoModel: normalizedConfig.videoModel,
      }
    }),
  resetGenerationRun: () =>
    set(() => ({
      generationRun: createEmptyRunState(),
      sessionStats: createEmptySessionStats(),
    })),
  resetGenerationState: () => {
    const state = get()
    const nextState = createInitialState()

    releaseSlots(Object.values(state.assets))
    releaseSlots(state.products)

    set({
      activeTab: nextState.activeTab,
      assets: nextState.assets,
      batchSize: nextState.batchSize,
      cameraMovement: nextState.cameraMovement,
      characterAgeGroup: nextState.characterAgeGroup,
      characterGender: nextState.characterGender,
      creativeStyle: nextState.creativeStyle,
      figureArtDirection: nextState.figureArtDirection,
      generationRun: nextState.generationRun,
      imageModel: nextState.imageModel,
      outputQuality: nextState.outputQuality,
      productCategory: nextState.productCategory,
      products: nextState.products,
      sessionStats: state.sessionStats,
      shotEnvironment: nextState.shotEnvironment,
      subjectMode: nextState.subjectMode,
      textPrompt: nextState.textPrompt,
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
      generationRun: nextState.generationRun,
      guidedInput: nextState.guidedInput,
      guidedPlan: nextState.guidedPlan,
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
  setActiveTab: (activeTab) => set({ activeTab }),
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
  setCreativeStyle: (creativeStyle) => set({ creativeStyle }),
  setExperience: (experience) => set({ experience }),
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
          status: variants.length > 0 ? 'error' : state.generationRun.status,
        },
        variants,
      )

      return {
        generationRun: {
          ...nextRun,
          error,
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
  setGuidedHeroFile: (file) =>
    set((state) => ({
      guidedInput: {
        ...state.guidedInput,
        heroAsset: setSlotFile(state.guidedInput.heroAsset, file),
      },
    })),
  setGuidedPlan: (guidedPlan) =>
    set(() => ({
      analysisError: null,
      analysisStatus: guidedPlan ? 'ready' : 'idle',
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
  setImageModel: (imageModel) => set({ imageModel }),
  setNamedAssetFile: (slot, file) =>
    set((state) => ({
      assets: {
        ...state.assets,
        [slot]: setSlotFile(state.assets[slot], file),
      },
    })),
  setOutputQuality: (outputQuality) => set({ outputQuality }),
  setProductCategory: (productCategory) => set({ productCategory }),
  setProductSlotFile: (id, file) =>
    set((state) => ({
      products: state.products.map((slot) =>
        slot.id === id ? setSlotFile(slot, file) : slot,
      ),
    })),
  setShotEnvironment: (shotEnvironment) => set({ shotEnvironment }),
  setSubjectMode: (subjectMode) => set(createSubjectModeState(subjectMode)),
  setTextPrompt: (textPrompt) => set({ textPrompt }),
  setVideoDuration: (videoDuration) => set({ videoDuration }),
  setVideoModel: (videoModel) => set({ videoModel }),
  updateGuidedShotPrompt: (slug, prompt) =>
    set((state) => ({
      guidedPlan: state.guidedPlan
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
        : null,
    })),
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

export type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  ContentConcept,
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
  KieAnalysisModel,
  NamedAssetKey,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
