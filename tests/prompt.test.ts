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
  it('creates a deterministic lifestyle video prompt with generic ordered references', () => {
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
      'Continuity safeguards: maintain natural, physically plausible human anatomy with exactly two arms, two hands, five fingers per visible hand, stable facial identity, correct hand-to-product contact, and commercially believable product usage throughout the full clip.',
    )
    expect(prompt).toContain(
      'Do not introduce extra limbs, duplicate people, floating products, broken object interaction, unreadable labels, wrong packaging, off-brand logos, or incorrect product handling.',
    )
    expect(prompt).toContain(
      'Identity reference: Face 1. Keep the on-camera subject as the same person throughout the full clip with matching facial structure, skin tone, hairline, and overall likeness.',
    )
    expect(prompt).toContain(
      'Reference 1: Face 1. Treat this as ordered visual guidance and preserve its key subject details, design cues, and scene fidelity.',
    )
    expect(prompt).toContain(
      'Wardrobe reference: Clothing. Use it only for outfit and styling cues. Do not let it override the identity reference.',
    )
    expect(prompt).toContain(
      'Reference 2: Clothing. Treat this as ordered visual guidance and preserve its key subject details, design cues, and scene fidelity.',
    )
    expect(prompt).toContain(
      'Product reference: Product 1. Preserve the same exact product SKU throughout the clip, including packaging, branding, proportions, materials, and colorway.',
    )
    expect(prompt).toContain(
      'Reference 3: Product 1. Treat this as ordered visual guidance and preserve its key subject details, design cues, and scene fidelity.',
    )
    expect(prompt).toContain(
      'Shot environment: curated indoor setting with studio-grade control.',
    )
    expect(prompt).not.toContain('Current date context:')
    expect(prompt).not.toContain('Character demographics:')
    expect(prompt).toContain('Use End Frame as the end-frame guidance when supported.')
    expect(prompt).not.toContain(
      'Animate the supplied reference image into a motion-controlled video sequence.',
    )
    expect(prompt).not.toContain(
      'Create a high-quality image for a beauty and cosmetics campaign.',
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

  it('distinguishes primary and alternate face and product references in lifestyle image prompts', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({ key: 'face1', label: 'Face 1' }),
        makeAsset({
          fieldName: 'asset_face2',
          key: 'face2',
          label: 'Face 2',
          order: 1,
          remoteUrl: 'https://example.com/face-2.png',
        }),
        makeAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Product 1',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://example.com/product-1.png',
        }),
        makeAsset({
          fieldName: 'product_slot_2',
          kind: 'product',
          label: 'Product 2',
          order: 101,
          productId: 'product-2',
          remoteUrl: 'https://example.com/product-2.png',
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
      'Identity reference: Face 1. Keep the on-camera subject as the same person with matching facial structure, skin tone, hairline, and overall likeness.',
    )
    expect(prompt).toContain(
      'Additional face reference: Face 2. Use it only as alternate angle or expression guidance for the same person. Do not blend multiple identities.',
    )
    expect(prompt).toContain(
      'Product reference: Product 1. Preserve the exact product design, packaging, branding, proportions, materials, and colorway from this reference.',
    )
    expect(prompt).toContain(
      'Additional product reference: Product 2. Use it only as alternate angle or composition guidance for the same exact product. Do not introduce a different product, packaging variant, colorway, or material finish.',
    )
  })

  it('adds anatomy safeguards for lifestyle image prompts', () => {
    const prompt = compileGenerationPrompt({
      assets: [makeAsset({ key: 'face1', label: 'Face 1' })],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'lifestyle',
      textPrompt: 'Actor holds the bottle with both hands.',
      videoDuration: 'base',
      workspace: 'image',
    })

    expect(prompt).toContain(
      'Anatomy integrity: render natural, physically plausible human anatomy with exactly two arms, two hands, five fingers per visible hand, correctly attached limbs, and no duplicated, missing, fused, or distorted body parts.',
    )
    expect(prompt).toContain(
      'Image safeguards: maintain believable hand-to-product contact, correct product usage, stable label readability, faithful packaging, accurate brand marks, and no extra limbs, duplicate people, floating products, broken grips, wrong packaging variants, or off-brand logos.',
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
    expect(prompt).toContain(
      'Image safeguards: maintain believable hand-to-product contact, correct product usage, stable label readability, faithful packaging, accurate brand marks, and no extra limbs, duplicate people, floating products, broken grips, wrong packaging variants, or off-brand logos.',
    )
    expect(prompt).not.toContain(
      'Animate the supplied reference image into a motion-controlled video sequence.',
    )
    expect(prompt).not.toContain('Character demographics:')
    expect(prompt).not.toContain('Figure art direction:')
  })

  it('omits demographics in lifestyle prompts when a face reference is uploaded', () => {
    const prompt = compileGenerationPrompt({
      assets: [makeAsset({ key: 'face1', label: 'Face 1' })],
      cameraMovement: null,
      characterAgeGroup: 'young-adult',
      characterGender: 'female',
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

    expect(prompt).not.toContain('Character demographics:')
    expect(prompt).toContain('Identity reference:')
  })

  it('does not inject date context into non-carousel prompts even when prompt text is date-sensitive', () => {
    const prompt = compileGenerationPrompt({
      assets: [],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: 'Launch this promo today and keep June 20, 2026 pricing visible.',
      videoDuration: 'base',
      currentDate: new Date('2026-06-05T00:00:00.000Z'),
      workspace: 'image',
    })

    expect(prompt).not.toContain('Current date context:')
  })

  it('uses a motion-control-specific baseline instead of image baseline wording', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({
          fieldName: 'asset_motionControlReferenceImage',
          key: 'face1',
          label: 'Reference Image',
          order: 1,
          remoteUrl: 'https://example.com/reference.png',
        }),
        makeAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Product Reference',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://example.com/product.png',
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
      textPrompt: 'Keep bottle label readable during the move.',
      videoDuration: 'base',
      videoModel: 'kling-3.0',
      workspace: 'motion-control',
    })

    expect(prompt).toContain(
      'Use the supplied motion reference video as the source of motion, action timing, and pose transitions.',
    )
    expect(prompt).toContain(
      'Use the supplied reference image as the visual replacement source.',
    )
    expect(prompt).toContain(
      'Maintain stable continuity, believable anatomy, correct object contact, clear brand readability, and commercially usable output.',
    )
    expect(prompt).toContain(
      'The character image acts as a strong global visual reference and may influence wardrobe, props, or held products during generation.',
    )
    expect(prompt).toContain('Keep bottle label readable during the move.')
    expect(prompt).not.toContain('Current date context:')
    expect(prompt).not.toContain('Create a high-quality image for a beauty and cosmetics campaign.')
    expect(prompt).not.toContain('Create a video for a beauty and cosmetics campaign.')
    expect(prompt).not.toContain('Animate the supplied reference image into a motion-controlled video sequence.')
  })

  it('uses a generic motion-control baseline without preset or background-specific wording', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({
          fieldName: 'asset_motionControlReferenceImage',
          key: 'face1',
          label: 'Reference Image',
          order: 1,
          remoteUrl: 'https://example.com/reference.png',
        }),
      ],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'miscellaneous',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'kling-3.0',
      workspace: 'motion-control',
    })

    expect(prompt).toContain(
      'Preserve the original motion flow from the motion reference video while keeping the generated character visually consistent with the supplied reference image.',
    )
    expect(prompt).not.toContain('Replace only the on-camera actor')
    expect(prompt).not.toContain('Replace only the featured product')
    expect(prompt).not.toContain('Keep the environment and backdrop aligned')
    expect(prompt).not.toContain('Adapt the environment and backdrop')
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

  it('does not append variant suffixes for motion-control prompts', () => {
    const variants = buildVariantPromptSet({
      basePrompt: 'Use motion control.',
      batchSize: 2,
      cameraMovement: null,
      workspace: 'motion-control',
    })

    expect(variants[0]?.prompt).toBe('Use motion control.')
    expect(variants[1]?.prompt).toBe('Use motion control.')
  })
})

describe('video duration prompt wording', () => {
  it('uses exact clip lengths in video prompts for the selected model', () => {
    const basePrompt = compileGenerationPrompt({
      assets: [],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'seedance-1.5-pro',
      workspace: 'video',
    })

    const extendedPrompt = compileGenerationPrompt({
      assets: [],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'extended',
      videoModel: 'seedance-1.5-pro',
      workspace: 'video',
    })

    const veoExtendedPrompt = compileGenerationPrompt({
      assets: [],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'extended',
      videoModel: 'veo-3.1',
      workspace: 'video',
    })

    expect(basePrompt).toContain(
      'Clip intent: build a complete 8-second arc with clear opening, middle development, and closing payoff.',
    )
    expect(basePrompt).toContain('Keep pacing scoped to 8 seconds exactly.')
    expect(extendedPrompt).toContain(
      'Clip intent: build a complete 12-second arc with clear opening, middle development, and closing payoff.',
    )
    expect(veoExtendedPrompt).toContain(
      'Clip intent: build a complete 8-second arc with clear opening, middle development, and closing payoff.',
    )
  })

  it('uses Seedance 2.0 clip lengths in video prompts', () => {
    const basePrompt = compileGenerationPrompt({
      assets: [],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'seedance-2',
      workspace: 'video',
    })

    const extendedPrompt = compileGenerationPrompt({
      assets: [],
      cameraMovement: null,
      characterAgeGroup: 'any',
      characterGender: 'any',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'none',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'extended',
      videoModel: 'seedance-2',
      workspace: 'video',
    })

    expect(basePrompt).toContain(
      'Clip intent: build a complete 5-second arc with clear opening, middle development, and closing payoff.',
    )
    expect(extendedPrompt).toContain(
      'Clip intent: build a complete 10-second arc with clear opening, middle development, and closing payoff.',
    )
  })

  it('omits end-frame wording for video models that do not support it', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({
          fieldName: 'asset_endFrame',
          key: 'endFrame',
          label: 'End Frame',
          order: 4,
          remoteUrl: 'https://example.com/end-frame.png',
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
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'seedance-1.5-pro',
      workspace: 'video',
    })

    expect(prompt).not.toContain('Use End Frame as the end-frame guidance when supported.')
  })

  it('describes dedicated first and last frames for Seedance 2.0 while keeping other references separate', () => {
    const prompt = compileGenerationPrompt({
      assets: [
        makeAsset({
          fieldName: 'asset_firstFrame',
          key: 'firstFrame',
          label: 'First Frame',
          order: 90,
          remoteUrl: 'https://example.com/first-frame.png',
        }),
        makeAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Reference 1',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://example.com/reference-1.png',
        }),
        makeAsset({
          fieldName: 'asset_endFrame',
          key: 'endFrame',
          label: 'End Frame',
          order: 101,
          remoteUrl: 'https://example.com/end-frame.png',
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
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'seedance-2',
      workspace: 'video',
    })

    expect(prompt).toContain(
      'First frame: First Frame. Treat this as the required opening frame anchor and preserve its exact composition, subject identity, and scene setup at the start of the clip.',
    )
    expect(prompt).toContain(
      'Product reference: Reference 1. Preserve the same exact product SKU throughout the clip, including packaging, branding, proportions, materials, and colorway.',
    )
    expect(prompt).toContain(
      'Reference 1: Reference 1. Treat this as ordered visual guidance and preserve its key subject details, design cues, and scene fidelity.',
    )
    expect(prompt).toContain('Use End Frame as the end-frame guidance when supported.')
  })
})
