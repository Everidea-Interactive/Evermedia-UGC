import type { LucideIcon } from 'lucide-react'
import {
  Brush,
  Copyright,
  CupSoda,
  Gem,
  House,
  Laptop,
  Leaf,
  MapPin,
  Package2,
  Shirt,
  Sparkles,
  UserRound,
} from 'lucide-react'

import type {
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  ImageModelOption,
  KiePricingResponse,
  NamedAssetKey,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  VideoAudio,
  VideoModelOption,
} from '@/lib/generation/types'
import {
  getMaxVideoReferenceCount,
  getVideoDurationLabel,
  getVideoDurationOptions,
  getVideoDurationSpec,
  getSupportedVideoQualities,
} from '@/lib/generation/model-mapping'

export const productCategories: Array<{
  icon: LucideIcon
  label: string
  value: ProductCategory
}> = [
  { icon: CupSoda, label: 'Food & Drink', value: 'food-drink' },
  { icon: Gem, label: 'Jewelry', value: 'jewelry' },
  { icon: Sparkles, label: 'Cosmetics & Beauty', value: 'cosmetics' },
  { icon: Laptop, label: 'Electronics & Tech', value: 'electronics' },
  { icon: Shirt, label: 'Clothing & Fashion', value: 'clothing' },
  { icon: Package2, label: 'Miscellaneous', value: 'miscellaneous' },
]

export const creativeStyles: Array<{
  label: string
  value: CreativeStyle
}> = [
  { label: 'UGC / Lifestyle', value: 'ugc-lifestyle' },
  { label: 'Hollywood Cinematic', value: 'cinematic' },
  { label: 'TV Commercial', value: 'tv-commercial' },
  {
    label: 'Elite Product Commercial',
    value: 'elite-product-commercial',
  },
]

export const subjectModes: Array<{
  description: string
  label: string
  value: SubjectMode
}> = [
  {
    description:
      'Lifestyle image with a person naturally interacting with the product.',
    label: 'Lifestyle',
    value: 'lifestyle',
  },
  {
    description: 'Keep the product as the sole hero subject with no visible person.',
    label: 'Product Only',
    value: 'product-only',
  },
]

export const shotEnvironments: Array<{
  description: string
  icon: LucideIcon
  label: string
  value: ShotEnvironment
}> = [
  {
    description: 'Studio, interior, curated indoor environment.',
    icon: House,
    label: 'Indoor',
    value: 'indoor',
  },
  {
    description: 'Exterior location with natural environmental context.',
    icon: Leaf,
    label: 'Outdoor',
    value: 'outdoor',
  },
]

export const characterGenders: Array<{
  label: string
  value: CharacterGender
}> = [
  { label: 'Any', value: 'any' },
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-Binary', value: 'non-binary' },
]

export const characterAgeGroups: Array<{
  label: string
  value: CharacterAgeGroup
}> = [
  { label: 'Any', value: 'any' },
  { label: 'Young Adult', value: 'young-adult' },
  { label: 'Adult', value: 'adult' },
  { label: 'Middle Aged', value: 'middle-aged' },
  { label: 'Senior', value: 'senior' },
]

export const figureArtDirections: Array<{
  description: string
  label: string
  value: FigureArtDirection
}> = [
  {
    description: 'Default',
    label: 'None',
    value: 'none',
  },
  {
    description: 'Full figure, dramatic curves, fashion-forward.',
    label: 'Curvaceous',
    value: 'curvaceous-editorial',
  },
]

export const batchSizes: BatchSize[] = [1, 2, 3, 4]

export const cameraMovements: Array<{
  label: string
  value: CameraMovement
}> = [
  { label: 'Orbit', value: 'orbit' },
  { label: 'Dolly', value: 'dolly' },
  { label: 'Drone', value: 'drone' },
  { label: 'Crash Zoom', value: 'crash-zoom' },
  { label: 'Macro', value: 'macro' },
]

export const imageModels: Array<{
  helper: string
  label: string
  value: ImageModelOption
}> = [
  {
    helper: 'Google image generation with direct reference input',
    label: 'Nano Banana 2',
    value: 'nano-banana',
  },
]

export const videoModels: Array<{
  helper: string
  label: string
  value: VideoModelOption
}> = [
  {
    helper: 'xAI 3s-15s image-guided video generation with synced native audio',
    label: 'Grok Imagine Video 1.5',
    value: 'grok-imagine-video-1.5',
  },
  {
    helper: 'Kuaishou 3s-15s video generation with native audio',
    label: 'Kling 3.0',
    value: 'kling-3.0',
  },
  {
    helper: 'ByteDance 4s-15s image or frame guided video generation',
    label: 'Seedance 2 Mini',
    value: 'seedance-2-mini',
  },
  {
    helper: 'ByteDance 4s-15s video generation',
    label: 'Seedance 2.0',
    value: 'seedance-2',
  },
  {
    helper: 'ByteDance 4s-12s pro video generation',
    label: 'Seedance 1.5 Pro',
    value: 'seedance-1.5-pro',
  },
  {
    helper: 'Veo 3.1 generation at 4s, 6s, or 8s',
    label: 'Veo 3.1',
    value: 'veo-3.1',
  },
]

export const imageQualities: OutputQuality[] = ['720p', '1080p', '4k']
export const videoAudioOptions: VideoAudio[] = ['no-audio', 'with-audio']

export function getVideoAudioLabel(videoAudio: VideoAudio) {
  return videoAudio === 'with-audio' ? 'With audio' : 'No audio'
}

export function supportsVideoAudioSelection(model: VideoModelOption) {
  return (
    model === 'seedance-1.5-pro' ||
    model === 'seedance-2-mini' ||
    model === 'seedance-2' ||
    model === 'kling-3.0'
  )
}

export function supportsAdditionalVideoReferences(model: VideoModelOption) {
  return getMaxVideoReferenceCount(model) > 1
}

export function getForcedVideoAudio(model: VideoModelOption): VideoAudio | null {
  if (supportsVideoAudioSelection(model)) {
    return null
  }

  return 'with-audio'
}

export function getVideoDurationHelperText(model: VideoModelOption) {
  const spec = getVideoDurationSpec(model)
  const options = getVideoDurationOptions(model)

  if (spec.marks) {
    return `Allowed lengths: ${options.map(getVideoDurationLabel).join(', ')}`
  }

  return `Allowed range: ${getVideoDurationLabel(spec.min)}-${getVideoDurationLabel(spec.max)}`
}

export function getImageQualityOptions(
  imageModel: ImageModelOption,
  kiePricing: KiePricingResponse | null,
) {
  return kiePricing?.supportedImageQualities?.[imageModel] ?? imageQualities
}

export function getImageQualityLabel(quality: OutputQuality) {
  if (quality === '720p') return '1K'
  if (quality === '1080p') return '2K'
  return '4K'
}

export function getVideoQualityOptions(videoModel: VideoModelOption) {
  return getSupportedVideoQualities(videoModel)
}

export const peopleReferenceCards: Array<{
  icon: LucideIcon
  key: Extract<NamedAssetKey, 'face1' | 'face2'>
  label: string
}> = [
  {
    icon: UserRound,
    key: 'face1',
    label: 'Face 1',
  },
  {
    icon: UserRound,
    key: 'face2',
    label: 'Face 2',
  },
]

export const styleReferenceCards: Array<{
  icon: LucideIcon
  key: Extract<NamedAssetKey, 'clothing' | 'location'>
  label: string
}> = [
  {
    icon: Brush,
    key: 'clothing',
    label: 'Clothing',
  },
  {
    icon: MapPin,
    key: 'location',
    label: 'Location',
  },
]

export const miscReferenceCards: Array<{
  icon: LucideIcon
  key: Extract<NamedAssetKey, 'brandLogo'>
  label: string
}> = [
  {
    icon: Copyright,
    key: 'brandLogo',
    label: 'Brand Logo',
  },
]
