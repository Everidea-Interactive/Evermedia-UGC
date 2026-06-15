import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  getImageUploadSupportProfile,
  isConvertibleUploadImage,
} from '@/lib/generation/image-upload-support'
import { normalizeImageFileForProfile } from '@/lib/generation/upload-normalization'
import {
  getImageModelUploadSupport,
  getMotionControlImageUploadSupport,
  getVideoModelImageUploadSupport,
} from '@/lib/generation/upload-support'

async function createWebpFile() {
  const bytes = await sharp({
    create: {
      background: { alpha: 1, b: 80, g: 120, r: 160 },
      channels: 3,
      height: 2,
      width: 2,
    },
  })
    .webp()
    .toBuffer()

  return new File([Uint8Array.from(bytes)], 'sample.webp', { type: 'image/webp' })
}

describe('upload normalization', () => {
  it('treats heic uploads as convertible even when mime type is missing', () => {
    const file = new File(['stub'], 'photo.heic', { type: '' })

    expect(isConvertibleUploadImage(file)).toBe(true)
  })

  it('widens model accept strings to include convertible raster formats', () => {
    expect(getImageModelUploadSupport('nano-banana').accept).toContain('.heic')
    expect(getVideoModelImageUploadSupport('kling-3.0').accept).toContain('.avif')
    expect(getMotionControlImageUploadSupport().accept).toContain('.tiff')
  })

  it('converts unsupported but convertible images into kling-safe uploads', async () => {
    const file = await createWebpFile()

    const normalized = await normalizeImageFileForProfile(
      file,
      getImageUploadSupportProfile('video-model-image', 'kling-3.0'),
    )

    expect(normalized.type).toMatch(/^image\/(jpeg|png)$/)
    expect(normalized.name).toMatch(/\.(jpg|png)$/)
  })
})
