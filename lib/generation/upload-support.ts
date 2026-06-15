import type { ImageModelOption, VideoModelOption } from '@/lib/generation/types'

type UploadSupport = {
  accept: string
  hint: string
}

const jpegPngWebpAccept =
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const seedance2ImageAccept =
  '.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,.gif,image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif'
const jpgPngAccept = '.jpg,.jpeg,.png,image/jpeg,image/png'
const motionControlVideoAccept = '.mp4,.mov,video/mp4,video/quicktime'

export function getImageModelUploadSupport(
  imageModel: ImageModelOption,
): UploadSupport {
  switch (imageModel) {
    case 'nano-banana':
    default:
      return {
        accept: jpegPngWebpAccept,
        hint: 'Nano Banana 2 supports JPEG, PNG, and WebP uploads up to 30MB per image.',
      }
  }
}

export function getVideoModelImageUploadSupport(
  videoModel: VideoModelOption,
): UploadSupport {
  switch (videoModel) {
    case 'seedance-1.5-pro':
      return {
        accept: jpegPngWebpAccept,
        hint: 'Seedance 1.5 Pro supports JPEG, PNG, and WebP uploads up to 10MB per image.',
      }
    case 'seedance-2':
      return {
        accept: seedance2ImageAccept,
        hint: 'Seedance 2.0 supports JPEG, PNG, WebP, BMP, TIFF, and GIF uploads up to 30MB per image.',
      }
    case 'kling-3.0':
      return {
        accept: jpgPngAccept,
        hint: 'Kling 3.0 supports JPG and PNG uploads up to 10MB per image.',
      }
    case 'veo-3.1':
    default:
      return {
        accept: 'image/*',
        hint: 'Veo 3.1 supports common guidance image formats such as JPG, PNG, and WebP.',
      }
  }
}

export function getMotionControlImageUploadSupport(): UploadSupport {
  return {
    accept: jpgPngAccept,
    hint: 'Kling 3.0 Motion Control reference images support JPEG, PNG, or JPG up to 10MB each.',
  }
}

export function getMotionControlVideoUploadSupport(): UploadSupport {
  return {
    accept: motionControlVideoAccept,
    hint: 'Kling 3.0 Motion Control motion videos support MP4 or QuickTime up to 100MB each and must run 3-30 seconds.',
  }
}
