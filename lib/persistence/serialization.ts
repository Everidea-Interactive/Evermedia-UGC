import type { GenerationSnapshot } from '@/lib/generation/types'
import type {
  ProductSlotKey,
  ProjectAssetRecord,
  ProjectConfigSnapshot,
  ProjectSlotKey,
  StudioProjectRecord,
} from '@/lib/persistence/types'

export const defaultProjectConfigSnapshot: ProjectConfigSnapshot = {
  activeTab: 'image',
  batchSize: 1,
  cameraMovement: 'orbit',
  creativeStyle: 'ugc-lifestyle',
  imageModel: 'nano-banana',
  outputQuality: '1080p',
  productCategory: 'cosmetics',
  subjectMode: 'lifestyle',
  textPrompt: '',
  videoDuration: 'base',
  videoModel: 'veo-3.1',
}

export function createProjectConfigSnapshot(
  snapshot: GenerationSnapshot,
): ProjectConfigSnapshot {
  return {
    activeTab: snapshot.activeTab,
    batchSize: snapshot.batchSize,
    cameraMovement: snapshot.cameraMovement,
    creativeStyle: snapshot.creativeStyle,
    imageModel: snapshot.imageModel,
    outputQuality: snapshot.outputQuality,
    productCategory: snapshot.productCategory,
    subjectMode: snapshot.subjectMode,
    textPrompt: snapshot.textPrompt,
    videoDuration: snapshot.videoDuration,
    videoModel: snapshot.videoModel,
  }
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
