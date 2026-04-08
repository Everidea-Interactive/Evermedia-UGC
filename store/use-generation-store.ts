'use client'

import { create } from 'zustand'

import type {
  AssetSlot,
  AssetUploadStatus,
  BatchSize,
  CameraMovement,
  CreativeStyle,
  GenerationRun,
  GenerationRunStatus,
  GenerationSessionStats,
  GenerationVariant,
  ImageModelOption,
  NamedAssetKey,
  NamedAssetSlots,
  OutputQuality,
  ProductCategory,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import type {
  ProductSlotKey,
  ProjectConfigSnapshot,
} from '@/lib/persistence/types'

type GenerationStateShape = {
  activeTab: WorkspaceTab
  imageModel: ImageModelOption
  videoModel: VideoModelOption
  productCategory: ProductCategory
  creativeStyle: CreativeStyle
  subjectMode: SubjectMode
  batchSize: BatchSize
  textPrompt: string
  videoDuration: VideoDuration
  outputQuality: OutputQuality
  cameraMovement: CameraMovement | null
  assets: NamedAssetSlots
  products: AssetSlot[]
  generationRun: GenerationRun
  sessionStats: GenerationSessionStats
}

type AssetPatch = Partial<
  Omit<
    AssetSlot,
    'id' | 'label' | 'file' | 'persistedAssetId' | 'previewUrl' | 'remoteUrl'
  >
> & {
  file?: File | null
  persistedAssetId?: string | null
  previewUrl?: string | null
  remoteUrl?: string | null
}

type GenerationStore = GenerationStateShape & {
  setActiveTab: (activeTab: WorkspaceTab) => void
  setImageModel: (imageModel: ImageModelOption) => void
  setVideoModel: (videoModel: VideoModelOption) => void
  setProductCategory: (productCategory: ProductCategory) => void
  setCreativeStyle: (creativeStyle: CreativeStyle) => void
  setSubjectMode: (subjectMode: SubjectMode) => void
  setBatchSize: (batchSize: BatchSize) => void
  setTextPrompt: (textPrompt: string) => void
  setVideoDuration: (videoDuration: VideoDuration) => void
  setOutputQuality: (outputQuality: OutputQuality) => void
  setCameraMovement: (cameraMovement: CameraMovement | null) => void
  setNamedAssetFile: (slot: NamedAssetKey, file: File | null) => void
  setNamedAssetRemoteState: (
    slot: NamedAssetKey,
    patch: Pick<AssetSlot, 'remoteUrl' | 'uploadStatus' | 'error'>,
  ) => void
  setNamedAssetStoredState: (
    slot: NamedAssetKey,
    patch: Pick<
      AssetSlot,
      'persistedAssetId' | 'previewUrl' | 'mimeType' | 'size'
    >,
  ) => void
  clearNamedAsset: (slot: NamedAssetKey) => void
  addProductSlot: () => void
  removeProductSlot: (id: string) => void
  setProductSlotFile: (id: string, file: File | null) => void
  setProductSlotRemoteState: (
    id: string,
    patch: Pick<AssetSlot, 'remoteUrl' | 'uploadStatus' | 'error'>,
  ) => void
  setProductSlotStoredState: (
    id: string,
    patch: Pick<
      AssetSlot,
      'persistedAssetId' | 'previewUrl' | 'mimeType' | 'size'
    >,
  ) => void
  clearProductSlot: (id: string) => void
  clearUploadMetadata: () => void
  hydrateProjectConfig: (configSnapshot: ProjectConfigSnapshot) => void
  updateGenerationRun: (patch: Partial<GenerationRun>) => void
  setGenerationRunStatus: (
    status: GenerationRunStatus,
    patch?: Partial<GenerationRun>,
  ) => void
  setGenerationVariants: (variants: GenerationVariant[]) => void
  updateGenerationVariant: (
    variantId: string,
    patch: Partial<GenerationVariant>,
  ) => void
  incrementSessionStats: (patch: Partial<GenerationSessionStats>) => void
  selectGenerationVariant: (variantId: string | null) => void
  setGenerationError: (error: string) => void
  resetGenerationRun: () => void
  resetGenerationState: () => void
  disposeGenerationState: () => void
}

const fixedProductSlotCount = 2

function buildProductLabel(position: number) {
  return `Product ${position}`
}

function getProductSlotId(position: number): ProductSlotKey {
  return `product-${position}` as ProductSlotKey
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
    id,
    label,
    file: null,
    persistedAssetId: null,
    previewUrl: null,
    remoteUrl: null,
    mimeType: null,
    size: null,
    uploadStatus: 'idle',
    error: null,
  }
}

function createProductSlot(position: number): AssetSlot {
  return createSlot(getProductSlotId(position), buildProductLabel(position))
}

function createProductSlots() {
  return Array.from({ length: fixedProductSlotCount }, (_, index) =>
    createProductSlot(index + 1),
  )
}

function createEmptyRunState(): GenerationRun {
  return {
    runId: null,
    workspace: null,
    provider: null,
    model: null,
    status: 'idle',
    startedAt: null,
    error: null,
    uploadedAssets: [],
    variants: [],
    selectedVariantId: null,
  }
}

function createEmptySessionStats(): GenerationSessionStats {
  return {
    completedVariants: 0,
    failedVariants: 0,
  }
}

function createInitialState(): GenerationStateShape {
  return {
    activeTab: 'image',
    imageModel: 'nano-banana',
    videoModel: 'veo-3.1',
    productCategory: 'cosmetics',
    creativeStyle: 'ugc-lifestyle',
    subjectMode: 'lifestyle',
    batchSize: 1,
    textPrompt: '',
    videoDuration: 'base',
    outputQuality: '1080p',
    cameraMovement: 'orbit',
    assets: {
      face1: createSlot('face1', 'Face 1'),
      face2: createSlot('face2', 'Face 2'),
      clothing: createSlot('clothing', 'Clothing'),
      location: createSlot('location', 'Location'),
      endFrame: createSlot('endFrame', 'End Frame'),
    },
    products: createProductSlots(),
    generationRun: createEmptyRunState(),
    sessionStats: createEmptySessionStats(),
  }
}

function relabelProducts(products: AssetSlot[]) {
  return products.map((slot, index) => ({
    ...slot,
    label: buildProductLabel(index + 1),
  }))
}

function releaseSlots(slots: AssetSlot[]) {
  for (const slot of slots) {
    revokePreviewUrl(slot.previewUrl)
  }
}

function mergeAssetPatch(slot: AssetSlot, patch: AssetPatch): AssetSlot {
  const nextFile = Object.prototype.hasOwnProperty.call(patch, 'file')
    ? (patch.file ?? null)
    : slot.file
  const nextPreviewUrl = Object.prototype.hasOwnProperty.call(patch, 'previewUrl')
    ? (patch.previewUrl ?? null)
    : slot.previewUrl
  const nextPersistedAssetId = Object.prototype.hasOwnProperty.call(
    patch,
    'persistedAssetId',
  )
    ? (patch.persistedAssetId ?? null)
    : slot.persistedAssetId

  const incomingPreviewUrl =
    nextFile !== slot.file
      ? createPreviewUrl(nextFile)
      : nextPreviewUrl

  if (incomingPreviewUrl !== slot.previewUrl) {
    revokePreviewUrl(slot.previewUrl)
  }

  return {
    ...slot,
    ...patch,
    file: nextFile,
    persistedAssetId:
      nextFile !== slot.file ? null : nextPersistedAssetId,
    previewUrl: incomingPreviewUrl,
    remoteUrl:
      nextFile !== slot.file
        ? null
        : patch.remoteUrl ?? slot.remoteUrl,
    mimeType: nextFile ? nextFile.type : patch.mimeType ?? slot.mimeType,
    size: nextFile ? nextFile.size : patch.size ?? slot.size,
    uploadStatus:
      nextFile !== slot.file
        ? nextFile
          ? 'staged'
          : 'idle'
        : patch.uploadStatus ?? slot.uploadStatus,
    error: nextFile !== slot.file ? null : patch.error ?? slot.error,
  }
}

function updateNamedAsset(
  assets: NamedAssetSlots,
  key: NamedAssetKey,
  patch: AssetPatch,
) {
  return {
    ...assets,
    [key]: mergeAssetPatch(assets[key], patch),
  }
}

function updateProductAsset(
  products: AssetSlot[],
  id: string,
  patch: AssetPatch,
) {
  return products.map((slot) =>
    slot.id === id ? mergeAssetPatch(slot, patch) : slot,
  )
}

function resolveGenerationRunStatus(variants: GenerationVariant[]) {
  if (variants.length === 0) {
    return 'idle' satisfies GenerationRunStatus
  }

  if (variants.some((variant) => variant.status === 'submitting')) {
    return 'submitting' satisfies GenerationRunStatus
  }

  if (variants.some((variant) => variant.status === 'rendering')) {
    return 'rendering' satisfies GenerationRunStatus
  }

  const successCount = variants.filter((variant) => variant.status === 'success').length
  const errorCount = variants.filter((variant) => variant.status === 'error').length

  if (successCount === variants.length) {
    return 'success' satisfies GenerationRunStatus
  }

  if (errorCount === variants.length) {
    return 'error' satisfies GenerationRunStatus
  }

  if (successCount > 0 && errorCount > 0) {
    return 'partial-success' satisfies GenerationRunStatus
  }

  return 'error' satisfies GenerationRunStatus
}

function getDefaultSelectedVariantId(variants: GenerationVariant[]) {
  return (
    variants.find(
      (variant) => variant.status === 'success' && Boolean(variant.result),
    )?.variantId ?? null
  )
}

function resolveSelectedVariantId(
  variants: GenerationVariant[],
  selectedVariantId: string | null,
) {
  const selectedVariant = variants.find(
    (variant) => variant.variantId === selectedVariantId,
  )

  if (selectedVariant?.status === 'success' && selectedVariant.result) {
    return selectedVariantId
  }

  return getDefaultSelectedVariantId(variants)
}

function syncGenerationRunVariants(
  run: GenerationRun,
  variants: GenerationVariant[],
): GenerationRun {
  const status = resolveGenerationRunStatus(variants)
  const selectedVariantId = resolveSelectedVariantId(
    variants,
    run.selectedVariantId,
  )
  const error =
    status === 'error'
      ? variants.find((variant) => variant.error)?.error ?? run.error
      : run.error

  return {
    ...run,
    error: status === 'error' ? error : null,
    selectedVariantId,
    status,
    variants,
  }
}

function getSessionStatsDelta(
  previousVariants: GenerationVariant[],
  nextVariants: GenerationVariant[],
): GenerationSessionStats {
  const previousStatuses = new Map(
    previousVariants.map((variant) => [variant.variantId, variant.status]),
  )

  return nextVariants.reduce<GenerationSessionStats>(
    (delta, variant) => {
      const previousStatus = previousStatuses.get(variant.variantId)

      if (variant.status === 'success' && previousStatus !== 'success') {
        delta.completedVariants += 1
      }

      if (variant.status === 'error' && previousStatus !== 'error') {
        delta.failedVariants += 1
      }

      return delta
    },
    createEmptySessionStats(),
  )
}

function mergeSessionStats(
  currentStats: GenerationSessionStats,
  delta: GenerationSessionStats,
): GenerationSessionStats {
  return {
    completedVariants:
      currentStats.completedVariants + delta.completedVariants,
    failedVariants: currentStats.failedVariants + delta.failedVariants,
  }
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  ...createInitialState(),
  setActiveTab: (activeTab) => set({ activeTab }),
  setImageModel: (imageModel) => set({ imageModel }),
  setVideoModel: (videoModel) => set({ videoModel }),
  setProductCategory: (productCategory) => set({ productCategory }),
  setCreativeStyle: (creativeStyle) => set({ creativeStyle }),
  setSubjectMode: (subjectMode) => set({ subjectMode }),
  setBatchSize: (batchSize) => set({ batchSize }),
  setTextPrompt: (textPrompt) => set({ textPrompt }),
  setVideoDuration: (videoDuration) => set({ videoDuration }),
  setOutputQuality: (outputQuality) => set({ outputQuality }),
  setCameraMovement: (cameraMovement) => set({ cameraMovement }),
  setNamedAssetFile: (slot, file) =>
    set((state) => ({
      assets: updateNamedAsset(state.assets, slot, { file }),
    })),
  setNamedAssetRemoteState: (slot, patch) =>
    set((state) => ({
      assets: updateNamedAsset(state.assets, slot, patch),
    })),
  setNamedAssetStoredState: (slot, patch) =>
    set((state) => ({
      assets: updateNamedAsset(state.assets, slot, {
        error: null,
        file: null,
        remoteUrl: null,
        uploadStatus: 'idle',
        ...patch,
      }),
    })),
  clearNamedAsset: (slot) =>
    set((state) => ({
      assets: updateNamedAsset(state.assets, slot, {
        file: null,
        persistedAssetId: null,
        previewUrl: null,
        remoteUrl: null,
        mimeType: null,
        size: null,
        uploadStatus: 'idle',
        error: null,
      }),
    })),
  addProductSlot: () =>
    set((state) => {
      if (state.products.length >= fixedProductSlotCount) {
        return state
      }

      return {
        products: [
          ...state.products,
          createProductSlot(state.products.length + 1),
        ],
      }
    }),
  removeProductSlot: (id) =>
    set((state) => {
      if (state.products.length <= fixedProductSlotCount) {
        return state
      }

      const target = state.products.find((slot) => slot.id === id)

      if (target) {
        revokePreviewUrl(target.previewUrl)
      }

      return {
        products: relabelProducts(
          state.products.filter((slot) => slot.id !== id),
        ),
      }
    }),
  setProductSlotFile: (id, file) =>
    set((state) => ({
      products: updateProductAsset(state.products, id, { file }),
    })),
  setProductSlotRemoteState: (id, patch) =>
    set((state) => ({
      products: updateProductAsset(state.products, id, patch),
    })),
  setProductSlotStoredState: (id, patch) =>
    set((state) => ({
      products: updateProductAsset(state.products, id, {
        error: null,
        file: null,
        remoteUrl: null,
        uploadStatus: 'idle',
        ...patch,
      }),
    })),
  clearProductSlot: (id) =>
    set((state) => ({
      products: updateProductAsset(state.products, id, {
        file: null,
        persistedAssetId: null,
        previewUrl: null,
        remoteUrl: null,
        mimeType: null,
        size: null,
        uploadStatus: 'idle',
        error: null,
      }),
    })),
  clearUploadMetadata: () =>
    set((state) => ({
      assets: Object.fromEntries(
        Object.entries(state.assets).map(([key, slot]) => [
          key,
          {
            ...slot,
            remoteUrl: null,
            uploadStatus:
              slot.file || slot.persistedAssetId
                ? ('staged' satisfies AssetUploadStatus)
                : 'idle',
            error: null,
          },
        ]),
      ) as NamedAssetSlots,
      products: state.products.map((slot) => ({
        ...slot,
        remoteUrl: null,
        uploadStatus:
          slot.file || slot.persistedAssetId
            ? ('staged' satisfies AssetUploadStatus)
            : 'idle',
        error: null,
      })),
    })),
  hydrateProjectConfig: (configSnapshot) =>
    set((state) => {
      releaseSlots(Object.values(state.assets))
      releaseSlots(state.products)

      return {
        ...createInitialState(),
        activeTab: configSnapshot.activeTab,
        batchSize: configSnapshot.batchSize,
        cameraMovement: configSnapshot.cameraMovement,
        creativeStyle: configSnapshot.creativeStyle,
        imageModel: configSnapshot.imageModel,
        outputQuality: configSnapshot.outputQuality,
        productCategory: configSnapshot.productCategory,
        sessionStats: state.sessionStats,
        subjectMode: configSnapshot.subjectMode,
        textPrompt: configSnapshot.textPrompt,
        videoDuration: configSnapshot.videoDuration,
        videoModel: configSnapshot.videoModel,
      }
    }),
  updateGenerationRun: (patch) =>
    set((state) => ({
      generationRun: {
        ...state.generationRun,
        ...patch,
      },
    })),
  setGenerationRunStatus: (status, patch) =>
    set((state) => ({
      generationRun: {
        ...state.generationRun,
        ...patch,
        status,
      },
    })),
  setGenerationVariants: (variants) =>
    set((state) => ({
      sessionStats: mergeSessionStats(
        state.sessionStats,
        getSessionStatsDelta(state.generationRun.variants, variants),
      ),
      generationRun: syncGenerationRunVariants(state.generationRun, variants),
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
        sessionStats: mergeSessionStats(
          state.sessionStats,
          getSessionStatsDelta(state.generationRun.variants, variants),
        ),
        generationRun: syncGenerationRunVariants(state.generationRun, variants),
      }
    }),
  incrementSessionStats: (patch) =>
    set((state) => ({
      sessionStats: {
        completedVariants:
          state.sessionStats.completedVariants +
          (patch.completedVariants ?? 0),
        failedVariants:
          state.sessionStats.failedVariants + (patch.failedVariants ?? 0),
      },
    })),
  selectGenerationVariant: (variantId) =>
    set((state) => ({
      generationRun: {
        ...state.generationRun,
        selectedVariantId: resolveSelectedVariantId(
          state.generationRun.variants,
          variantId,
        ),
      },
    })),
  setGenerationError: (error) =>
    set((state) => {
      const variants = state.generationRun.variants.map((variant) =>
        variant.status === 'rendering' || variant.status === 'submitting'
          ? {
              ...variant,
              error,
              status: 'error' as const,
            }
          : variant,
      )
      const nextRun = syncGenerationRunVariants(
        {
          ...state.generationRun,
          error,
          status: 'error',
        },
        variants,
      )

      return {
        sessionStats: mergeSessionStats(
          state.sessionStats,
          getSessionStatsDelta(state.generationRun.variants, variants),
        ),
        generationRun: {
          ...nextRun,
          error: nextRun.status === 'error' ? error : nextRun.error,
        },
      }
    }),
  resetGenerationRun: () =>
    set((state) => ({
      generationRun: {
        ...createEmptyRunState(),
        workspace: state.generationRun.workspace,
      },
    })),
  resetGenerationState: () => {
    const state = get()

    releaseSlots(Object.values(state.assets))
    releaseSlots(state.products)

    set({
      ...createInitialState(),
      sessionStats: state.sessionStats,
    })
  },
  disposeGenerationState: () => {
    const state = get()

    releaseSlots(Object.values(state.assets))
    releaseSlots(state.products)

    set(createInitialState())
  },
}))

export type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CreativeStyle,
  GenerationRun,
  GenerationRunStatus,
  GenerationSessionStats,
  GenerationVariant,
  ImageModelOption,
  NamedAssetKey,
  OutputQuality,
  ProductCategory,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
