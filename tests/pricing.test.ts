import { describe, expect, it } from 'vitest'

import {
  buildKiePricingMatrix,
  getGenerationCostEstimate,
  getGenerationCreditValidation,
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
    modelDescription: 'grok-imagine-video-1-5-preview, image-to-video, 480p',
    usdPrice: '0.008',
  },
  {
    creditPrice: '3',
    modelDescription: 'grok-imagine-video-1-5-preview, image-to-video, 720p',
    usdPrice: '0.015',
  },
]
const gptImageRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '6',
    modelDescription: 'gpt image 2, text-to-image, 1k',
    usdPrice: '0.03',
  },
  {
    creditPrice: '10',
    modelDescription: 'gpt image 2, text-to-image, 2k',
    usdPrice: '0.05',
  },
  {
    creditPrice: '16',
    modelDescription: 'gpt image 2, text-to-image, 4k',
    usdPrice: '0.08',
  },
  {
    creditPrice: '6',
    modelDescription: 'gpt image 2, image-to-image, 1k',
    usdPrice: '0.03',
  },
  {
    creditPrice: '10',
    modelDescription: 'gpt image 2, image-to-image, 2k',
    usdPrice: '0.05',
  },
  {
    creditPrice: '16',
    modelDescription: 'gpt image 2, image-to-image, 4k',
    usdPrice: '0.08',
  },
]

const klingRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '27',
    modelDescription: 'kling 3.0 motion control, video-to-video, 1080P',
    usdPrice: '0.135',
  },
  {
    creditPrice: '20',
    modelDescription: 'kling 3.0 motion control, video-to-video, 720P',
    usdPrice: '0.1',
  },
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

const currentVeoRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '65',
    modelDescription: 'Google veo 3.1, image-to-video, Fast-1080p',
    usdPrice: '0.325',
  },
  {
    creditPrice: '60',
    modelDescription: 'Google veo 3.1, image-to-video, Fast-720p',
    usdPrice: '0.30',
  },
  {
    creditPrice: '65',
    modelDescription: 'Google veo 3.1, text-to-video, Fast-1080p',
    usdPrice: '0.325',
  },
  {
    creditPrice: '60',
    modelDescription: 'Google veo 3.1, text-to-video, Fast-720p',
    usdPrice: '0.30',
  },
]

const seedanceRecords: KiePricingApiRecord[] = [
  {
    creditPrice: '20',
    modelDescription: 'bytedance/seedance-1.5-pro, 720p with video input',
    usdPrice: '0.10',
  },
  {
    creditPrice: '33',
    modelDescription: 'bytedance/seedance-1.5-pro, 720p no video input',
    usdPrice: '0.165',
  },
  {
    creditPrice: '62',
    modelDescription: 'bytedance/seedance-1.5-pro, 1080p with video input',
    usdPrice: '0.31',
  },
  {
    creditPrice: '102',
    modelDescription: 'bytedance/seedance-1.5-pro, 1080p no video input',
    usdPrice: '0.51',
  },
  {
    creditPrice: '25',
    modelDescription: 'bytedance/seedance-2, 720p with video input',
    usdPrice: '0.125',
  },
  {
    creditPrice: '6',
    modelDescription: 'bytedance/seedance-2-mini, 480p with video',
    usdPrice: '0.03',
  },
  {
    creditPrice: '9.5',
    modelDescription: 'bytedance/seedance-2-mini, 480p no video',
    usdPrice: '0.0475',
  },
  {
    creditPrice: '12.5',
    modelDescription: 'bytedance/seedance-2-mini, 720p with video',
    usdPrice: '0.0625',
  },
  {
    creditPrice: '20.5',
    modelDescription: 'bytedance/seedance-2-mini, 720p no video',
    usdPrice: '0.1025',
  },
  {
    creditPrice: '41',
    modelDescription: 'bytedance/seedance-2, 720p no video input',
    usdPrice: '0.205',
  },
  {
    creditPrice: '62',
    modelDescription: 'bytedance/seedance-2, 1080p with video input',
    usdPrice: '0.31',
  },
  {
    creditPrice: '102',
    modelDescription: 'bytedance/seedance-2, 1080p no video input',
    usdPrice: '0.51',
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
    brandLogo: createSlot('brandLogo', 'Brand Logo'),
    clothing: createSlot('clothing', 'Clothing'),
    endFrame: createSlot('endFrame', 'End Frame'),
    firstFrame: createSlot('firstFrame', 'First Frame'),
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
    orientationPreference: 'auto',
    productCategory: 'cosmetics',
    products: [createSlot('product-1', 'Product 1'), createSlot('product-2', 'Product 2')],
    shotEnvironment: 'indoor',
    subjectMode: 'lifestyle',
    textPrompt: '',
    videoReferences: [
      createSlot('video-reference-1', 'Reference 1'),
      createSlot('video-reference-2', 'Reference 2'),
      createSlot('video-reference-3', 'Reference 3'),
    ],
    videoAudio: 'no-audio',
    videoDuration: 'base',
    videoModel: 'veo-3.1',
    ...overrides,
  }
}

describe('generation pricing', () => {
  const pricingMatrix = buildKiePricingMatrix({
    gptImageRecords,
    grokRecords,
    klingRecords,
    nanoRecords,
    seedanceRecords,
    veoRecords,
  })

  it('normalizes KIE rows into the app-facing pricing matrix', () => {
    expect(Object.keys(pricingMatrix.image['nano-banana']).toSorted()).toEqual([
      '1K',
      '2K',
      '4K',
    ])
    expect(pricingMatrix.image['nano-banana']['1K']).toEqual({
      credits: 8,
      usd: 0.04,
    })
    expect(pricingMatrix.image['nano-banana']['4K']).toEqual({
      credits: 12,
      usd: 0.06,
    })
    expect(
      pricingMatrix.video['grok-imagine-video-1.5'].promptOnly['720p'].base,
    ).toEqual({
      credits: 24,
      usd: 0.12,
    })
    expect(pricingMatrix.video.kling.promptOnly['no-audio'].base).toEqual({
      credits: 55,
      usd: 0.275,
    })
    expect(pricingMatrix.video['kling-3.0-motion-control']['1080p']).toEqual({
      credits: 27,
      usd: 0.135,
    })
    expect(pricingMatrix.video['veo-3.1'].withReference['1080p']).toEqual({
      credits: 60,
      usd: 0.3,
    })
    expect(pricingMatrix.video['veo-3.1'].withReference['720p']).toEqual({
      credits: 60,
      usd: 0.3,
    })
    expect(
      pricingMatrix.video['seedance-1.5-pro'].withReference['1080p']['no-audio'].extended,
    ).toEqual({
      credits: 744,
      usd: 3.72,
    })
    expect(
      pricingMatrix.video['seedance-2-mini'].promptOnly['720p']['with-audio'].base,
    ).toEqual({
      credits: 164,
      usd: 0.82,
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
      credits: 36,
      reason: null,
      usd: 0.18,
    })
  })

  it('estimates Nano Banana prompt-only image cost for batch size 2', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        batchSize: 2,
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

  it('estimates Nano Banana prompt-only 4k image cost', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        imageModel: 'nano-banana',
        outputQuality: '4k',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 12,
      reason: null,
      usd: 0.06,
    })
  })

  it('estimates Nano Banana image cost with a reference for batch size 4', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        assets: createAssets({
          face1: createSlot('face1', 'Face 1', true),
        }),
        batchSize: 4,
        imageModel: 'nano-banana',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 48,
      reason: null,
      usd: 0.24,
    })
  })

  it('estimates carousel cost per shared batch instead of per panel or video model pricing', () => {
    const estimate = getGenerationCostEstimate(
      {
        ...createSnapshot({
          activeTab: 'carousel',
          batchSize: 4,
          outputQuality: '1080p',
          videoModel: 'veo-3.1',
        }),
        carouselDraft: {
          baseTemplateAsset: null,
          baseTemplateMode: 'manual',
          baseTemplatePrompt: '',
          panels: [
            {
              id: 'panel-1',
              imageAsset: null,
              imageMode: 'ai',
              imagePrompt: 'hero shot',
              order: 1,
              templateMode: 'inherit',
              templatePrompt: '',
              textMode: 'manual',
              textPrompt: '',
              textValue: 'Title',
            },
            {
              id: 'panel-2',
              imageAsset: createSlot('panel-2-image', 'Panel 2', true),
              imageMode: 'manual',
              imagePrompt: '',
              order: 2,
              templateMode: 'inherit',
              templatePrompt: '',
              textMode: 'ai',
              textPrompt: 'cta copy',
              textValue: '',
            },
          ],
        },
      },
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 12,
      reason: null,
      usd: 0.06,
    })
  })

  it('charges manual-image carousel panels because they still render through provider', () => {
    const estimate = getGenerationCostEstimate(
      {
        ...createSnapshot({
          activeTab: 'carousel',
          outputQuality: '1080p',
        }),
        carouselDraft: {
          baseTemplateAsset: createSlot('base-template', 'Base Template', true),
          baseTemplateMode: 'manual',
          baseTemplatePrompt: '',
          panels: [
            {
              id: 'panel-1',
              imageAsset: createSlot('panel-1-image', 'Panel 1', true),
              imageMode: 'manual',
              imagePrompt: '',
              order: 1,
              templateMode: 'inherit',
              templatePrompt: '',
              textMode: 'manual',
              textPrompt: '',
              textValue: 'Slide copy',
            },
          ],
        },
      },
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 12,
      reason: null,
      usd: 0.06,
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

  it('estimates Seedance 1.5 Pro reference video cost for extended duration', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        outputQuality: '1080p',
        videoReferences: [createSlot('video-reference-1', 'Reference 1', true)],
        subjectMode: 'product-only',
        videoDuration: 'extended',
        videoModel: 'seedance-1.5-pro',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 744,
      reason: null,
      usd: 3.72,
    })
  })

  it('estimates Motion Control cost from live per-second pricing and staged video duration', () => {
    const estimate = getGenerationCostEstimate(
      {
        ...createSnapshot({
          activeTab: 'motion-control',
        }),
        motionControl: {
          additionalInstructions: '',
          motionVideo: {
            ...createSlot('motion-video', 'Motion Video', true),
            durationSeconds: 5.25,
            mimeType: 'video/mp4',
          },
          referenceImage: {
            ...createSlot('reference-image', 'Reference Image', true),
            mimeType: 'image/png',
          },
          resolution: '1080p',
        },
      },
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 141.75,
      reason: null,
      usd: 0.709,
    })
  })

  it('estimates Seedance 2.0 prompt-only video cost from the live pricing rows', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        outputQuality: '1080p',
        videoDuration: 'extended',
        videoModel: 'seedance-2',
      }),
      pricingMatrix,
    )

    expect(pricingMatrix.video['seedance-2'].promptOnly['1080p']['no-audio'].extended).toEqual({
      credits: 1020,
      usd: 5.1,
    })
    expect(estimate).toEqual({
      available: true,
      credits: 1020,
      reason: null,
      usd: 5.1,
    })
  })

  it('estimates Grok Imagine Video 1.5 prompt-only video cost from image-to-video fallback rows', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        outputQuality: '720p',
        videoDuration: 'base',
        videoModel: 'grok-imagine-video-1.5',
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

  it('estimates Seedance 2 Mini prompt-only video cost from the live pricing rows', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        outputQuality: '720p',
        videoDuration: 'base',
        videoModel: 'seedance-2-mini',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 164,
      reason: null,
      usd: 0.82,
    })
  })

  it('treats a Seedance 2 Mini first frame as a reference input for pricing', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        assets: createAssets({
          firstFrame: createSlot('firstFrame', 'First Frame', true),
        }),
        outputQuality: '720p',
        videoDuration: 'base',
        videoModel: 'seedance-2-mini',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 100,
      reason: null,
      usd: 0.5,
    })
  })

  it('does not treat end-frame-only staging as a Seedance 2.0 reference render', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        assets: createAssets({
          endFrame: createSlot('endFrame', 'End Frame', true),
        }),
        outputQuality: '1080p',
        videoDuration: 'extended',
        videoModel: 'seedance-2',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 1020,
      reason: null,
      usd: 5.1,
    })
  })

  it('treats a Seedance 2.0 first frame as a reference input for pricing', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        activeTab: 'video',
        assets: createAssets({
          firstFrame: createSlot('firstFrame', 'First Frame', true),
        }),
        outputQuality: '1080p',
        videoDuration: 'extended',
        videoModel: 'seedance-2',
      }),
      pricingMatrix,
    )

    expect(estimate).toEqual({
      available: true,
      credits: 620,
      reason: null,
      usd: 3.1,
    })
  })

  it('parses current Veo 3.1 and Seedance 2.0 pricing rows from the live KIE format', () => {
    const currentPricingMatrix = buildKiePricingMatrix({
      gptImageRecords,
      grokRecords,
      klingRecords,
      nanoRecords,
      seedanceRecords,
      veoRecords: currentVeoRecords,
    })

    expect(currentPricingMatrix.video['veo-3.1'].promptOnly['1080p']).toEqual({
      credits: 65,
      usd: 0.325,
    })
    expect(currentPricingMatrix.video['veo-3.1'].withReference['720p']).toEqual({
      credits: 60,
      usd: 0.3,
    })
    expect(
      currentPricingMatrix.video['seedance-2'].withReference['1080p']['with-audio'].extended,
    ).toEqual({
      credits: 620,
      usd: 3.1,
    })
    expect(
      currentPricingMatrix.video['seedance-2'].promptOnly['720p']['no-audio'].base,
    ).toEqual({
      credits: 205,
      usd: 1.025,
    })
  })

  it('blocks generation when the live credit balance is below the estimate', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        batchSize: 3,
        imageModel: 'nano-banana',
      }),
      pricingMatrix,
    )

    expect(
      getGenerationCreditValidation({
        balanceCredits: 12,
        estimate,
      }),
    ).toEqual({
      canGenerate: false,
      reason: 'Not enough KIE credits. 36 required, 12 available.',
    })
  })

  it('blocks generation while the credit balance is still unavailable', () => {
    const estimate = getGenerationCostEstimate(
      createSnapshot({
        imageModel: 'nano-banana',
      }),
      pricingMatrix,
    )

    expect(
      getGenerationCreditValidation({
        balanceCredits: null,
        estimate,
      }),
    ).toEqual({
      canGenerate: false,
      reason: 'Checking KIE credit balance. Generation unlocks once the balance loads.',
    })
  })
})
