import { describe, expect, it } from 'vitest'

import { buildManualGenerationFormData } from '@/lib/generation/client'
import type { AssetSlot, NamedAssetSlots } from '@/lib/generation/types'

function createSlot(id: string, label: string, file: File | null): AssetSlot {
  return {
    error: null,
    file,
    id,
    label,
    mimeType: file?.type ?? null,
    previewUrl: file ? `blob:${file.name}` : null,
    size: file?.size ?? null,
    uploadStatus: file ? 'staged' : 'idle',
  }
}

function createNamedAssets(): NamedAssetSlots {
  return {
    brandLogo: createSlot('brandLogo', 'Brand Logo', null),
    clothing: createSlot('clothing', 'Clothing', null),
    endFrame: createSlot('endFrame', 'End Frame', null),
    firstFrame: createSlot('firstFrame', 'First Frame', null),
    face1: createSlot('face1', 'Face 1', null),
    face2: createSlot('face2', 'Face 2', null),
    location: createSlot('location', 'Location', null),
  }
}

describe('motion control client payload', () => {
  it('serializes motion control inputs with dedicated workspace label', () => {
    const file = new File(['image'], 'ref.png', { type: 'image/png' })
    const video = new File(['video'], 'motion.mp4', { type: 'video/mp4' })

    const { formData } = buildManualGenerationFormData({
      activeTab: 'motion-control',
      assets: createNamedAssets(),
      batchSize: 1,
      cameraMovement: 'orbit',
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      imageModel: 'nano-banana',
      motionControl: {
        additionalInstructions: 'Keep the bottle readable.',
        motionVideo: createSlot('mv', 'Motion Video', video),
        preset: 'product',
        referenceImage: createSlot('ri', 'Reference Image', file),
        resolution: '1080p',
      },
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      products: [
        createSlot('product-1', 'Product 1', null),
        createSlot('product-2', 'Product 2', null),
      ],
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: '',
      videoAudio: 'no-audio',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      videoReferences: [
        createSlot('video-reference-1', 'Reference 1', null),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    expect(formData.get('workspace')).toBe('motion-control')
    expect(formData.get('motionControlPreset')).toBe('product')
    expect(formData.get('motionControlResolution')).toBe('1080p')
    expect(formData.get('motionControlAdditionalInstructions')).toBe(
      'Keep the bottle readable.',
    )
    expect(formData.get('asset_motionControlReferenceImage')).toBe(file)
    expect(formData.get('asset_motionControlMotionVideo')).toBe(video)
  })

  it('rejects swapped motion control media kinds before submit', () => {
    const image = new File(['image'], 'ref.png', { type: 'image/png' })
    const video = new File(['video'], 'motion.mp4', { type: 'video/mp4' })

    expect(() =>
      buildManualGenerationFormData({
        activeTab: 'motion-control',
        assets: createNamedAssets(),
        batchSize: 1,
        cameraMovement: 'orbit',
        characterAgeGroup: 'any',
        characterGender: 'any',
        creativeStyle: 'ugc-lifestyle',
        figureArtDirection: 'none',
        imageModel: 'nano-banana',
        motionControl: {
          additionalInstructions: 'Keep the bottle readable.',
          motionVideo: createSlot('mv', 'Motion Video', image),
          preset: 'product',
          referenceImage: createSlot('ri', 'Reference Image', video),
          resolution: '1080p',
        },
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        products: [
          createSlot('product-1', 'Product 1', null),
          createSlot('product-2', 'Product 2', null),
        ],
        shotEnvironment: 'indoor',
        subjectMode: 'lifestyle',
        textPrompt: '',
        videoAudio: 'no-audio',
        videoDuration: 'base',
        videoModel: 'veo-3.1',
        videoReferences: [
          createSlot('video-reference-1', 'Reference 1', null),
          createSlot('video-reference-2', 'Reference 2', null),
          createSlot('video-reference-3', 'Reference 3', null),
        ],
      }),
    ).toThrow('Motion Control reference image must be an image file.')
  })
})
