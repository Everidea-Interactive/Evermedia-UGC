import { normalizeKieAnalysisModel } from '@/lib/generation/guided'
import type {
  CarouselBaseTemplateMode,
  CarouselDraft,
  CarouselPanelDraft,
  CreativeBrief,
  CreativePlan,
  GenerationRun,
  GuidedAnalysisShot,
  StoryboardShot,
} from '@/lib/generation/types'
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
  videoAudio: 'no-audio',
  videoDuration: 'base',
  videoModel: 'veo-3.1',
}

const defaultCarouselDraft: CarouselDraft = {
  baseTemplateMode: 'manual',
  baseTemplatePrompt: '',
  baseTemplateAsset: null,
  panels: [
    {
      id: 'default-carousel-panel',
      order: 1,
      templateMode: 'inherit',
      templatePrompt: '',
      imageMode: 'manual',
      imagePrompt: '',
      imageAsset: null,
      textMode: 'manual',
      textPrompt: '',
      textValue: '',
    },
  ],
}

function normalizeCarouselPanelDraft(value: unknown): CarouselPanelDraft | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const id = typeof candidate.id === 'string' ? candidate.id : ''

  if (!id) {
    return null
  }

  // Migration: read old styleMode -> templateMode, stylePrompt -> templatePrompt
  const templateMode = (candidate.templateMode === 'override' || candidate.styleMode === 'override')
    ? 'override' : 'inherit'
  const templatePrompt = typeof candidate.templatePrompt === 'string'
    ? candidate.templatePrompt
    : typeof candidate.stylePrompt === 'string'
      ? candidate.stylePrompt
      : ''

  return {
    id,
    order: typeof candidate.order === 'number' ? Math.round(candidate.order) : 0,
    templateMode,
    templatePrompt,
    imageMode: candidate.imageMode === 'ai' ? 'ai' : 'manual',
    imagePrompt: typeof candidate.imagePrompt === 'string' ? candidate.imagePrompt : '',
    imageAsset: null,
    textMode: candidate.textMode === 'ai' ? 'ai' : 'manual',
    textPrompt: typeof candidate.textPrompt === 'string' ? candidate.textPrompt : '',
    textValue: typeof candidate.textValue === 'string' ? candidate.textValue : '',
  }
}

function normalizeCarouselDraft(value: unknown): CarouselDraft {
  if (!value || typeof value !== 'object') {
    return defaultCarouselDraft
  }

  const record = value as Record<string, unknown>
  const panels = Array.isArray(record.panels)
    ? record.panels.flatMap((panel) => {
        const normalized = normalizeCarouselPanelDraft(panel)
        return normalized ? [normalized] : []
      })
    : []

  const baseTemplateMode: CarouselBaseTemplateMode =
    record.baseTemplateMode === 'manual' ? 'manual' : 'ai'
  const baseTemplatePrompt =
    typeof record.baseTemplatePrompt === 'string'
      ? record.baseTemplatePrompt
      : typeof record.globalPanelStyle === 'string'
        ? record.globalPanelStyle        // legacy migration
        : ''
  const baseTemplateAsset = null           // never persisted with file data

  return {
    baseTemplateMode,
    baseTemplatePrompt,
    baseTemplateAsset,
    panels: panels.length > 0 ? panels : defaultCarouselDraft.panels,
  }
}

function normalizeCreativeBrief(value: unknown): CreativeBrief | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const audienceOptions = new Set([
    'broad',
    'gen-z',
    'young-professionals',
    'beauty-shoppers',
    'parents',
    'fitness-shoppers',
  ])
  const goalOptions = new Set(['awareness', 'consideration', 'conversion'])
  const platformOptions = new Set([
    'tiktok',
    'instagram-reels',
    'youtube-shorts',
    'meta-ads',
    'shopee',
    'tokopedia',
  ])
  const audience = audienceOptions.has(String(record.audience))
    ? (record.audience as CreativeBrief['audience'])
    : 'broad'
  const goal = goalOptions.has(String(record.goal))
    ? (record.goal as CreativeBrief['goal'])
    : 'conversion'
  const platform = platformOptions.has(String(record.platform))
    ? (record.platform as CreativeBrief['platform'])
    : 'tiktok'

  return {
    audience,
    goal,
    platform,
    productHighlights:
      typeof record.productHighlights === 'string' ? record.productHighlights : '',
    tone: typeof record.tone === 'string' ? record.tone : '',
  }
}

function normalizeStoryboardShot(value: unknown): StoryboardShot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
  const slug = typeof candidate.slug === 'string' ? candidate.slug.trim() : ''
  const prompt =
    typeof candidate.prompt === 'string' ? candidate.prompt.trim() : ''
  const subjectMode =
    candidate.subjectMode === 'lifestyle' || candidate.subjectMode === 'product-only'
      ? candidate.subjectMode
      : null
  const shotEnvironment =
    candidate.shotEnvironment === 'indoor' || candidate.shotEnvironment === 'outdoor'
      ? candidate.shotEnvironment
      : null

  if (!title || !slug || !prompt || !subjectMode || !shotEnvironment) {
    return null
  }

  return {
    ctaText: typeof candidate.ctaText === 'string' ? candidate.ctaText : '',
    durationSeconds:
      typeof candidate.durationSeconds === 'number' && candidate.durationSeconds > 0
        ? Math.round(candidate.durationSeconds)
        : 4,
    environmentPrompt:
      typeof candidate.environmentPrompt === 'string'
        ? candidate.environmentPrompt
        : '',
    objective: typeof candidate.objective === 'string' ? candidate.objective : '',
    prompt,
    renderPrompt:
      typeof candidate.renderPrompt === 'string' ? candidate.renderPrompt : prompt,
    shotEnvironment,
    slug,
    soundPrompt: typeof candidate.soundPrompt === 'string' ? candidate.soundPrompt : '',
    subjectMode,
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    title,
    visualPrompt:
      typeof candidate.visualPrompt === 'string' ? candidate.visualPrompt : '',
    voiceoverLine:
      typeof candidate.voiceoverLine === 'string' ? candidate.voiceoverLine : '',
  }
}

function normalizeCreativePlan(value: unknown): CreativePlan | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const storyboard = Array.isArray(record.storyboard)
    ? record.storyboard.flatMap((shot) => {
        const normalizedShot = normalizeStoryboardShot(shot)

        return normalizedShot ? [normalizedShot] : []
      })
    : []

  if (storyboard.length === 0) {
    return null
  }

  return {
    ctaOptions: Array.isArray(record.ctaOptions)
      ? record.ctaOptions.flatMap((option) => {
          if (!option || typeof option !== 'object') {
            return []
          }

          const candidate = option as Record<string, unknown>
          const id = typeof candidate.id === 'string' ? candidate.id : ''
          const label = typeof candidate.label === 'string' ? candidate.label : ''
          const placement =
            candidate.placement === 'closing-shot' ||
            candidate.placement === 'caption' ||
            candidate.placement === 'voiceover'
              ? candidate.placement
              : 'closing-shot'

          if (!id || !label) {
            return []
          }

          return [
            {
              id,
              label,
              placement,
              rationale:
                typeof candidate.rationale === 'string' ? candidate.rationale : '',
            },
          ]
        })
      : [],
    environmentDirectionSummary:
      typeof record.environmentDirectionSummary === 'string'
        ? record.environmentDirectionSummary
        : '',
    messageAngle: typeof record.messageAngle === 'string' ? record.messageAngle : '',
    selectedCtaId:
      typeof record.selectedCtaId === 'string' ? record.selectedCtaId : null,
    soundDirectionSummary:
      typeof record.soundDirectionSummary === 'string'
        ? record.soundDirectionSummary
        : '',
    storyboard,
    visualDirectionSummary:
      typeof record.visualDirectionSummary === 'string'
        ? record.visualDirectionSummary
        : '',
    voiceoverScript:
      typeof record.voiceoverScript === 'string' ? record.voiceoverScript : '',
  }
}

function readSnapshotEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
) {
  return typeof value === 'string' && allowed.includes(value as T)
    ? (value as T)
    : fallback
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
    creativeBrief: normalizeCreativeBrief(record.creativeBrief),
    creativePlan: normalizeCreativePlan(record.creativePlan),
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
    activeTab:
      snapshot.activeTab === 'video' || snapshot.activeTab === 'carousel'
        ? snapshot.activeTab
        : 'image',
    experience:
      snapshot.experience === 'guided' ||
      snapshot.experience === 'ideation'
        ? snapshot.experience
        : 'manual',
    imageModel: readSnapshotEnum(
      snapshot.imageModel,
      ['nano-banana'] as const,
      defaultProjectConfigSnapshot.imageModel,
    ),
    videoModel: readSnapshotEnum(
      snapshot.videoModel,
      ['veo-3.1', 'seedance-1.5-pro', 'seedance-2'] as const,
      defaultProjectConfigSnapshot.videoModel,
    ),
    guided: normalizeGuidedSnapshot(snapshot.guided),
    carouselDraft: normalizeCarouselDraft(snapshot.carouselDraft),
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
    label: output.label,
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
      experience: 'manual',
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
    experience: run.configSnapshot.experience,
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
