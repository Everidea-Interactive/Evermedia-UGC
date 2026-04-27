import type {
  AssetSlot,
  NamedAssetSlots,
  OutputQuality,
  SubjectMode,
  VideoDuration,
} from '@/lib/generation/types'

type PrimaryReferenceInput = {
  assets: Pick<NamedAssetSlots, 'endFrame' | 'face1' | 'face2'>
  products: AssetSlot[]
  subjectMode: SubjectMode
}

export function isAssetSlotLoaded(
  slot: Pick<AssetSlot, 'file'> | null | undefined,
): boolean {
  return Boolean(slot?.file)
}

export function choosePrimaryReferenceSlot(input: PrimaryReferenceInput) {
  const identityReference = isAssetSlotLoaded(input.assets.face1)
    ? input.assets.face1
    : isAssetSlotLoaded(input.assets.face2)
      ? input.assets.face2
      : null
  const primaryProduct =
    input.products.find((product) => isAssetSlotLoaded(product)) ?? null

  if (input.subjectMode === 'lifestyle' && identityReference) {
    return identityReference
  }

  return primaryProduct ?? identityReference
}

export function hasVeoReferenceSlot(input: PrimaryReferenceInput) {
  return Boolean(
    choosePrimaryReferenceSlot(input) || isAssetSlotLoaded(input.assets.endFrame),
  )
}

export function getGrokResolution(outputQuality: OutputQuality) {
  if (outputQuality === '1080p') {
    return '720p'
  }

  return '480p'
}

export function getNanoBananaResolution(outputQuality: OutputQuality) {
  return outputQuality === '4k' ? '2K' : '1K'
}

export function getKlingDuration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '10' : '5'
}

export function getGrokDuration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '10' : '6'
}

export function getSeedanceDuration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '12' : '8'
}
