import { normalizeKieAnalysisModel } from '@/lib/generation/guided'
import type {
  IdeationConceptCard,
  IdeationResult,
} from '@/lib/generation/types'
import type {
  IdeationInputSnapshot,
} from '@/lib/persistence/types'

function normalizeConceptCard(
  value: unknown,
): IdeationConceptCard | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const audience =
    typeof record.audience === 'string' ? record.audience.trim() : ''
  const angle = typeof record.angle === 'string' ? record.angle.trim() : ''
  const hook = typeof record.hook === 'string' ? record.hook.trim() : ''
  const keyMessage =
    typeof record.keyMessage === 'string' ? record.keyMessage.trim() : ''
  const visualDirection =
    typeof record.visualDirection === 'string'
      ? record.visualDirection.trim()
      : ''
  const cta = typeof record.cta === 'string' ? record.cta.trim() : ''

  if (
    !title ||
    !audience ||
    !angle ||
    !hook ||
    !keyMessage ||
    !visualDirection ||
    !cta
  ) {
    return null
  }

  return {
    angle,
    audience,
    cta,
    hook,
    keyMessage,
    title,
    visualDirection,
  }
}

export function normalizeIdeationResult(value: unknown): IdeationResult {
  if (!value || typeof value !== 'object') {
    throw new Error('Ideation analysis did not return a valid result object.')
  }

  const record = value as Record<string, unknown>
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  const concepts = Array.isArray(record.concepts)
    ? record.concepts
        .map((concept) => normalizeConceptCard(concept))
        .filter((concept): concept is IdeationConceptCard => Boolean(concept))
    : []

  if (!summary) {
    throw new Error('Ideation analysis did not return a summary.')
  }

  if (concepts.length !== 3) {
    throw new Error(
      `Ideation analysis returned ${concepts.length} concepts instead of 3.`,
    )
  }

  return {
    concepts: concepts as IdeationResult['concepts'],
    summary,
  }
}

export function normalizeIdeationInputSnapshot(
  value: unknown,
): IdeationInputSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const analysisModel = normalizeKieAnalysisModel(
    typeof record.analysisModel === 'string' ? record.analysisModel : '',
  )
  const briefText =
    typeof record.briefText === 'string' ? record.briefText.trim() : ''
  const contentConcept =
    record.contentConcept === 'driven-ads' || record.contentConcept === 'affiliate'
      ? record.contentConcept
      : null
  const heroImageName =
    typeof record.heroImageName === 'string' ? record.heroImageName.trim() : ''
  const heroImageUrl =
    typeof record.heroImageUrl === 'string' ? record.heroImageUrl.trim() : ''
  const productUrl =
    typeof record.productUrl === 'string' ? record.productUrl.trim() : ''
  const normalizedHeroImageName = heroImageName || null
  const normalizedHeroImageUrl = heroImageUrl || null
  const normalizedProductUrl = productUrl || null
  const hasHeroImage = Boolean(normalizedHeroImageName && normalizedHeroImageUrl)

  if (
    !analysisModel ||
    !contentConcept ||
    (!hasHeroImage && !normalizedProductUrl) ||
    ((normalizedHeroImageName && !normalizedHeroImageUrl) ||
      (!normalizedHeroImageName && normalizedHeroImageUrl))
  ) {
    return null
  }

  return {
    analysisModel,
    briefText,
    contentConcept,
    heroImageName: normalizedHeroImageName,
    heroImageUrl: normalizedHeroImageUrl,
    productUrl: normalizedProductUrl,
  }
}

export function formatIdeationConceptCardText(
  concept: IdeationConceptCard,
  index: number,
) {
  return [
    `Concept ${index + 1}: ${concept.title}`,
    `Audience: ${concept.audience}`,
    `Angle: ${concept.angle}`,
    `Hook: ${concept.hook}`,
    `Key message: ${concept.keyMessage}`,
    `Visual direction: ${concept.visualDirection}`,
    `CTA: ${concept.cta}`,
  ].join('\n')
}

export function formatIdeationResultText(result: IdeationResult) {
  return [
    'Ideation Brief',
    '',
    `Summary: ${result.summary}`,
    '',
    ...result.concepts.flatMap((concept, index) => [
      formatIdeationConceptCardText(concept, index),
      '',
    ]),
  ]
    .join('\n')
    .trim()
}
