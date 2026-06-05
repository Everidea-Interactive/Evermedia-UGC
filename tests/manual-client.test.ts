import { describe, expect, it } from 'vitest'

import {
  buildGenerationFormData,
  formatBytes,
  getGenerationValidation,
} from '@/lib/generation/client'
import type {
  AssetSlot,
  CarouselDraft,
  GenerationSnapshot,
  NamedAssetSlots,
} from '@/lib/generation/types'

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

function createSnapshot(overrides: Partial<GenerationSnapshot> = {}): GenerationSnapshot {
  return {
    activeTab: 'video',
    assets: createNamedAssets(),
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
    videoReferences: [
      createSlot('video-reference-1', 'Reference 1', null),
      createSlot('video-reference-2', 'Reference 2', null),
      createSlot('video-reference-3', 'Reference 3', null),
    ],
    videoAudio: 'no-audio',
    videoDuration: 'base',
    videoModel: 'veo-3.1',
    ...overrides,
  }
}

describe('manual generation client payloads', () => {
  it('formats gigabytes with whole-number precision', () => {
    expect(formatBytes(125 * 1024 * 1024 * 1024)).toBe('125.0 GB')
  })

  it('formats terabytes for very large archives', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024 * 1024)).toBe('2.0 TB')
  })

  it('rejects manual video generation when both prompt and generic references are missing', () => {
    const validation = getGenerationValidation(createSnapshot())
    expect(validation.canGenerate).toBe(false)
    expect(validation.reason).toContain('start-frame reference')
  })

  it('accepts manual video generation when generic references are present', () => {
    const snapshot = createSnapshot({
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    expect(getGenerationValidation(snapshot).canGenerate).toBe(true)
  })

  it('rejects Kling manual video generation when only generic references are present', () => {
    const snapshot = createSnapshot({
      videoModel: 'kling-3.0',
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    const validation = getGenerationValidation(snapshot)

    expect(validation.canGenerate).toBe(false)
    expect(validation.reason).toContain('First Frame image')
  })

  it('builds manual video manifest using ordered generic references plus optional end frame', () => {
    const endFrame = createSlot(
      'endFrame',
      'End Frame',
      new File(['end'], 'end.png', { type: 'image/png' }),
    )
    const snapshot = createSnapshot({
      assets: {
        ...createNamedAssets(),
        endFrame,
      },
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot(
          'video-reference-2',
          'Reference 2',
          new File(['ref-2'], 'ref-2.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    const { assetManifest, formData } = buildGenerationFormData(snapshot)

    expect(assetManifest).toEqual([
      {
        fieldName: 'video_reference_1',
        kind: 'product',
        label: 'Reference 1',
        order: 0,
        productId: 'video-reference-1',
      },
      {
        fieldName: 'video_reference_2',
        kind: 'product',
        label: 'Reference 2',
        order: 1,
        productId: 'video-reference-2',
      },
      {
        fieldName: 'asset_endFrame',
        key: 'endFrame',
        kind: 'named',
        label: 'End Frame',
        order: 100,
      },
    ])
    expect(formData.get('video_reference_1')).toBe(snapshot.videoReferences[0]?.file)
    expect(formData.get('video_reference_2')).toBe(snapshot.videoReferences[1]?.file)
    expect(formData.get('asset_endFrame')).toBe(endFrame.file)
  })

  it('caps Seedance manual video references to the model-supported count', () => {
    const snapshot = createSnapshot({
      videoModel: 'seedance-1.5-pro',
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot(
          'video-reference-2',
          'Reference 2',
          new File(['ref-2'], 'ref-2.png', { type: 'image/png' }),
        ),
        createSlot(
          'video-reference-3',
          'Reference 3',
          new File(['ref-3'], 'ref-3.png', { type: 'image/png' }),
        ),
      ],
    })

    const { assetManifest, formData } = buildGenerationFormData(snapshot)

    expect(assetManifest).toHaveLength(2)
    expect(assetManifest.map((asset) => asset.fieldName)).toEqual([
      'video_reference_1',
      'video_reference_2',
    ])
    expect(formData.get('video_reference_1')).toBe(snapshot.videoReferences[0]?.file)
    expect(formData.get('video_reference_2')).toBe(snapshot.videoReferences[1]?.file)
    expect(formData.get('video_reference_3')).toBeNull()
  })

  it('includes end-frame uploads for Seedance 2.0 manual generation', () => {
    const firstFrame = createSlot(
      'firstFrame',
      'First Frame',
      new File(['first'], 'first.png', { type: 'image/png' }),
    )
    const endFrame = createSlot(
      'endFrame',
      'End Frame',
      new File(['end'], 'end.png', { type: 'image/png' }),
    )
    const snapshot = createSnapshot({
      assets: {
        ...createNamedAssets(),
        endFrame,
        firstFrame,
      },
      videoModel: 'seedance-2',
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    const { assetManifest, formData } = buildGenerationFormData(snapshot)

    expect(assetManifest.map((asset) => asset.fieldName)).toEqual([
      'asset_firstFrame',
      'video_reference_1',
      'asset_endFrame',
    ])
    expect(formData.get('asset_firstFrame')).toBe(firstFrame.file)
    expect(formData.get('asset_endFrame')).toBe(endFrame.file)
  })

  it('appends manual image CTA into the submitted prompt', () => {
    const snapshot = createSnapshot({
      activeTab: 'image',
      products: [
        createSlot(
          'product-1',
          'Product 1',
          new File(['product'], 'product.png', { type: 'image/png' }),
        ),
        createSlot('product-2', 'Product 2', null),
      ],
      promptEnhancement: {
        ctaEnabled: true,
        customCtaText: '',
        selectedCtaId: 'see-variant',
        voiceoverEnabled: false,
        voiceoverScript: '',
      },
      locale: 'id',
      textPrompt: 'Use bright tabletop lighting.',
    })

    const { formData } = buildGenerationFormData(snapshot)

    expect(formData.get('textPrompt')).toContain('Use bright tabletop lighting.')
    expect(formData.get('textPrompt')).toContain('Lihat detail dan variannya')
  })

  it('appends manual custom CTA into the submitted prompt', () => {
    const snapshot = createSnapshot({
      activeTab: 'image',
      products: [
        createSlot(
          'product-1',
          'Product 1',
          new File(['product'], 'product.png', { type: 'image/png' }),
        ),
        createSlot('product-2', 'Product 2', null),
      ],
      promptEnhancement: {
        ctaEnabled: true,
        customCtaText: 'Klik untuk klaim bonus',
        selectedCtaId: 'custom',
        voiceoverEnabled: false,
        voiceoverScript: '',
      },
    })

    const { formData } = buildGenerationFormData(snapshot)

    expect(formData.get('textPrompt')).toContain('Klik untuk klaim bonus')
  })

  it('appends manual video VO into the submitted prompt', () => {
    const snapshot = createSnapshot({
      promptEnhancement: {
        ctaEnabled: false,
        customCtaText: '',
        selectedCtaId: 'shop-now',
        voiceoverEnabled: true,
        voiceoverScript: 'Rasakan manfaatnya sejak pemakaian pertama.',
      },
      textPrompt: 'Open with a soft handheld product reveal.',
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    const { formData } = buildGenerationFormData(snapshot)

    expect(formData.get('textPrompt')).toContain(
      'Open with a soft handheld product reveal.',
    )
    expect(formData.get('textPrompt')).toContain(
      'Rasakan manfaatnya sejak pemakaian pertama.',
    )
  })

  it('builds Kling manual video manifest using only first and optional end frame inputs', () => {
    const firstFrame = createSlot(
      'firstFrame',
      'First Frame',
      new File(['first'], 'first.png', { type: 'image/png' }),
    )
    const endFrame = createSlot(
      'endFrame',
      'End Frame',
      new File(['end'], 'end.png', { type: 'image/png' }),
    )
    const snapshot = createSnapshot({
      assets: {
        ...createNamedAssets(),
        endFrame,
        firstFrame,
      },
      videoModel: 'kling-3.0',
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    const { assetManifest, formData } = buildGenerationFormData(snapshot)

    expect(assetManifest.map((asset) => asset.fieldName)).toEqual([
      'asset_firstFrame',
      'asset_endFrame',
    ])
    expect(formData.get('asset_firstFrame')).toBe(firstFrame.file)
    expect(formData.get('asset_endFrame')).toBe(endFrame.file)
    expect(formData.get('video_reference_1')).toBeNull()
  })

  it('omits end-frame uploads for models that do not support end-frame guidance', () => {
    const snapshot = createSnapshot({
      videoModel: 'seedance-1.5-pro',
      videoReferences: [
        createSlot(
          'video-reference-1',
          'Reference 1',
          new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
        ),
        createSlot('video-reference-2', 'Reference 2', null),
        createSlot('video-reference-3', 'Reference 3', null),
      ],
    })

    const { assetManifest, formData } = buildGenerationFormData(snapshot)

    expect(assetManifest.map((asset) => asset.fieldName)).toEqual([
      'video_reference_1',
    ])
    expect(formData.get('asset_endFrame')).toBeNull()
  })

  it('rejects carousel submission when ai mode lacks base template prompt', () => {
    const base = createSnapshot({ activeTab: 'carousel' })

    expect(() =>
      buildGenerationFormData({
        ...base,
        carouselDraft: {
          baseTemplateMode: 'ai',
          baseTemplatePrompt: '',
          baseTemplateAsset: null,
          panels: [
            {
              id: 'panel-1',
              order: 1,
              templateMode: 'inherit',
              templatePrompt: '',
              imageMode: 'ai',
              imagePrompt: 'A carousel panel',
              imageAsset: null,
              textMode: 'manual',
              textPrompt: '',
              textValue: '',
            },
          ],
        },
      } as GenerationSnapshot & { carouselDraft: CarouselDraft }),
    ).toThrow(/base template.*ai|ai.*prompt/i)
  })

  it('rejects carousel submission when manual mode lacks base template asset', () => {
    const base = createSnapshot({ activeTab: 'carousel' })

    expect(() =>
      buildGenerationFormData({
        ...base,
        carouselDraft: {
          baseTemplateMode: 'manual',
          baseTemplatePrompt: '',
          baseTemplateAsset: null,
          panels: [
            {
              id: 'panel-1',
              order: 1,
              templateMode: 'inherit',
              templatePrompt: '',
              imageMode: 'ai',
              imagePrompt: 'A carousel panel',
              imageAsset: null,
              textMode: 'manual',
              textPrompt: '',
              textValue: '',
            },
          ],
        },
      } as GenerationSnapshot & { carouselDraft: CarouselDraft }),
    ).toThrow(/base template.*upload|manual.*image/i)
  })

  it('serializes carousel panels into form data', () => {
    const base = createSnapshot({ activeTab: 'carousel' })
    const imageAsset = createSlot(
      'panel-1-asset',
      'Panel 1',
      new File(['img'], 'img.png', { type: 'image/png' }),
    )
    const carouselConfig: GenerationSnapshot & { carouselDraft: CarouselDraft } = {
      ...base,
      carouselDraft: {
        baseTemplateMode: 'ai',
        baseTemplatePrompt: 'A modern clean template',
        baseTemplateAsset: null,
        panels: [
          {
            id: 'panel-1',
            order: 1,
            templateMode: 'inherit',
            templatePrompt: '',
            imageMode: 'manual',
            imagePrompt: '',
            imageAsset,
            textMode: 'manual',
            textPrompt: '',
            textValue: '',
          },
        ],
      },
    }

    const { formData } = buildGenerationFormData(carouselConfig)

    expect(formData.get('workspace')).toBe('carousel')
    expect(formData.get('carouselDraft')).toContain('"panels"')
  })

  it('accepts carousel generation when draft is valid even without global textPrompt', () => {
    const base = createSnapshot({ activeTab: 'carousel', textPrompt: '' })

    const validation = getGenerationValidation({
      ...base,
      carouselDraft: {
        baseTemplateMode: 'ai',
        baseTemplatePrompt: 'Modern clean beauty panel template',
        baseTemplateAsset: null,
        panels: [
          {
            id: 'panel-1',
            order: 1,
            templateMode: 'inherit',
            templatePrompt: '',
            imageMode: 'ai',
            imagePrompt: 'Premium serum hero image',
            imageAsset: null,
            textMode: 'manual',
            textPrompt: '',
            textValue: 'Bright Skin In 7 Days',
          },
        ],
      },
    } as GenerationSnapshot & { carouselDraft: CarouselDraft })

    expect(validation).toEqual({
      canGenerate: true,
      reason: null,
    })
  })

  it('rejects carousel generation when a panel lacks image content', () => {
    const base = createSnapshot({ activeTab: 'carousel', textPrompt: '' })

    const validation = getGenerationValidation({
      ...base,
      carouselDraft: {
        baseTemplateMode: 'ai',
        baseTemplatePrompt: 'Modern clean beauty panel template',
        baseTemplateAsset: null,
        panels: [
          {
            id: 'panel-1',
            order: 1,
            templateMode: 'inherit',
            templatePrompt: '',
            imageMode: 'ai',
            imagePrompt: '',
            imageAsset: null,
            textMode: 'manual',
            textPrompt: '',
            textValue: 'Bright Skin In 7 Days',
          },
        ],
      },
    } as GenerationSnapshot & { carouselDraft: CarouselDraft })

    expect(validation.canGenerate).toBe(false)
    expect(validation.reason).toContain('Panel 1')
  })
})
