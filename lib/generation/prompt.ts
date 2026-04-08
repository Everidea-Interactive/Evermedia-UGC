import type {
  CameraMovement,
  CreativeStyle,
  GenerationVariantIndex,
  OutputQuality,
  ProductCategory,
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
}

const stylePhrases: Record<CreativeStyle, string> = {
  'ugc-lifestyle': 'UGC lifestyle direction with believable real-world polish',
  cinematic: 'cinematic direction with premium lighting and composed framing',
  'tv-commercial': 'TV commercial direction with polished brand-forward clarity',
}

const subjectPhrases: Record<SubjectMode, string> = {
  'product-only': 'Keep the product as the sole hero subject with no visible person.',
  lifestyle:
    'Stage a lifestyle composition that naturally includes a person interacting with the product.',
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

export function choosePrimaryReference(
  subjectMode: SubjectMode,
  assets: UploadedAssetDescriptor[],
) {
  const named = new Map(
    assets
      .filter((asset) => asset.kind === 'named' && asset.key)
      .map((asset) => [asset.key, asset]),
  )
  const products = assets
    .filter((asset) => asset.kind === 'product')
    .slice()
    .sort((left, right) => left.order - right.order)

  const face1 = named.get('face1')
  const fallbackProduct = products[0]

  if (subjectMode === 'lifestyle' && face1) {
    return face1
  }

  return fallbackProduct ?? face1 ?? null
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
  creativeStyle: CreativeStyle
  outputQuality: OutputQuality
  productCategory: ProductCategory
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  workspace: WorkspaceTab
}) {
  const primaryReference = choosePrimaryReference(input.subjectMode, input.assets)
  const endFrame = chooseEndFrameReference(input.assets)
  const supportingReferenceLabels = input.assets
    .filter((asset) => asset.fieldName !== primaryReference?.fieldName)
    .filter((asset) => asset.fieldName !== endFrame?.fieldName)
    .map((asset) => asset.label)
    .slice()
    .sort()

  const promptParts = [
    `Create a ${input.workspace === 'video' ? 'video' : 'high-quality image'} for a ${categoryPhrases[input.productCategory]} campaign.`,
    `Art direction: ${stylePhrases[input.creativeStyle]}.`,
    subjectPhrases[input.subjectMode],
  ]

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

  if (primaryReference) {
    promptParts.push(
      `Primary visual reference: ${primaryReference.label}.`,
    )
  }

  if (supportingReferenceLabels.length > 0) {
    promptParts.push(
      `Supporting references available: ${supportingReferenceLabels.join(', ')}.`,
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
