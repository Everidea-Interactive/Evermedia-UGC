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

describe('generation client payload', () => {
  it('accepts heic named image assets for later normalization', () => {
    const locationFile = new File(['image'], 'location.heic', { type: '' })
    const assets = createNamedAssets()
    assets.location = createSlot('location', 'Location', locationFile)

    const { formData } = buildManualGenerationFormData({
      activeTab: 'image',
      assets,
      batchSize: 1,
      cameraMovement: 'orbit',
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      imageModel: 'nano-banana',
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

    expect(formData.get('asset_location')).toBe(locationFile)
  })
})
