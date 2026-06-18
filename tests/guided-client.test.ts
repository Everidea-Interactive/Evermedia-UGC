import { describe, expect, it } from 'vitest'

import {
  buildGuidedAnalysisFormData,
  buildGuidedGenerationFormData,
  buildIdeationAnalysisFormData,
} from '@/lib/generation/client'
import type {
  AssetSlot,
  CreativeBrief,
  GuidedAnalysisPlan,
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

const guidedPlan: GuidedAnalysisPlan = {
  creativeStyle: 'tv-commercial',
  productCategory: 'cosmetics',
  shots: [
    {
      prompt: 'Video prompt 1',
      shotEnvironment: 'indoor',
      slug: 'shot-1',
      subjectMode: 'product-only',
      tags: ['hero'],
      title: 'Shot 1',
    },
  ],
  summary: 'Guided summary',
}

const multiShotGuidedPlan: GuidedAnalysisPlan = {
  ...guidedPlan,
  shots: [
    guidedPlan.shots[0],
    {
      prompt: 'Video prompt 2',
      shotEnvironment: 'outdoor',
      slug: 'shot-2',
      subjectMode: 'lifestyle',
      tags: ['motion'],
      title: 'Shot 2',
    },
  ],
}

const creativeBrief: CreativeBrief = {
  audience: 'broad',
  goal: 'awareness',
  platform: 'tiktok',
  productHighlights: 'Highlight the product benefits quickly.',
  tone: 'Confident and direct',
}

describe('guided generation client payloads', () => {
  it('sends workspace context with guided video analysis requests', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { formData } = buildGuidedAnalysisFormData({
      analysisModel: 'gemini-2.5-flash',
      cameraMovement: 'macro',
      contentConcept: 'affiliate',
      heroAsset,
      orientationPreference: 'portrait',
      productUrl: '',
      shotCount: 2,
      videoModel: 'seedance-1.5-pro',
      videoDuration: 'extended',
      workspace: 'video',
    })

    expect(formData.get('workspace')).toBe('video')
    expect(formData.get('shotCount')).toBe('1')
    expect(formData.get('videoModel')).toBe('seedance-1.5-pro')
    expect(formData.get('videoDuration')).toBe('extended')
    expect(formData.get('videoAudio')).toBe('no-audio')
    expect(formData.get('orientationPreference')).toBe('portrait')
    expect(formData.get('cameraMovement')).toBe('macro')
  })

  it('posts Seedance 2.0 as the guided video model', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { formData } = buildGuidedAnalysisFormData({
      analysisModel: 'gemini-2.5-flash',
      cameraMovement: null,
      contentConcept: 'affiliate',
      heroAsset,
      productUrl: '',
      shotCount: 3,
      videoModel: 'seedance-2',
      videoDuration: 'extended',
      workspace: 'video',
    })

    expect(formData.get('workspace')).toBe('video')
    expect(formData.get('shotCount')).toBe('1')
    expect(formData.get('videoModel')).toBe('seedance-2')
    expect(formData.get('videoDuration')).toBe('extended')
  })

  it('keeps guided image generation payloads image-oriented by default', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { assetManifest, formData } = buildGuidedGenerationFormData({
      analysisModel: 'gemini-2.5-flash',
      contentConcept: 'affiliate',
      creativeBrief,
      creativePlan: null,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: guidedPlan,
      productUrl: '',
    })

    expect(formData.get('workspace')).toBe('image')
    expect(formData.get('imageModel')).toBe('nano-banana')
    expect(formData.get('videoModel')).toBe('veo-3.1')
    expect(formData.get('videoDuration')).toBe('base')
    expect(formData.get('videoAudio')).toBe('no-audio')
    expect(formData.get('cameraMovement')).toBe('')
    expect(formData.get('orientationPreference')).toBeNull()
    expect(assetManifest).toEqual([
      {
        fieldName: 'product_guided_hero',
        kind: 'product',
        label: 'Hero Product',
        order: 100,
        productId: 'guided-hero',
      },
    ])
  })

  it('appends the selected CTA to the final guided image shot prompt', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { formData } = buildGuidedGenerationFormData({
      analysisModel: 'gemini-2.5-flash',
      contentConcept: 'affiliate',
      creativeBrief,
      creativePlan: null,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: multiShotGuidedPlan,
      productUrl: '',
      promptEnhancement: {
        ctaEnabled: true,
        customCtaText: '',
        selectedCtaId: 'find-fit',
        voiceoverEnabled: false,
        voiceoverScript: '',
      },
    })

    const guidedShots = JSON.parse(String(formData.get('guidedShots'))) as Array<{
      prompt: string
    }>

    expect(guidedShots[0]?.prompt).toBe('Video prompt 1')
    expect(guidedShots[1]?.prompt).toContain('Find your best fit')
  })

  it('appends editable VO script to guided video shot prompts', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { formData } = buildGuidedGenerationFormData({
      analysisModel: 'gemini-2.5-flash',
      contentConcept: 'affiliate',
      creativeBrief,
      creativePlan: null,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: multiShotGuidedPlan,
      locale: 'id',
      productUrl: '',
      promptEnhancement: {
        ctaEnabled: false,
        customCtaText: '',
        selectedCtaId: 'shop-now',
        voiceoverEnabled: true,
        voiceoverScript: 'Ini solusi praktis untuk rutinitas harian.',
      },
      workspace: 'video',
    })

    const guidedShots = JSON.parse(String(formData.get('guidedShots'))) as Array<{
      prompt: string
    }>

    expect(guidedShots).toHaveLength(1)
    expect(guidedShots[0]?.prompt).toContain(
      'Ini solusi praktis untuk rutinitas harian.',
    )
  })

  it('appends custom CTA text to guided image prompts when selected', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { formData } = buildGuidedGenerationFormData({
      analysisModel: 'gemini-2.5-flash',
      contentConcept: 'affiliate',
      creativeBrief,
      creativePlan: null,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: guidedPlan,
      productUrl: '',
      promptEnhancement: {
        ctaEnabled: true,
        customCtaText: 'Ambil promo hari ini',
        selectedCtaId: 'custom',
        voiceoverEnabled: false,
        voiceoverScript: '',
      },
    })

    const guidedShots = JSON.parse(String(formData.get('guidedShots'))) as Array<{
      prompt: string
    }>

    expect(guidedShots[0]?.prompt).toContain('Ambil promo hari ini')
  })

  it('sends guided Seedance 2.0 video settings and optional end frame in the generation payload', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )
    const endFrameAsset = createSlot(
      'guided-end-frame',
      'End Frame',
      new File(['end'], 'end.png', { type: 'image/png' }),
    )

    const { assetManifest, formData } = buildGuidedGenerationFormData({
      analysisModel: 'gemini-2.5-flash',
      cameraMovement: 'dolly',
      contentConcept: 'driven-ads',
      creativeBrief,
      creativePlan: null,
      endFrameAsset,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: multiShotGuidedPlan,
      productUrl: 'https://example.com/product',
      videoDuration: 'extended',
      videoAudio: 'with-audio',
      videoModel: 'seedance-2',
      workspace: 'video',
    })

    expect(formData.get('workspace')).toBe('video')
    expect(formData.get('videoModel')).toBe('seedance-2')
    expect(formData.get('videoDuration')).toBe('extended')
    expect(formData.get('videoAudio')).toBe('with-audio')
    expect(formData.get('cameraMovement')).toBe('dolly')
    expect(formData.get('batchSize')).toBe('1')
    expect(JSON.parse(String(formData.get('guidedShots')))).toEqual([
      guidedPlan.shots[0],
    ])
    expect(formData.get('asset_endFrame')).toBe(endFrameAsset.file)
    expect(assetManifest).toEqual([
      {
        fieldName: 'asset_endFrame',
        key: 'endFrame',
        kind: 'named',
        label: 'End Frame',
        order: 4,
      },
      {
        fieldName: 'product_guided_hero',
        kind: 'product',
        label: 'Hero Product',
        order: 100,
        productId: 'guided-hero',
      },
    ])
  })

  it('omits guided end-frame payloads for unsupported video models', () => {
    const heroAsset = createSlot(
      'guided-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )
    const endFrameAsset = createSlot(
      'guided-end-frame',
      'End Frame',
      new File(['end'], 'end.png', { type: 'image/png' }),
    )

    const { assetManifest, formData } = buildGuidedGenerationFormData({
      analysisModel: 'gemini-2.5-flash',
      cameraMovement: 'dolly',
      contentConcept: 'driven-ads',
      creativeBrief,
      creativePlan: null,
      endFrameAsset,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: multiShotGuidedPlan,
      productUrl: 'https://example.com/product',
      videoDuration: 'extended',
      videoAudio: 'with-audio',
      videoModel: 'seedance-1.5-pro',
      workspace: 'video',
    })

    expect(formData.get('asset_endFrame')).toBeNull()
    expect(assetManifest).toEqual([
      {
        fieldName: 'product_guided_hero',
        kind: 'product',
        label: 'Hero Product',
        order: 100,
        productId: 'guided-hero',
      },
    ])
  })
})

describe('ideation client payloads', () => {
  it('allows ideation analysis with a product URL only', () => {
    const emptyHeroAsset = createSlot('ideation-hero', 'Hero Product', null)

    const { formData } = buildIdeationAnalysisFormData({
      analysisModel: 'gemini-2.5-flash',
      briefText: 'Focus on first-purchase trust.',
      contentConcept: 'affiliate',
      contentFormat: 'video',
      heroAsset: emptyHeroAsset,
      outputLanguage: 'id',
      productUrl: 'https://example.com/product',
    })

    expect(formData.get('heroImage')).toBeNull()
    expect(formData.get('contentFormat')).toBe('video')
    expect(formData.get('outputLanguage')).toBe('id')
    expect(formData.get('productUrl')).toBe('https://example.com/product')
  })

  it('allows ideation analysis with a hero image only', () => {
    const heroAsset = createSlot(
      'ideation-hero',
      'Hero Product',
      new File(['hero'], 'hero.png', { type: 'image/png' }),
    )

    const { formData } = buildIdeationAnalysisFormData({
      analysisModel: 'gemini-2.5-flash',
      briefText: '',
      contentConcept: 'affiliate',
      contentFormat: 'photos',
      heroAsset,
      outputLanguage: 'en',
      productUrl: '   ',
    })

    expect(formData.get('contentFormat')).toBe('photos')
    expect(formData.get('heroImage')).toBe(heroAsset.file)
    expect(formData.get('productUrl')).toBeNull()
  })

  it('rejects ideation analysis when both source inputs are missing', () => {
    const emptyHeroAsset = createSlot('ideation-hero', 'Hero Product', null)

    expect(() =>
      buildIdeationAnalysisFormData({
        analysisModel: 'gemini-2.5-flash',
        briefText: '',
        contentConcept: 'affiliate',
        contentFormat: 'video',
        heroAsset: emptyHeroAsset,
        outputLanguage: 'en',
        productUrl: '  ',
      }),
    ).toThrow('hero product image or a product URL')
  })
})
