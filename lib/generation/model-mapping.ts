import type {
  AssetSlot,
  ImageResolution,
  MarketVideoResolution,
  NamedAssetSlots,
  OutputQuality,
  StandardVideoResolution,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
} from '@/lib/generation/types'

type NumericVideoDuration = Exclude<VideoDuration, 'base' | 'extended'>

type PrimaryReferenceInput = {
  assets: Pick<NamedAssetSlots, 'endFrame' | 'face1' | 'face2' | 'firstFrame'>
  products: AssetSlot[]
  subjectMode: SubjectMode
}

type VideoDurationSpec = {
  defaultValue: NumericVideoDuration
  legacyExtendedValue: NumericVideoDuration
  marks?: readonly NumericVideoDuration[]
  max: NumericVideoDuration
  min: NumericVideoDuration
  step: 1 | 2
}

export const allVideoDurations: NumericVideoDuration[] = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
]

const limitedVideoQualities: OutputQuality[] = ['480p', '720p']
const defaultVideoQualities: OutputQuality[] = ['720p', '1080p']
const outputQualityRank: Record<OutputQuality, number> = {
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
  '4k': 2160,
}

const videoDurationSpecs: Record<VideoModelOption, VideoDurationSpec> = {
  'grok-imagine-video-1.5': {
    defaultValue: 8,
    legacyExtendedValue: 15,
    max: 15,
    min: 3,
    step: 1,
  },
  'kling-3.0': {
    defaultValue: 5,
    legacyExtendedValue: 10,
    max: 15,
    min: 3,
    step: 1,
  },
  'seedance-1.5-pro': {
    defaultValue: 8,
    legacyExtendedValue: 12,
    max: 12,
    min: 4,
    step: 1,
  },
  'seedance-2': {
    defaultValue: 5,
    legacyExtendedValue: 10,
    max: 15,
    min: 4,
    step: 1,
  },
  'seedance-2-mini': {
    defaultValue: 8,
    legacyExtendedValue: 15,
    max: 15,
    min: 4,
    step: 1,
  },
  'veo-3.1': {
    defaultValue: 8,
    legacyExtendedValue: 8,
    marks: [4, 6, 8],
    max: 8,
    min: 4,
    step: 2,
  },
}

export function isAssetSlotLoaded(
  slot: Pick<AssetSlot, 'file'> | null | undefined,
) {
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

export function getGrokResolution(outputQuality: OutputQuality): MarketVideoResolution {
  return outputQuality === '720p' ? '720p' : '480p'
}

export function getSeedance2MiniResolution(
  outputQuality: OutputQuality,
): MarketVideoResolution {
  return outputQuality === '720p' ? '720p' : '480p'
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

export function getVideoResolution(
  outputQuality: OutputQuality,
): StandardVideoResolution {
  return outputQuality === '1080p' ? '1080p' : '720p'
}

export function getSupportedVideoQualities(videoModel: VideoModelOption): OutputQuality[] {
  switch (videoModel) {
    case 'grok-imagine-video-1.5':
    case 'seedance-2-mini':
      return limitedVideoQualities
    default:
      return defaultVideoQualities
  }
}

export function normalizeVideoOutputQuality(
  videoModel: VideoModelOption,
  outputQuality: OutputQuality,
): OutputQuality {
  const normalizedQuality = outputQuality === '4k' ? '1080p' : outputQuality
  const supportedQualities = getSupportedVideoQualities(videoModel)

  if (supportedQualities.includes(normalizedQuality)) {
    return normalizedQuality
  }

  const targetRank = outputQualityRank[normalizedQuality]
  let closestQuality = supportedQualities[0] ?? '720p'
  let closestDistance = Number.POSITIVE_INFINITY

  for (const quality of supportedQualities) {
    const distance = Math.abs(outputQualityRank[quality] - targetRank)

    if (distance < closestDistance) {
      closestQuality = quality
      closestDistance = distance
    }
  }

  return closestQuality
}

export function getMaxVideoReferenceCount(videoModel: VideoModelOption) {
  switch (videoModel) {
    case 'grok-imagine-video-1.5':
    case 'seedance-1.5-pro':
    case 'seedance-2-mini':
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
  return (
    videoModel === 'veo-3.1' ||
    videoModel === 'seedance-2-mini' ||
    videoModel === 'seedance-2' ||
    videoModel === 'kling-3.0'
  )
}

export function supportsVideoFirstLastFramePair(videoModel: VideoModelOption) {
  return (
    videoModel === 'seedance-2-mini' ||
    videoModel === 'seedance-2' ||
    videoModel === 'kling-3.0'
  )
}

export function getVideoDurationSpec(videoModel: VideoModelOption) {
  return videoDurationSpecs[videoModel]
}

export function getVideoDurationOptions(videoModel: VideoModelOption): NumericVideoDuration[] {
  const spec = getVideoDurationSpec(videoModel)

  if (spec.marks) {
    return [...spec.marks]
  }

  return allVideoDurations.filter(
    (duration) => duration >= spec.min && duration <= spec.max,
  )
}

export function isVideoDurationSupported(
  videoModel: VideoModelOption,
  videoDuration: number,
): videoDuration is NumericVideoDuration {
  return getVideoDurationOptions(videoModel).includes(videoDuration as NumericVideoDuration)
}

export function normalizeVideoDurationForModel(
  videoModel: VideoModelOption,
  videoDuration: number | VideoDuration | null | undefined,
) {
  const spec = getVideoDurationSpec(videoModel)

  if (videoDuration === 'base') {
    return spec.defaultValue
  }

  if (videoDuration === 'extended') {
    return spec.legacyExtendedValue
  }

  if (!Number.isFinite(videoDuration)) {
    return spec.defaultValue
  }

  const rounded = Math.round(videoDuration as number)

  if (spec.marks) {
    const fallback = spec.marks[0] ?? spec.defaultValue

    return (
      spec.marks.find((mark) => mark === rounded) ??
      spec.marks.reduce(
        (closest, mark) =>
          Math.abs(mark - rounded) < Math.abs(closest - rounded) ? mark : closest,
        fallback,
      )
    )
  }

  return Math.min(spec.max, Math.max(spec.min, rounded)) as NumericVideoDuration
}

export function assertVideoDurationForModel(
  videoModel: VideoModelOption,
  videoDuration: number | VideoDuration,
) {
  const normalized = normalizeVideoDurationForModel(videoModel, videoDuration)

  if (!isVideoDurationSupported(videoModel, normalized)) {
    const options = getVideoDurationOptions(videoModel).join(', ')
    throw new Error(`Invalid duration for ${videoModel}. Allowed seconds: ${options}.`)
  }

  return normalized
}

export function getVideoDurationLabel(videoDuration: VideoDuration) {
  const normalized =
    videoDuration === 'base' || videoDuration === 'extended' ? videoDuration : String(videoDuration)

  return normalized === 'base' || normalized === 'extended'
    ? normalized
    : `${normalized}s`
}

export function getGrokDuration(videoDuration: VideoDuration) {
  return assertVideoDurationForModel('grok-imagine-video-1.5', videoDuration)
}

export function getSeedanceDuration(videoDuration: VideoDuration) {
  return assertVideoDurationForModel('seedance-1.5-pro', videoDuration)
}

export function getSeedance2Duration(videoDuration: VideoDuration) {
  return assertVideoDurationForModel('seedance-2', videoDuration)
}

export function getSeedance2MiniDuration(videoDuration: VideoDuration) {
  return assertVideoDurationForModel('seedance-2-mini', videoDuration)
}

export function getKling3Duration(videoDuration: VideoDuration) {
  return assertVideoDurationForModel('kling-3.0', videoDuration)
}

export function getVideoDurationSeconds(
  videoModel: VideoModelOption,
  videoDuration: VideoDuration,
) {
  return assertVideoDurationForModel(videoModel, videoDuration)
}
