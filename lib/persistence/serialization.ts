import { normalizeKieAnalysisModel } from '@/lib/generation/guided'
import type { GenerationRun, GuidedAnalysisShot } from '@/lib/generation/types'
import type {
  GenerationConfigSnapshot,
  GenerationRunRecord,
  GenerationVariantRecord,
  SavedOutputRecord,
} from '@/lib/persistence/types'

export const defaultProjectConfigSnapshot: GenerationConfigSnapshot = {
  activeTab: 'image',
  batchSize: 1,
  cameraMovement: 'orbit',
  characterAgeGroup: 'any',
  characterGender: 'any',
  creativeStyle: 'ugc-lifestyle',
  experience: 'manual',
  figureArtDirection: 'none',
  guided: null,
  imageModel: 'nano-banana',
  outputQuality: '1080p',
  productCategory: 'cosmetics',
  shotEnvironment: 'indoor',
  subjectMode: 'lifestyle',
  textPrompt: '',
  videoDuration: 'base',
  videoModel: 'veo-3.1',
}

function normalizeGuidedSnapshot(
  value: Partial<GenerationConfigSnapshot>['guided'],
): GenerationConfigSnapshot['guided'] {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const summary =
    typeof record.summary === 'string' ? record.summary.trim() : ''
  const productUrl =
    typeof record.productUrl === 'string' ? record.productUrl.trim() : ''
  const contentConcept =
    record.contentConcept === 'driven-ads' || record.contentConcept === 'affiliate'
      ? record.contentConcept
      : 'affiliate'
  const analysisModel = normalizeKieAnalysisModel(
    typeof record.analysisModel === 'string' ? record.analysisModel : '',
  ) ?? 'gemini-2.5-flash'
  const shots = Array.isArray(record.shots)
    ? record.shots.flatMap<GuidedAnalysisShot>((shot) => {
        if (!shot || typeof shot !== 'object') {
          return []
        }

        const candidate = shot as Record<string, unknown>
        const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
        const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : ''
        const prompt = typeof candidate.prompt === 'string' ? candidate.prompt.trim() : ''
        const subjectMode =
          candidate.subjectMode === 'lifestyle' || candidate.subjectMode === 'product-only'
            ? candidate.subjectMode
            : null
        const shotEnvironment =
          candidate.shotEnvironment === 'indoor' ||
          candidate.shotEnvironment === 'outdoor'
            ? candidate.shotEnvironment
            : null

        if (!title || !slug || !prompt || !subjectMode || !shotEnvironment) {
          return []
        }

        return [{
          prompt,
          shotEnvironment,
          slug,
          subjectMode,
          tags: Array.isArray(candidate.tags)
            ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
          title,
        }]
      })
    : []

  if (!summary || shots.length === 0) {
    return null
  }

  return {
    analysisModel,
    contentConcept,
    productUrl,
    shots,
    summary,
  }
}

export function normalizeProjectConfigSnapshot(
  snapshot: Partial<GenerationConfigSnapshot>,
): GenerationConfigSnapshot {
  const mergedSnapshot: GenerationConfigSnapshot = {
    ...defaultProjectConfigSnapshot,
    ...snapshot,
    experience: snapshot.experience === 'guided' ? 'guided' : 'manual',
    guided: normalizeGuidedSnapshot(snapshot.guided),
  }

  if (mergedSnapshot.subjectMode === 'lifestyle') {
    return mergedSnapshot
  }

  return {
    ...mergedSnapshot,
    characterAgeGroup: 'any',
    characterGender: 'any',
    figureArtDirection: 'none',
  }
}

function createResultForVariant(
  variant: GenerationVariantRecord,
  outputMap: Map<string, SavedOutputRecord>,
  workspace: GenerationRunRecord['workspace'],
  model: string,
) {
  if (!variant.resultAssetId) {
    return null
  }

  const output = outputMap.get(variant.resultAssetId)

  if (!output) {
    return null
  }

  return {
    model,
    taskId: variant.taskId ?? output.id,
    thumbnailUrl:
      workspace === 'video' ? `/api/media/${output.id}` : undefined,
    type: workspace === 'video' ? ('video' as const) : ('image' as const),
    url: `/api/media/${output.id}`,
  }
}

function getDefaultSelectedVariantId(
  variants: GenerationRun['variants'],
) {
  return (
    variants.find((variant) => variant.status === 'success' && variant.result)?.variantId ??
    null
  )
}

export function createGenerationRunState(
  run: GenerationRunRecord | null,
  outputs: SavedOutputRecord[],
): GenerationRun {
  if (!run) {
    return {
      completedAt: null,
      createdAt: null,
      error: null,
      model: null,
      provider: null,
      runId: null,
      selectedVariantId: null,
      startedAt: null,
      status: 'idle',
      variants: [],
      workspace: null,
    }
  }

  const outputMap = new Map(outputs.map((output) => [output.id, output]))
  const variants = run.variants.map((variant) => ({
    completedAt: variant.completedAt,
    createdAt: variant.createdAt,
    error: variant.error,
    index: variant.variantIndex,
    profile: variant.profile,
    prompt: variant.prompt,
    result: createResultForVariant(variant, outputMap, run.workspace, run.model),
    status: variant.status,
    taskId: variant.taskId,
    variantId: variant.id,
  }))

  return {
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    error:
      run.status === 'error'
        ? run.variants.find((variant) => variant.error)?.error ?? null
        : null,
    model: run.model,
    provider: run.provider,
    runId: run.id,
    selectedVariantId: getDefaultSelectedVariantId(variants),
    startedAt: Date.parse(run.createdAt),
    status: run.status,
    variants,
    workspace: run.workspace,
  }
}
