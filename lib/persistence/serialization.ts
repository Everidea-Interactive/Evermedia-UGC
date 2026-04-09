import type { GenerationRun, GenerationSnapshot } from '@/lib/generation/types'
import type {
  GenerationRunRecord,
  GenerationVariantRecord,
  ProductSlotKey,
  ProjectAssetRecord,
  ProjectConfigSnapshot,
  ProjectSlotKey,
  StudioProjectRecord,
} from '@/lib/persistence/types'

function isActiveRunStatus(status: GenerationRun['status']) {
  return (
    status === 'queued' ||
    status === 'uploading' ||
    status === 'submitting' ||
    status === 'rendering'
  )
}

export const defaultProjectConfigSnapshot: ProjectConfigSnapshot = {
  activeTab: 'image',
  batchSize: 1,
  cameraMovement: 'orbit',
  characterAgeGroup: 'any',
  characterEthnicity: 'any',
  characterGender: 'any',
  creativeStyle: 'ugc-lifestyle',
  figureArtDirection: 'none',
  imageModel: 'nano-banana',
  outputQuality: '1080p',
  productCategory: 'cosmetics',
  shotEnvironment: 'indoor',
  subjectMode: 'lifestyle',
  textPrompt: '',
  videoDuration: 'base',
  videoModel: 'veo-3.1',
}

export function normalizeProjectConfigSnapshot(
  snapshot: Partial<ProjectConfigSnapshot>,
): ProjectConfigSnapshot {
  const mergedSnapshot: ProjectConfigSnapshot = {
    ...defaultProjectConfigSnapshot,
    ...snapshot,
  }

  if (mergedSnapshot.subjectMode === 'lifestyle') {
    return mergedSnapshot
  }

  return {
    ...mergedSnapshot,
    characterAgeGroup: 'any',
    characterEthnicity: 'any',
    characterGender: 'any',
    figureArtDirection: 'none',
  }
}

export function createProjectConfigSnapshot(
  snapshot: GenerationSnapshot,
): ProjectConfigSnapshot {
  return normalizeProjectConfigSnapshot({
    activeTab: snapshot.activeTab,
    batchSize: snapshot.batchSize,
    cameraMovement: snapshot.cameraMovement,
    characterAgeGroup: snapshot.characterAgeGroup,
    characterEthnicity: snapshot.characterEthnicity,
    characterGender: snapshot.characterGender,
    creativeStyle: snapshot.creativeStyle,
    figureArtDirection: snapshot.figureArtDirection,
    imageModel: snapshot.imageModel,
    outputQuality: snapshot.outputQuality,
    productCategory: snapshot.productCategory,
    shotEnvironment: snapshot.shotEnvironment,
    subjectMode: snapshot.subjectMode,
    textPrompt: snapshot.textPrompt,
    videoDuration: snapshot.videoDuration,
    videoModel: snapshot.videoModel,
  })
}

export function getProductSlotKey(position: number): ProductSlotKey {
  return `product-${position}` as ProductSlotKey
}

export function isProductSlotKey(value: string | null): value is ProductSlotKey {
  return value === 'product-1' || value === 'product-2'
}

export function isReferenceAssetForSlot(
  asset: ProjectAssetRecord,
  slotKey: ProjectSlotKey,
) {
  return asset.kind === 'reference' && asset.slotKey === slotKey
}

export function getReferenceAssetMap(project: StudioProjectRecord) {
  return new Map(
    project.referenceAssets
      .filter((asset) => asset.kind === 'reference' && asset.slotKey)
      .map((asset) => [asset.slotKey, asset] as const),
  )
}

function createResultForVariant(
  variant: GenerationVariantRecord,
  assetMap: Map<string, ProjectAssetRecord>,
  workspace: GenerationRunRecord['workspace'],
) {
  if (!variant.resultAssetId) {
    return null
  }

  const asset = assetMap.get(variant.resultAssetId)

  if (!asset) {
    return null
  }

  return {
    model: '',
    taskId: variant.taskId ?? asset.id,
    thumbnailUrl:
      workspace === 'video' ? `/api/media/${asset.id}` : undefined,
    type: workspace === 'video' ? ('video' as const) : ('image' as const),
    url: `/api/media/${asset.id}`,
  }
}

export function createGenerationRunState(
  run: GenerationRunRecord | null,
  outputAssets: ProjectAssetRecord[],
): GenerationRun {
  if (!run) {
    return {
      cancelRequestedAt: null,
      completedAt: null,
      createdAt: null,
      error: null,
      model: null,
      parentRunId: null,
      projectId: null,
      provider: null,
      runId: null,
      selectedVariantId: null,
      startedAt: null,
      status: 'idle',
      uploadedAssets: [],
      variants: [],
      workspace: null,
    }
  }

  const assetMap = new Map(outputAssets.map((asset) => [asset.id, asset]))
  const cancelPending = Boolean(run.cancelRequestedAt && isActiveRunStatus(run.status))
  const variants = run.variants.map((variant) => ({
    completedAt: variant.completedAt,
    createdAt: variant.createdAt,
    error:
      cancelPending &&
      (variant.status === 'queued' ||
        variant.status === 'submitting' ||
        variant.status === 'rendering')
        ? 'Run cancelled.'
        : variant.error,
    index: variant.variantIndex,
    isHero: variant.isHero,
    profile: variant.profile,
    prompt: variant.prompt,
    result:
      createResultForVariant(variant, assetMap, run.workspace) &&
      run.model.length > 0
        ? {
            ...createResultForVariant(variant, assetMap, run.workspace)!,
            model: run.model,
          }
        : null,
    reviewNotes: variant.reviewNotes,
    reviewStatus: variant.reviewStatus,
    selectedForDelivery: variant.selectedForDelivery,
    status:
      cancelPending &&
      (variant.status === 'queued' ||
        variant.status === 'submitting' ||
        variant.status === 'rendering')
        ? 'cancelled'
        : variant.status,
    taskId: variant.taskId,
    variantId: variant.id,
  }))
  const selectedVariantId =
    variants.find((variant) => variant.isHero && variant.result)?.variantId ??
    variants.find((variant) => variant.status === 'success' && variant.result)?.variantId ??
    null

  return {
    cancelRequestedAt: run.cancelRequestedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    error:
      cancelPending
        ? null
        : run.status === 'error'
        ? run.variants.find((variant) => variant.error)?.error ?? null
        : null,
    model: run.model,
    parentRunId: run.parentRunId,
    projectId: run.projectId,
    provider: run.provider,
    runId: run.id,
    selectedVariantId,
    startedAt: Date.parse(run.createdAt),
    status: cancelPending ? 'cancelled' : run.status,
    uploadedAssets: run.uploadedAssets,
    variants,
    workspace: run.workspace,
  }
}
