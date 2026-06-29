import type {
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  UploadedAssetDescriptor,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import {
  getMaxVideoReferenceCount,
  getVideoDurationSeconds,
  supportsVideoEndFrameGuidance,
  supportsVideoFirstLastFramePair,
} from '@/lib/generation/model-mapping'

type PromptVariantIndex = 1 | 2 | 3 | 4

type CompileGenerationPromptInput = {
  assets: UploadedAssetDescriptor[]
  cameraMovement: CameraMovement | null
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  figureArtDirection: FigureArtDirection
  outputQuality: OutputQuality
  productCategory: ProductCategory
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel?: VideoModelOption
  workspace: WorkspaceTab
  currentDate?: Date
  motionControlAdditionalInstructions?: string
}

const categoryPhrases: Record<ProductCategory, string> = {
  'food-drink': 'food and beverage',
  jewelry: 'jewelry',
  cosmetics: 'beauty and cosmetics',
  electronics: 'consumer electronics',
  clothing: 'fashion apparel',
  miscellaneous: 'miscellaneous product',
}

const stylePhrases: Record<CreativeStyle, string> = {
  'ugc-lifestyle': 'UGC lifestyle direction with believable real-world polish',
  cinematic: 'Hollywood cinematic direction with premium lighting and composed framing',
  'tv-commercial': 'TV commercial direction with polished brand-forward clarity',
  'elite-product-commercial':
    'elite product commercial direction with high-end luxury polish and crisp material detail',
}

const subjectPhrases: Record<SubjectMode, string> = {
  'product-only': 'Keep the product as the sole hero subject with no visible person.',
  lifestyle:
    'Stage a lifestyle composition that naturally includes a person interacting with the product.',
}

const lifestyleImageAnatomySafeguard =
  'Anatomy integrity: render natural, physically plausible human anatomy with exactly two arms, two hands, five fingers per visible hand, correctly attached limbs, and no duplicated, missing, fused, or distorted body parts.'

const imageProductUsageSafeguard =
  'Image safeguards: maintain believable hand-to-product contact, correct product usage, stable label readability, faithful packaging, accurate brand marks, and no extra limbs, duplicate people, floating products, broken grips, wrong packaging variants, or off-brand logos.'

const lifestyleVideoContinuitySafeguard =
  'Continuity safeguards: maintain natural, physically plausible human anatomy with exactly two arms, two hands, five fingers per visible hand, stable facial identity, correct hand-to-product contact, and commercially believable product usage throughout the full clip.'

const productUsageSafeguard =
  'Do not introduce extra limbs, duplicate people, floating products, broken object interaction, unreadable labels, wrong packaging, off-brand logos, or incorrect product handling.'

const environmentPhrases: Record<ShotEnvironment, string> = {
  indoor: 'Shot environment: curated indoor setting with studio-grade control.',
  outdoor: 'Shot environment: outdoor location with natural environmental context.',
}

const figureArtDirectionPhrases: Record<FigureArtDirection, string> = {
  none: '',
  'curvaceous-editorial':
    'Figure art direction: curvaceous editorial with full-figure styling, dramatic curves, and fashion-forward composition language.',
}

const movementPhrases: Record<CameraMovement, string> = {
  orbit: 'Use an orbiting camera move with smooth parallax around the subject.',
  dolly: 'Use a controlled dolly move that adds depth and forward momentum.',
  drone: 'Use a clean elevated drift with a subtle drone-style glide.',
  'crash-zoom': 'Use a dramatic crash zoom that lands on the key brand moment.',
  macro: 'Use macro-style framing that highlights material detail and surface texture.',
}

const movementVariantPhrases: Record<CameraMovement, string> = {
  orbit:
    'Let the motion stay committed to a confident orbit that keeps dimensional separation around the subject.',
  dolly:
    'Let the motion emphasize a steady dolly move that builds momentum toward the hero beat.',
  drone:
    'Let the motion carry a poised aerial drift that reveals the environment without losing subject clarity.',
  'crash-zoom':
    'Let the motion commit to a punchy crash zoom that snaps into the core campaign moment.',
  macro:
    'Let the motion stay intimate and macro-led so material detail and texture remain the focal point.',
}

export const variantProfileSuffixes: Record<PromptVariantIndex, string> = {
  1: 'Keep the strongest hero composition closest to the base brief.',
  2: 'Explore an alternate framing and composition while preserving brand intent and subject identity.',
  3: 'Explore a different lighting mood and environmental emphasis while keeping the same product story.',
  4: 'Explore a different interaction beat, pose, or timing while keeping the same campaign goal.',
}

function humanizeLabel(value: string) {
  return value.replace(/-/g, ' ')
}

function getNamedReferenceMap(assets: UploadedAssetDescriptor[]) {
  return new Map(
    assets
      .filter((asset) => asset.kind === 'named' && asset.key)
      .map((asset) => [asset.key, asset]),
  )
}

function getOrderedProductReferences(assets: UploadedAssetDescriptor[]) {
  return assets
    .filter((asset) => asset.kind === 'product')
    .slice()
    .sort((left, right) => left.order - right.order)
}

function getOrderedVideoStartReferences(assets: UploadedAssetDescriptor[]) {
  return assets
    .filter(
      (asset) =>
        !(
          asset.kind === 'named' &&
          (asset.key === 'firstFrame' || asset.key === 'endFrame')
        ),
    )
    .slice()
    .sort((left, right) => left.order - right.order)
}

function finalizePrompt(parts: string[]) {
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function buildClipIntentInstruction(input: {
  videoDuration: VideoDuration
  videoModel?: VideoModelOption
}) {
  const durationSeconds = getVideoDurationSeconds(
    input.videoModel ?? 'veo-3.1',
    input.videoDuration,
  )

  return `Clip intent: build a complete ${durationSeconds}-second arc with clear opening, middle development, and closing payoff. Keep pacing scoped to ${durationSeconds} seconds exactly.`
}

function buildSharedCampaignContext(input: CompileGenerationPromptInput) {
  return [
    `Art direction: ${stylePhrases[input.creativeStyle]}.`,
    subjectPhrases[input.subjectMode],
    environmentPhrases[input.shotEnvironment],
  ]
}

function buildSupportingReferenceLine(
  assets: UploadedAssetDescriptor[],
  explicitlyDescribedFieldNames: Set<string>,
) {
  const supportingReferenceLabels = assets
    .filter((asset) => !explicitlyDescribedFieldNames.has(asset.fieldName))
    .map((asset) => asset.label)
    .slice()
    .sort()

  return supportingReferenceLabels.length > 0
    ? `Additional supporting references available: ${supportingReferenceLabels.join(', ')}.`
    : null
}

function compileImagePrompt(input: CompileGenerationPromptInput) {
  const named = getNamedReferenceMap(input.assets)
  const products = getOrderedProductReferences(input.assets)
  const face1 = named.get('face1')
  const face2 = named.get('face2')
  const identityReference =
    input.subjectMode === 'lifestyle' ? face1 ?? face2 ?? null : null
  const productReference = products[0] ?? null
  const additionalProductReferences = products.slice(1)
  const clothingReference = named.get('clothing') ?? null
  const locationReference = named.get('location') ?? null
  const brandLogoReference = named.get('brandLogo') ?? null
  const explicitlyDescribedFieldNames = new Set<string>()

  for (const fieldName of [
    identityReference?.fieldName,
    face1 && face2 ? face2.fieldName : null,
    productReference?.fieldName,
    ...additionalProductReferences.map((reference) => reference.fieldName),
    clothingReference?.fieldName,
    locationReference?.fieldName,
    brandLogoReference?.fieldName,
  ]) {
    if (fieldName) {
      explicitlyDescribedFieldNames.add(fieldName)
    }
  }

  const promptParts = [
    `Create a high-quality image for a ${categoryPhrases[input.productCategory]} campaign.`,
    ...buildSharedCampaignContext(input),
  ]

  if (input.subjectMode === 'lifestyle') {
    const demographicSelections = [
      input.characterGender,
      input.characterAgeGroup,
    ].filter((value) => value !== 'any')

    if (input.workspace === 'image') {
      promptParts.push(lifestyleImageAnatomySafeguard)
    }

    if (demographicSelections.length > 0 && !identityReference) {
      promptParts.push(
        `Character demographics: ${demographicSelections
          .map((value) => humanizeLabel(value))
          .join(', ')}.`,
      )
    }

    if (input.figureArtDirection !== 'none') {
      promptParts.push(figureArtDirectionPhrases[input.figureArtDirection])
    }
  }

  promptParts.push(imageProductUsageSafeguard)

  if (identityReference) {
    promptParts.push(
      `Identity reference: ${identityReference.label}. Keep the on-camera subject as the same person with matching facial structure, skin tone, hairline, and overall likeness.`,
    )
  }

  if (face1 && face2) {
    promptParts.push(
      `Additional face reference: ${face2.label}. Use it only as alternate angle or expression guidance for the same person. Do not blend multiple identities.`,
    )
  }

  if (productReference) {
    promptParts.push(
      `Product reference: ${productReference.label}. Preserve the exact product design, packaging, branding, proportions, materials, and colorway from this reference.`,
    )
  }

  for (const reference of additionalProductReferences) {
    promptParts.push(
      `Additional product reference: ${reference.label}. Use it only as alternate angle or composition guidance for the same exact product. Do not introduce a different product, packaging variant, colorway, or material finish.`,
    )
  }

  if (clothingReference) {
    promptParts.push(
      `Wardrobe reference: ${clothingReference.label}. Use it only for outfit and styling cues. Ignore any face in that image if it conflicts with the identity reference.`,
    )
  }

  if (locationReference) {
    promptParts.push(
      `Location reference: ${locationReference.label}. Use it only for environment and background guidance.`,
    )
  }

  if (brandLogoReference) {
    promptParts.push(
      `Brand logo reference: ${brandLogoReference.label}. Use it for brand logo-placement, color palette guidance, and visual identity cues. Integrate the logo naturally into the composition.`,
    )
  }

  if (input.textPrompt.trim()) {
    promptParts.push(input.textPrompt.trim())
  }

  const supportingReferenceLine = buildSupportingReferenceLine(
    input.assets,
    explicitlyDescribedFieldNames,
  )

  if (supportingReferenceLine) {
    promptParts.push(supportingReferenceLine)
  }

  return finalizePrompt(promptParts)
}

function compileVideoPrompt(input: CompileGenerationPromptInput) {
  const named = getNamedReferenceMap(input.assets)
  const products = getOrderedProductReferences(input.assets)
  const firstFrame = chooseFirstFrameReference(input.assets)
  const endFrame = chooseEndFrameReference(input.assets)
  const videoReferences = getOrderedVideoStartReferences(input.assets).slice(
    0,
    getMaxVideoReferenceCount(input.videoModel ?? 'veo-3.1'),
  )
  const limitedReferenceFieldNames = new Set(
    videoReferences.map((reference) => reference.fieldName),
  )
  const face1 = named.get('face1')
  const face2 = named.get('face2')
  const identityReference =
    input.subjectMode === 'lifestyle' &&
    face1 &&
    limitedReferenceFieldNames.has(face1.fieldName)
      ? face1
      : input.subjectMode === 'lifestyle' &&
          face2 &&
          limitedReferenceFieldNames.has(face2.fieldName)
        ? face2
        : null
  const additionalFaceReference =
    identityReference?.fieldName === face1?.fieldName &&
    face2 &&
    limitedReferenceFieldNames.has(face2.fieldName)
      ? face2
      : null
  const productReference =
    products.find((reference) => limitedReferenceFieldNames.has(reference.fieldName)) ?? null
  const additionalProductReferences = productReference
    ? products.filter(
        (reference) =>
          reference.fieldName !== productReference.fieldName &&
          limitedReferenceFieldNames.has(reference.fieldName),
      )
    : products.filter((reference) => limitedReferenceFieldNames.has(reference.fieldName))
  const clothingReference =
    named.get('clothing') &&
    limitedReferenceFieldNames.has(named.get('clothing')!.fieldName)
      ? named.get('clothing')!
      : null
  const locationReference =
    named.get('location') &&
    limitedReferenceFieldNames.has(named.get('location')!.fieldName)
      ? named.get('location')!
      : null
  const brandLogoReference =
    named.get('brandLogo') &&
    limitedReferenceFieldNames.has(named.get('brandLogo')!.fieldName)
      ? named.get('brandLogo')!
      : null
  const explicitlyDescribedFieldNames = new Set<string>(
    [
      firstFrame?.fieldName,
      endFrame?.fieldName,
      identityReference?.fieldName,
      additionalFaceReference?.fieldName,
      productReference?.fieldName,
      ...additionalProductReferences.map((reference) => reference.fieldName),
      clothingReference?.fieldName,
      locationReference?.fieldName,
      brandLogoReference?.fieldName,
    ].filter((value): value is string => Boolean(value)),
  )

  const promptParts = [
    `Create a video for a ${categoryPhrases[input.productCategory]} campaign.`,
    ...buildSharedCampaignContext(input),
  ]

  if (input.subjectMode === 'lifestyle') {
    const demographicSelections = [
      input.characterGender,
      input.characterAgeGroup,
    ].filter((value) => value !== 'any')

    promptParts.push(lifestyleVideoContinuitySafeguard)

    if (demographicSelections.length > 0 && !identityReference) {
      promptParts.push(
        `Character demographics: ${demographicSelections
          .map((value) => humanizeLabel(value))
          .join(', ')}.`,
      )
    }

    if (input.figureArtDirection !== 'none') {
      promptParts.push(figureArtDirectionPhrases[input.figureArtDirection])
    }
  }

  promptParts.push(buildClipIntentInstruction(input))
  promptParts.push(
    `Target delivery: ${input.outputQuality} output where the selected model supports it.`,
  )

  if (input.cameraMovement) {
    promptParts.push(movementPhrases[input.cameraMovement])
  }

  promptParts.push(productUsageSafeguard)

  if (identityReference) {
    promptParts.push(
      `Identity reference: ${identityReference.label}. Keep the on-camera subject as the same person throughout the full clip with matching facial structure, skin tone, hairline, and overall likeness.`,
    )
  }

  if (additionalFaceReference) {
    promptParts.push(
      `Additional face reference: ${additionalFaceReference.label}. Use it only as alternate angle or expression guidance for the same person. Do not introduce a second identity or blend multiple people.`,
    )
  }

  if (productReference) {
    promptParts.push(
      `Product reference: ${productReference.label}. Preserve the same exact product SKU throughout the clip, including packaging, branding, proportions, materials, and colorway.`,
    )
  }

  for (const reference of additionalProductReferences) {
    promptParts.push(
      `Additional product reference: ${reference.label}. Use it only as alternate angle or composition guidance for the same exact product. Do not introduce a different product, packaging variant, colorway, or material finish.`,
    )
  }

  if (clothingReference) {
    promptParts.push(
      `Wardrobe reference: ${clothingReference.label}. Use it only for outfit and styling cues. Do not let it override the identity reference.`,
    )
  }

  if (locationReference) {
    promptParts.push(
      `Location reference: ${locationReference.label}. Use it only for environment and background guidance while keeping scene continuity coherent across the clip.`,
    )
  }

  if (brandLogoReference) {
    promptParts.push(
      `Brand logo reference: ${brandLogoReference.label}. Use it for brand identity cues and keep any visible logo treatment faithful to the source branding.`,
    )
  }

  if (
    firstFrame &&
    supportsVideoFirstLastFramePair(input.videoModel ?? 'veo-3.1')
  ) {
    promptParts.push(
      `First frame: ${firstFrame.label}. Treat this as the required opening frame anchor and preserve its exact composition, subject identity, and scene setup at the start of the clip.`,
    )
  }

  videoReferences.forEach((reference, index) => {
    promptParts.push(
      `Reference ${index + 1}: ${reference.label}. Treat this as ordered visual guidance and preserve its key subject details, design cues, and scene fidelity.`,
    )
  })

  const supportingReferenceLine = buildSupportingReferenceLine(
    input.assets,
    explicitlyDescribedFieldNames,
  )

  if (supportingReferenceLine) {
    promptParts.push(supportingReferenceLine)
  }

  if (input.videoModel === 'kling-3.0') {
    promptParts.push(
      'Describe subject motion, camera behavior, and scene composition explicitly for best temporal coherence.',
    )
  }

  if (
    endFrame &&
    supportsVideoEndFrameGuidance(input.videoModel ?? 'veo-3.1') &&
    (!supportsVideoFirstLastFramePair(input.videoModel ?? 'veo-3.1') ||
      firstFrame)
  ) {
    promptParts.push(`Use ${endFrame.label} as the end-frame guidance when supported.`)
  }

  if (input.textPrompt.trim()) {
    promptParts.push(input.textPrompt.trim())
  }

  return finalizePrompt(promptParts)
}

function compileMotionControlPrompt(input: CompileGenerationPromptInput) {
  const promptParts = [
    'Use the supplied motion reference video as the source of motion, action timing, and pose transitions.',
    'Use the supplied reference image as the visual replacement source.',
    'Preserve the original motion flow from the motion reference video while keeping the generated character visually consistent with the supplied reference image.',
    'The character image acts as a strong global visual reference and may influence wardrobe, props, or held products during generation.',
    'Maintain stable continuity, believable anatomy, correct object contact, clear brand readability, and commercially usable output.',
    'Do not introduce extra people, extra products, broken limbs, warped hands, floating objects, unreadable labels, identity blending, or unstable subject consistency.',
    `Target delivery: ${input.outputQuality} output where supported by motion-control pipeline.`,
  ]

  if (input.motionControlAdditionalInstructions?.trim()) {
    promptParts.push(input.motionControlAdditionalInstructions.trim())
  }

  if (input.textPrompt.trim()) {
    promptParts.push(input.textPrompt.trim())
  }

  return finalizePrompt(promptParts)
}

export function chooseFirstFrameReference(assets: UploadedAssetDescriptor[]) {
  return (
    assets.find(
      (asset) => asset.kind === 'named' && asset.key === 'firstFrame',
    ) ?? null
  )
}

export function choosePrimaryReference(
  subjectMode: SubjectMode,
  assets: UploadedAssetDescriptor[],
) {
  const named = getNamedReferenceMap(assets)
  const products = getOrderedProductReferences(assets)

  const face1 = named.get('face1')
  const face2 = named.get('face2')
  const identityReference = face1 ?? face2
  const fallbackProduct = products[0]

  if (subjectMode === 'lifestyle' && identityReference) {
    return identityReference
  }

  return fallbackProduct ?? identityReference ?? null
}

export function chooseEndFrameReference(assets: UploadedAssetDescriptor[]) {
  return (
    assets.find(
      (asset) => asset.kind === 'named' && asset.key === 'endFrame',
    ) ?? null
  )
}

export function compileGenerationPrompt(input: CompileGenerationPromptInput) {
  switch (input.workspace) {
    case 'image':
      return compileImagePrompt(input)
    case 'video':
      return compileVideoPrompt(input)
    case 'motion-control':
      return compileMotionControlPrompt(input)
    case 'carousel':
      throw new Error(
        'Carousel prompts must be built by buildCarouselBatchPrompt.',
      )
    default: {
      const exhaustiveCheck: never = input.workspace
      return exhaustiveCheck
    }
  }
}

export function buildVariantPromptSet(input: {
  basePrompt: string
  batchSize: PromptVariantIndex
  cameraMovement: CameraMovement | null
  workspace: WorkspaceTab
}) {
  return (Array.from({ length: input.batchSize }, (_, index) =>
    index + 1,
  ) as PromptVariantIndex[]).map((variantIndex) => {
    const profile = variantProfileSuffixes[variantIndex]
    const shouldApplyVariantSuffix =
      input.workspace === 'image' || input.workspace === 'video'
    const movementSentence =
      input.workspace === 'video' && input.cameraMovement
        ? ` ${movementVariantPhrases[input.cameraMovement]}`
        : ''

    return {
      index: variantIndex,
      profile,
      prompt: `${input.basePrompt}${shouldApplyVariantSuffix ? ` ${profile}` : ''}${movementSentence}`
        .replace(/\s+/g, ' ')
        .trim(),
    }
  })
}

export function describeSelection(value: string | null) {
  return value ? humanizeLabel(value) : 'none'
}
