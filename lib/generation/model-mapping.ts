import type {
  AssetSlot,
  ImageResolution,
  NamedAssetSlots,
  OutputQuality,
  SubjectMode,
  VideoModelOption,
  VideoDuration,
  VideoResolution,
} from '@/lib/generation/types'

type PrimaryReferenceInput = {
  assets: Pick<NamedAssetSlots, 'endFrame' | 'face1' | 'face2' | 'firstFrame'>
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

export function getImageResolution(outputQuality: OutputQuality): ImageResolution {
  if (outputQuality === '4k') {
    return '4K'
  }

  if (outputQuality === '1080p') {
    return '2K'
  }

  return '1K'
}

export function getNanoBananaResolution(outputQuality: OutputQuality) {
  return getImageResolution(outputQuality)
}

export function getVideoResolution(outputQuality: OutputQuality): VideoResolution {
  return outputQuality === '1080p' ? '1080p' : '720p'
}

export function getMaxVideoReferenceCount(videoModel: VideoModelOption) {
  switch (videoModel) {
    case 'seedance-1.5-pro':
    case 'seedance-2':
      return 2
    case 'kling-3.0':
      return 0
    case 'veo-3.1':
    default:
      return 3
  }
}

export function supportsVideoEndFrameGuidance(videoModel: VideoModelOption) {
  return videoModel === 'veo-3.1' || videoModel === 'seedance-2' || videoModel === 'kling-3.0'
}

export function supportsVideoFirstLastFramePair(videoModel: VideoModelOption) {
  return videoModel === 'seedance-2' || videoModel === 'kling-3.0'
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

export function getSeedance2Duration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '10' : '5'
}

export function getKling3Duration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '10' : '5'
}

export function getVideoDurationSeconds(
  videoModel: VideoModelOption,
  videoDuration: VideoDuration,
) {
  switch (videoModel) {
    case 'seedance-2':
      return getSeedance2Duration(videoDuration)
    case 'seedance-1.5-pro':
      return getSeedanceDuration(videoDuration)
    case 'kling-3.0':
      return getKling3Duration(videoDuration)
    case 'veo-3.1':
    default:
      return '8'
  }
}
