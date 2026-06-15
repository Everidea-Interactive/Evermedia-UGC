import 'server-only'

import sharp from 'sharp'

import {
  isConvertibleUploadImage,
  isFileSupportedByImageProfile,
  type ImageUploadProfile,
} from '@/lib/generation/image-upload-support'

function replaceFileExtension(name: string, nextExtension: '.jpg' | '.png') {
  const trimmedName = name.trim()
  const index = trimmedName.lastIndexOf('.')
  const basename = index > 0 ? trimmedName.slice(0, index) : trimmedName || 'upload'

  return `${basename}${nextExtension}`
}

function toFilePart(buffer: Buffer) {
  return Uint8Array.from(buffer)
}

export async function normalizeImageFileForProfile(
  file: File,
  profile: ImageUploadProfile,
) {
  if (isFileSupportedByImageProfile(file, profile) || !isConvertibleUploadImage(file)) {
    return file
  }

  const input = Buffer.from(await file.arrayBuffer())
  const pipeline = sharp(input).rotate()
  const metadata = await pipeline.metadata()
  const supportsPng = profile.supportedMimeTypes.has('image/png')
  const supportsJpeg = profile.supportedMimeTypes.has('image/jpeg')
  const shouldUsePng = Boolean(metadata.hasAlpha) && supportsPng

  if (shouldUsePng) {
    const bytes = await pipeline.png().toBuffer()
    return new File([toFilePart(bytes)], replaceFileExtension(file.name, '.png'), {
      type: 'image/png',
    })
  }

  if (!supportsJpeg && supportsPng) {
    const bytes = await pipeline.png().toBuffer()
    return new File([toFilePart(bytes)], replaceFileExtension(file.name, '.png'), {
      type: 'image/png',
    })
  }

  const bytes = await pipeline
    .jpeg({
      mozjpeg: true,
      quality: 90,
    })
    .toBuffer()

  return new File([toFilePart(bytes)], replaceFileExtension(file.name, '.jpg'), {
    type: 'image/jpeg',
  })
}
