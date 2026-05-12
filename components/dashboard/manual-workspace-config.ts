import type { LucideIcon } from 'lucide-react'
import {
  Brush,
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
  VideoDuration,
  VideoAudio,
  VideoModelOption,
} from '@/lib/generation/types'

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
    helper: 'Prompt-led short motion clips',
    label: 'Grok Imagine',
    value: 'grok-imagine',
  },
  {
    helper: 'Market-model text or image video',
    label: 'Kling',
    value: 'kling',
  },
  {
    helper: 'ByteDance 8s or 12s pro video generation',
    label: 'Seedance 1.5 Pro',
    value: 'seedance-1.5-pro',
  },
  {
    helper: 'Reference and end-frame video renders',
    label: 'Veo 3.1',
    value: 'veo-3.1',
  },
]

export const imageQualities: OutputQuality[] = ['720p', '1080p', '4k']
export const videoQualities: OutputQuality[] = ['720p', '1080p']
export const durations: VideoDuration[] = ['base', 'extended']
export const videoAudioOptions: VideoAudio[] = ['no-audio', 'with-audio']

export function getVideoAudioLabel(videoAudio: VideoAudio) {
  return videoAudio === 'with-audio' ? 'With audio' : 'No audio'
}

export function supportsVideoAudioSelection(model: VideoModelOption) {
  return model === 'kling' || model === 'seedance-1.5-pro'
}

export function getForcedVideoAudio(model: VideoModelOption): VideoAudio | null {
  if (supportsVideoAudioSelection(model)) {
    return null
  }

  return 'with-audio'
}

export function getVideoDurationLabel(
  model: VideoModelOption,
  duration: VideoDuration,
) {
  if (model === 'kling') {
    return duration === 'base' ? 'Base (5s)' : 'Extended (10s)'
  }

  if (model === 'grok-imagine') {
    return duration === 'base' ? 'Base (6s)' : 'Extended (10s)'
  }

  if (model === 'seedance-1.5-pro') {
    return duration === 'base' ? 'Base (8s)' : 'Extended (12s)'
  }

  return '8s'
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
