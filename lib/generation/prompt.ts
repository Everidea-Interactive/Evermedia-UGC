import type {
  CameraMovement,
  CharacterAgeGroup,
  CharacterEthnicity,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  GenerationVariantIndex,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  UploadedAssetDescriptor,
  VideoDuration,
  WorkspaceTab,
} from '@/lib/generation/types'

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

export const variantProfileSuffixes: Record<GenerationVariantIndex, string> = {
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

export function compileGenerationPrompt(input: {
  assets: UploadedAssetDescriptor[]
  cameraMovement: CameraMovement | null
  characterAgeGroup: CharacterAgeGroup
  characterEthnicity: CharacterEthnicity
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  figureArtDirection: FigureArtDirection
  outputQuality: OutputQuality
  productCategory: ProductCategory
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  workspace: WorkspaceTab
}) {
  const endFrame = chooseEndFrameReference(input.assets)
  const named = getNamedReferenceMap(input.assets)
  const products = getOrderedProductReferences(input.assets)
  const face1 = named.get('face1')
  const face2 = named.get('face2')
  const identityReference =
    input.subjectMode === 'lifestyle' ? face1 ?? face2 ?? null : null
  const productReference = products[0] ?? null
  const clothingReference = named.get('clothing') ?? null
  const locationReference = named.get('location') ?? null
  const explicitlyDescribedFieldNames = new Set(
    [
      identityReference?.fieldName,
      face1 && face2 ? face2.fieldName : null,
      productReference?.fieldName,
      clothingReference?.fieldName,
      locationReference?.fieldName,
      endFrame?.fieldName,
    ].filter((value): value is string => Boolean(value)),
  )
  const supportingReferenceLabels = input.assets
    .filter((asset) => !explicitlyDescribedFieldNames.has(asset.fieldName))
    .map((asset) => asset.label)
    .slice()
    .sort()

  const promptParts = [
    `Create a ${input.workspace === 'video' ? 'video' : 'high-quality image'} for a ${categoryPhrases[input.productCategory]} campaign.`,
    `Art direction: ${stylePhrases[input.creativeStyle]}.`,
    subjectPhrases[input.subjectMode],
    environmentPhrases[input.shotEnvironment],
  ]

  if (input.subjectMode === 'lifestyle') {
    const demographicSelections = [
      input.characterGender,
      input.characterAgeGroup,
      input.characterEthnicity,
    ].filter((value) => value !== 'any')

    if (demographicSelections.length > 0) {
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

  if (input.workspace === 'video') {
    promptParts.push(
      `Clip intent: ${input.videoDuration === 'base' ? 'short-form 5 to 8 second pacing' : 'extended pacing with extra action beats'}.`,
    )
    promptParts.push(
      `Target delivery: ${input.outputQuality} output where the selected model supports it.`,
    )
  }

  if (input.cameraMovement) {
    promptParts.push(movementPhrases[input.cameraMovement])
  }

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

  if (supportingReferenceLabels.length > 0) {
    promptParts.push(
      `Additional supporting references available: ${supportingReferenceLabels.join(', ')}.`,
    )
  }

  if (endFrame && input.workspace === 'video') {
    promptParts.push(`Use ${endFrame.label} as the end-frame guidance when supported.`)
  }

  if (input.textPrompt.trim()) {
    promptParts.push(input.textPrompt.trim())
  }

  return promptParts.join(' ').replace(/\s+/g, ' ').trim()
}

export function buildVariantPromptSet(input: {
  basePrompt: string
  batchSize: GenerationVariantIndex
  cameraMovement: CameraMovement | null
  workspace: WorkspaceTab
}) {
  return (Array.from({ length: input.batchSize }, (_, index) =>
    index + 1,
  ) as GenerationVariantIndex[]).map((variantIndex) => {
    const profile = variantProfileSuffixes[variantIndex]
    const movementSentence =
      input.workspace === 'video' && input.cameraMovement
        ? ` ${movementVariantPhrases[input.cameraMovement]}`
        : ''

    return {
      index: variantIndex,
      profile,
      prompt: `${input.basePrompt} ${profile}${movementSentence}`
        .replace(/\s+/g, ' ')
        .trim(),
    }
  })
}

export function describeSelection(value: string | null) {
  return value ? humanizeLabel(value) : 'none'
}
