import type {
  BatchSize,
  ContentConcept,
  CreativeStyle,
  GuidedAnalysisPlan,
  GuidedAnalysisShot,
  KieAnalysisModel,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
} from '@/lib/generation/types'

export const kieAnalysisModels: KieAnalysisModel[] = [
  'gemini-2.5-flash',
  'claude-haiku-4-5',
  'claude-sonnet-4-6',
]

export const contentConcepts: ContentConcept[] = [
  'driven-ads',
  'affiliate',
]

export function normalizeKieAnalysisModel(
  value: string,
): KieAnalysisModel | null {
  switch (value) {
    case 'gemini-2.5-flash':
    case 'claude-haiku-4-5':
    case 'claude-sonnet-4-6':
      return value
    case 'claude-haiku-4.5':
      return 'claude-haiku-4-5'
    case 'claude-sonnet-4.5':
    case 'claude-sonnet-4.6':
      return 'claude-sonnet-4-6'
    default:
      return null
  }
}

const guidedProductCategories: ProductCategory[] = [
  'food-drink',
  'jewelry',
  'cosmetics',
  'electronics',
  'clothing',
  'miscellaneous',
]

const guidedCreativeStyles: CreativeStyle[] = [
  'ugc-lifestyle',
  'cinematic',
  'tv-commercial',
  'elite-product-commercial',
]

export function getGuidedCreativeStyleForConcept(
  concept: ContentConcept,
): CreativeStyle {
  return concept === 'driven-ads' ? 'tv-commercial' : 'ugc-lifestyle'
}

export function clampGuidedShotCount(value: number): BatchSize {
  if (value <= 1) {
    return 1
  }

  if (value >= 4) {
    return 4
  }

  return value as BatchSize
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeShot(
  value: unknown,
  index: number,
): GuidedAnalysisShot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : ''
  const slugCandidate =
    typeof record.slug === 'string' ? record.slug.trim() : title
  const slug = slugify(slugCandidate || `shot-${index + 1}`)
  const subjectMode =
    record.subjectMode === 'lifestyle' || record.subjectMode === 'product-only'
      ? (record.subjectMode as SubjectMode)
      : null
  const shotEnvironment =
    record.shotEnvironment === 'indoor' || record.shotEnvironment === 'outdoor'
      ? (record.shotEnvironment as ShotEnvironment)
      : null

  if (!title || !prompt || !slug || !subjectMode || !shotEnvironment) {
    return null
  }

  return {
    prompt,
    shotEnvironment,
    slug,
    subjectMode,
    tags: Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    title,
  }
}

export function normalizeGuidedAnalysisPlan(
  value: unknown,
  options: {
    shotCount?: number
  } = {},
): GuidedAnalysisPlan {
  if (!value || typeof value !== 'object') {
    throw new Error('Guided analysis did not return a valid plan object.')
  }

  const record = value as Record<string, unknown>
  const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
  const productCategory = guidedProductCategories.includes(
    record.productCategory as ProductCategory,
  )
    ? (record.productCategory as ProductCategory)
    : null
  const creativeStyle = guidedCreativeStyles.includes(
    record.creativeStyle as CreativeStyle,
  )
    ? (record.creativeStyle as CreativeStyle)
    : null
  const normalizedShots = Array.isArray(record.shots)
    ? record.shots
        .map((shot, index) => normalizeShot(shot, index))
        .filter((shot): shot is GuidedAnalysisShot => Boolean(shot))
    : []

  if (!summary) {
    throw new Error('Guided analysis did not return a summary.')
  }

  if (!productCategory) {
    throw new Error('Guided analysis did not return a valid product category.')
  }

  if (!creativeStyle) {
    throw new Error('Guided analysis did not return a valid creative style.')
  }

  if (normalizedShots.length === 0) {
    throw new Error('Guided analysis did not return any usable shots.')
  }

  const shotCount =
    typeof options.shotCount === 'number'
      ? clampGuidedShotCount(options.shotCount)
      : normalizedShots.length >= 1 && normalizedShots.length <= 4
        ? (normalizedShots.length as BatchSize)
        : null

  if (shotCount && normalizedShots.length !== shotCount) {
    throw new Error(`Guided analysis returned ${normalizedShots.length} shots instead of ${shotCount}.`)
  }

  return {
    creativeStyle,
    productCategory,
    shots: normalizedShots.slice(0, 4),
    summary,
  }
}
