import { describe, expect, it } from 'vitest'

import {
  buildKiePricingMatrix,
  getGenerationCostEstimate,
  type KiePricingApiRecord,
} from '@/lib/generation/pricing'
import type { AssetSlot, GenerationSnapshot, NamedAssetSlots } from '@/lib/generation/types'

const grokRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '4',
    modelDescription: 'grok-imagine, image-to-image',
    usdPrice: '0.02',
  },
  {
    creditPrice: '4.0',
    modelDescription: 'grok-imagine, text-to-image',
    usdPrice: '0.02',
  },
  {
    creditPrice: '1.6',
    modelDescription: 'grok-imagine, image-to-video, 480p',
    usdPrice: '0.008',
  },
  {
    creditPrice: '3',
    modelDescription: 'grok-imagine, image-to-video, 720p',
    usdPrice: '0.015',
  },
  {
    creditPrice: '1.6',
    modelDescription: 'grok-imagine, text-to-video, 480p',
    usdPrice: '0.008',
  },
  {
    creditPrice: '3',
    modelDescription: 'grok-imagine, text-to-video, 720p',
    usdPrice: '0.015',
  },
]

const klingRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '55.0',
    modelDescription: 'kling 2.6, image-to-video, without audio-5.0s',
    usdPrice: '0.275',
  },
  {
    creditPrice: '110.0',
    modelDescription: 'kling 2.6, image-to-video, without audio-10.0s',
    usdPrice: '0.55',
  },
  {
    creditPrice: '55.0',
    modelDescription: 'kling 2.6, text-to-video, without audio-5.0s',
    usdPrice: '0.275',
  },
  {
    creditPrice: '110.0',
    modelDescription: 'kling 2.6, text-to-video, without audio-10.0s',
    usdPrice: '0.55',
  },
]

const nanoRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '8',
    modelDescription: 'Google nano banana 2, 1K',
    usdPrice: '0.04',
  },
  {
    creditPrice: '12',
    modelDescription: 'Google nano banana 2, 2K',
    usdPrice: '0.06',
  },
]

const veoRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '60.0',
    modelDescription: 'Google veo 3.1, image-to-video, Fast',
    usdPrice: '0.3',
  },
  {
    creditPrice: '60.0',
    modelDescription: 'Google veo 3.1, text-to-video, Fast',
    usdPrice: '0.3',
  },
]

function createSlot(id: string, label: string, loaded = false): AssetSlot {
  return {
    error: null,
    file: loaded ? ({} as File) : null,
    id,
    label,
    mimeType: loaded ? 'image/png' : null,
    previewUrl: null,
    size: loaded ? 1 : null,
    uploadStatus: loaded ? 'staged' : 'idle',
  }
}

function createAssets(overrides: Partial<NamedAssetSlots> = {}): NamedAssetSlots {
  return {
    clothing: createSlot('clothing', 'Clothing'),
    endFrame: createSlot('endFrame', 'End Frame'),
    face1: createSlot('face1', 'Face 1'),
    face2: createSlot('face2', 'Face 2'),
    location: createSlot('location', 'Location'),
    ...overrides,
  }
}

function createSnapshot(
  overrides: Partial<GenerationSnapshot> = {},
): GenerationSnapshot {
  return {
    activeTab: 'image',
    assets: createAssets(),
    batchSize: 1,
    cameraMovement: 'orbit',
    characterAgeGroup: 'any',
    characterGender: 'any',
    creativeStyle: 'ugc-lifestyle',
    figureArtDirection: 'none',
    imageModel: 'nano-banana',
    outputQuality: '1080p',
    productCategory: 'cosmetics',
    products: [createSlot('product-1', 'Product 1'), createSlot('product-2', 'Product 2')],
    shotEnvironment: 'indoor',
    subjectMode: 'lifestyle',
    textPrompt: '',
    videoDuration: 'base',
    videoModel: 'veo-3.1',
    ...overrides,
  }
}

describe('generation pricing', () => {
  const pricingMatrix = buildKiePricingMatrix({
    grokRecords,
    klingRecords,
    nanoRecords,
    veoRecords,
  })

  it('normalizes KIE rows into the app-facing pricing matrix', () => {
    expect(pricingMatrix.image['nano-banana']['720p']).toEqual({
      credits: 8,
      usd: 0.04,
    })
    expect(pricingMatrix.image['nano-banana']['4k']).toEqual({
      credits: 12,
      usd: 0.06,
    })
    expect(pricingMatrix.video['grok-imagine'].promptOnly['1080p'].extended).toEqual({
      credits: 30,
      usd: 0.15,
    })
    expect(pricingMatrix.video.kling.promptOnly.base).toEqual({
      credits: 55,
      usd: 0.275,
    })
    expect(pricingMatrix.video['veo-3.1'].withReference).toEqual({
      credits: 60,
      usd: 0.3,
    })
  })

  it('estimates Nano Banana image cost for 1080p batch size 3', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        batchSize: 3,
        imageModel: 'nano-banana',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 24,
      reason: null,
      usd: 0.12,
    })
  })

  it('estimates Grok prompt-only image cost for batch size 2', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        batchSize: 2,
        imageModel: 'grok-imagine',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 8,
      reason: null,
      usd: 0.04,
    })
  })

  it('estimates Grok image cost with a reference for batch size 4', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        assets: createAssets({
          face1: createSlot('face1', 'Face 1', true),
        }),
        batchSize: 4,
        imageModel: 'grok-imagine',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 16,
      reason: null,
      usd: 0.08,
    })
  })

  it('estimates Grok video cost for 1080p extended batch size 2', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        batchSize: 2,
        outputQuality: '1080p',
        videoDuration: 'extended',
        videoModel: 'grok-imagine',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 60,
      reason: null,
      usd: 0.3,
    })
  })

  it('estimates Kling reference-based video cost for base duration', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        products: [createSlot('product-1', 'Product 1', true), createSlot('product-2', 'Product 2')],
        subjectMode: 'product-only',
        videoModel: 'kling',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 55,
      reason: null,
      usd: 0.275,
    })
  })

  it('estimates Veo 3.1 fast text-to-video cost for batch size 4', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        batchSize: 4,
        videoModel: 'veo-3.1',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 240,
      reason: null,
      usd: 1.2,
    })
  })
})
