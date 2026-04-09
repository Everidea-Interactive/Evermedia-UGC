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
  it('creates a deterministic lifestyle video prompt with role-aware references', () => {
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
      characterAgeGroup: 'young-adult',
      characterGender: 'female',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'curvaceous-editorial',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Actor smiles at the camera while lifting the bottle into frame.',
      videoDuration: 'base',
      workspace: 'video',
    })

    expect(prompt).toContain('Create a video for a beauty and cosmetics campaign.')
    expect(prompt).toContain(
      'Identity reference: Face 1. Keep the on-camera subject as the same person with matching facial structure, skin tone, hairline, and overall likeness.',
    )
    expect(prompt).toContain(
      'Product reference: Product 1. Preserve the exact product design, packaging, branding, proportions, materials, and colorway from this reference.',
    )
    expect(prompt).toContain(
      'Wardrobe reference: Clothing. Use it only for outfit and styling cues. Ignore any face in that image if it conflicts with the identity reference.',
    )
    expect(prompt).toContain(
      'Use End Frame as the end-frame guidance when supported.',
    )
    expect(prompt).toContain(
      'Shot environment: curated indoor setting with studio-grade control.',
    )
    expect(prompt).toContain(
      'Character demographics: female, young adult.',
    )
    expect(prompt).not.toContain('south asian')
    expect(prompt).toContain(
      'Figure art direction: curvaceous editorial with full-figure styling, dramatic curves, and fashion-forward composition language.',
    )
    expect(prompt).toContain(
      'Use an orbiting camera move with smooth parallax around the subject.',
    )
    expect(prompt).toContain(
      'Actor smiles at the camera while lifting the bottle into frame.',
    )
  })

  it('treats face2 as the identity reference when face1 is absent', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({
          fieldName: 'asset_face2',
          key: 'face2',
          label: 'Face 2',
          order: 1,
          remoteUrl: 'https://example.com/face-2.png',
        }),
      ],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: '',
      videoDuration: 'base',
      workspace: 'image',
    })

    expect(prompt).toContain(
      'Identity reference: Face 2. Keep the on-camera subject as the same person with matching facial structure, skin tone, hairline, and overall likeness.',
    )
  })

  it('omits demographics and figure art direction for product-only prompts', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Product 1',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://example.com/product.png',
        }),
      ],
      cameraMovement: null,
      characterAgeGroup: 'young-adult',
      characterGender: 'female',
      creativeStyle: 'elite-product-commercial',
      figureArtDirection: 'curvaceous-editorial',
      outputQuality: '1080p',
      productCategory: 'miscellaneous',
      shotEnvironment: 'outdoor',
      subjectMode: 'product-only',
      textPrompt: 'Keep the packshot clean and premium.',
      videoDuration: 'base',
      workspace: 'image',
    })

    expect(prompt).toContain(
      'Create a high-quality image for a miscellaneous product campaign.',
    )
    expect(prompt).toContain(
      'Art direction: elite product commercial direction with high-end luxury polish and crisp material detail.',
    )
    expect(prompt).toContain(
      'Shot environment: outdoor location with natural environmental context.',
    )
    expect(prompt).not.toContain('Character demographics:')
    expect(prompt).not.toContain('Figure art direction:')
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
