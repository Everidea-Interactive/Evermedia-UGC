import { describe, expect, it } from 'vitest'

import {
  buildVariantPromptSet,
  compileGenerationPrompt,
  variantProfileSuffixes,
} from '../lib/generation/prompt'
import type { UploadedAssetDescriptor } from '../lib/generation/types'

function makeAsset(
  overrides: Partial<UploadedAssetDescriptor>,
): UploadedAssetDescriptor {
  return {
    fieldName: 'asset_face1',
    kind: 'named',
    key: 'face1',
    label: 'Face 1',
    order: 0,
    remoteUrl: 'https://example.com/face-1.png',
    ...overrides,
  }
}

describe('compileGenerationPrompt', () => {
  it('creates a deterministic lifestyle video prompt with primary and supporting references', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({ key: 'face1', label: 'Face 1' }),
        makeAsset({
          fieldName: 'asset_clothing',
          key: 'clothing',
          label: 'Clothing',
          order: 2,
          remoteUrl: 'https://example.com/clothing.png',
        }),
        makeAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Product 1',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://example.com/product.png',
        }),
        makeAsset({
          fieldName: 'asset_endFrame',
          key: 'endFrame',
          label: 'End Frame',
          order: 4,
          remoteUrl: 'https://example.com/end-frame.png',
        }),
      ],
      cameraMovement: 'orbit',
      creativeStyle: 'ugc-lifestyle',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      subjectMode: 'lifestyle',
      textPrompt: 'Actor smiles at the camera while lifting the bottle into frame.',
      videoDuration: 'base',
      workspace: 'video',
    })

    expect(prompt).toContain('Create a video for a beauty and cosmetics campaign.')
    expect(prompt).toContain(
      'Primary visual reference: Face 1.',
    )
    expect(prompt).toContain(
      'Supporting references available: Clothing, Product 1.',
    )
    expect(prompt).toContain(
      'Use End Frame as the end-frame guidance when supported.',
    )
    expect(prompt).toContain(
      'Use an orbiting camera move with smooth parallax around the subject.',
    )
    expect(prompt).toContain(
      'Actor smiles at the camera while lifting the bottle into frame.',
    )
  })
})

describe('buildVariantPromptSet', () => {
  it('creates deterministic batch prompts with movement-aware video guidance', () => {
    const variants = buildVariantPromptSet({
      basePrompt: 'Create a premium lifestyle clip for the campaign.',
      batchSize: 4,
      cameraMovement: 'dolly',
      workspace: 'video',
    })

    expect(variants).toHaveLength(4)
    expect(variants[0]).toMatchObject({
      index: 1,
      profile: variantProfileSuffixes[1],
    })
    expect(variants[1]?.prompt).toContain(variantProfileSuffixes[2])
    expect(variants[2]?.prompt).toContain(variantProfileSuffixes[3])
    expect(variants[3]?.prompt).toContain(variantProfileSuffixes[4])
    expect(variants[0]?.prompt).toContain(
      'Let the motion emphasize a steady dolly move that builds momentum toward the hero beat.',
    )
  })
})
