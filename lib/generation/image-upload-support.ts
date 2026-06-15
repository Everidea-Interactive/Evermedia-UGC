import type { ImageModelOption, VideoModelOption } from '@/lib/generation/types'

export type ImageUploadProfile = {
  supportedMimeTypes: ReadonlySet<string>
}

const mimeTypeByExtension = new Map<string, string>([
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
  ['.gif', 'image/gif'],
  ['.heic', 'image/heic'],
  ['.heif', 'image/heif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.webp', 'image/webp'],
])

const convertibleMimeTypes = new Set([
  'image/avif',
  'image/bmp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/webp',
])

const convertibleExtensions = new Set([
  '.avif',
  '.bmp',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
  '.webp',
])

const jpegPngWebpProfile = createProfile([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const jpegPngWebpGifProfile = createProfile([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const seedance2ImageProfile = createProfile([
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
])
const jpegPngProfile = createProfile([
  'image/jpeg',
  'image/png',
])

function createProfile(mimeTypes: string[]): ImageUploadProfile {
  return {
    supportedMimeTypes: new Set(mimeTypes),
  }
}

function getFileExtension(name: string) {
  const normalizedName = name.trim().toLowerCase()
  const index = normalizedName.lastIndexOf('.')

  return index >= 0 ? normalizedName.slice(index) : ''
}

function getNormalizedMimeType(file: File) {
  const normalizedType = file.type.trim().toLowerCase()

  if (normalizedType) {
    return normalizedType
  }

  return mimeTypeByExtension.get(getFileExtension(file.name)) ?? ''
}

export function isConvertibleUploadImage(file: File) {
  const normalizedMimeType = getNormalizedMimeType(file)

  if (convertibleMimeTypes.has(normalizedMimeType)) {
    return true
  }

  return convertibleExtensions.has(getFileExtension(file.name))
}

export function isFileSupportedByImageProfile(
  file: File,
  profile: ImageUploadProfile,
) {
  return profile.supportedMimeTypes.has(getNormalizedMimeType(file))
}

export function getImageUploadAccept(profile: ImageUploadProfile) {
  const entries = new Set<string>()

  for (const mimeType of profile.supportedMimeTypes) {
    entries.add(mimeType)
  }

  for (const mimeType of convertibleMimeTypes) {
    entries.add(mimeType)
  }

  for (const [extension, mimeType] of mimeTypeByExtension.entries()) {
    if (profile.supportedMimeTypes.has(mimeType) || convertibleExtensions.has(extension)) {
      entries.add(extension)
    }
  }

  return Array.from(entries).join(',')
}

export function getImageUploadSupportProfile(
  kind: 'guided-hero' | 'ideation-hero' | 'motion-control-image',
): ImageUploadProfile
export function getImageUploadSupportProfile(
  kind: 'image-model',
  model: ImageModelOption,
): ImageUploadProfile
export function getImageUploadSupportProfile(
  kind: 'video-model-image',
  model: VideoModelOption,
): ImageUploadProfile
export function getImageUploadSupportProfile(
  kind:
    | 'guided-hero'
    | 'ideation-hero'
    | 'image-model'
    | 'motion-control-image'
    | 'video-model-image',
  model?: ImageModelOption | VideoModelOption,
): ImageUploadProfile {
  switch (kind) {
    case 'guided-hero':
    case 'ideation-hero':
      return jpegPngWebpGifProfile
    case 'image-model':
      switch (model) {
        case 'nano-banana':
        default:
          return jpegPngWebpProfile
      }
    case 'video-model-image':
      switch (model) {
        case 'seedance-1.5-pro':
          return jpegPngWebpProfile
        case 'seedance-2':
          return seedance2ImageProfile
        case 'kling-3.0':
          return jpegPngProfile
        case 'veo-3.1':
        default:
          return jpegPngWebpProfile
      }
    case 'motion-control-image':
    default:
      return jpegPngProfile
  }
}
