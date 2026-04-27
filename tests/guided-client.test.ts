import { describe, expect, it } from 'vitest'

import {
  buildGuidedAnalysisFormData,
  buildGuidedGenerationFormData,
} from '@/lib/generation/client'
import type { AssetSlot, GuidedAnalysisPlan } from '@/lib/generation/types'

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
      productUrl: '',
      shotCount: 2,
      videoModel: 'kling',
      videoDuration: 'extended',
      workspace: 'video',
    })

    expect(formData.get('workspace')).toBe('video')
    expect(formData.get('shotCount')).toBe('1')
    expect(formData.get('videoModel')).toBe('kling')
    expect(formData.get('videoDuration')).toBe('extended')
    expect(formData.get('cameraMovement')).toBe('macro')
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
    expect(formData.get('cameraMovement')).toBe('')
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

  it('sends guided video settings and optional end frame in the generation payload', () => {
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
      endFrameAsset,
      heroAsset,
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      plan: multiShotGuidedPlan,
      productUrl: 'https://example.com/product',
      videoDuration: 'extended',
      videoModel: 'seedance-1.5-pro',
      workspace: 'video',
    })

    expect(formData.get('workspace')).toBe('video')
    expect(formData.get('videoModel')).toBe('seedance-1.5-pro')
    expect(formData.get('videoDuration')).toBe('extended')
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
})
