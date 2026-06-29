import 'server-only'

import {
  buildCarouselBatchPrompt,
  buildCarouselVariants,
  collectCarouselBatchReferences,
} from '@/lib/generation/carousel'
import {
  buildVariantPromptSet,
  compileGenerationPrompt,
  chooseEndFrameReference,
  chooseFirstFrameReference,
  choosePrimaryReference,
} from '@/lib/generation/prompt'
import {
  normalizeGuidedAnalysisPlan,
  normalizeKieAnalysisModel,
} from '@/lib/generation/guided'
import {
  getImageUploadSupportProfile,
  isFileSupportedByImageProfile,
  isConvertibleUploadImage,
} from '@/lib/generation/image-upload-support'
import {
  getMaxVideoReferenceCount,
  getGrokDuration,
  getGrokResolution,
  getKling3Duration,
  getNanoBananaResolution,
  getSeedance2MiniDuration,
  getSeedance2MiniResolution,
  getSeedance2Duration,
  getSeedanceDuration,
  getVideoResolution,
  supportsVideoFirstLastFramePair,
} from '@/lib/generation/model-mapping'
import { normalizeImageFileForProfile } from '@/lib/generation/upload-normalization'
import { wrapPromptForImageGrid } from '@/lib/media/image-grid'
import type {
  AssetSlot,
  CarouselBaseTemplateMode,
  CarouselDraft,
  CarouselPanelDraft,
  CreativeBrief,
  CreativePlan,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  ContentConcept,
  CreativeStyle,
  FigureArtDirection,
  GenerationExperience,
  GenerationProvider,
  GenerationResult,
  GuidedAnalysisShot,
  KieStatusResponse,
  KieStatusSource,
  GenerationVariant,
  GenerationVariantIndex,
  ImageModelOption,
  KieAnalysisModel,
  NamedAssetKey,
  MotionControlResolution,
  OrientationPreference,
  OutputQuality,
  ProductCategory,
  RunSubmissionResponse,
  ShotEnvironment,
  SubjectMode,
  SubmittedAssetDescriptor,
  TaskPollResponse,
  UploadedAssetDescriptor,
  VideoDuration,
  VideoAudio,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'

export const KIE_API_BASE_URL = 'https://api.kie.ai'
const KIE_FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload'
const KIE_FILE_BASE64_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-base64-upload'
const KIE_COMMON_DOWNLOAD_URL_ENDPOINT = `${KIE_API_BASE_URL}/api/v1/common/download-url`
export const KIE_REQUEST_TIMEOUT_MS = 60_000
const VEO_DEFAULT_MODEL = 'veo3_fast'
const NANO_BANANA_REFERENCE_LIMIT = 14
const namedAssetKeys = ['face1', 'face2', 'clothing', 'location', 'brandLogo', 'firstFrame', 'endFrame'] as const
const kieCreditSources: Array<{
  endpoint: string
  source: KieStatusSource
}> = [
  {
    endpoint: `${KIE_API_BASE_URL}/api/v1/chat/credit`,
    source: 'chat-credit',
  },
  {
    endpoint: `${KIE_API_BASE_URL}/api/v1/user/credits`,
    source: 'user-credits',
  },
]

export type ParsedGenerationRequest = {
  activeModel: ImageModelOption | VideoModelOption
  assetDescriptors: Array<SubmittedAssetDescriptor & { file: File }>
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  carouselDraft: CarouselDraft | null
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  experience: GenerationExperience
  figureArtDirection: FigureArtDirection
  guided: {
    analysisModel: KieAnalysisModel
    creativeBrief: CreativeBrief | null
    creativePlan: CreativePlan | null
    contentConcept: ContentConcept
    productUrl: string
    shots: GuidedAnalysisShot[]
    summary: string
  } | null
  imageModel: ImageModelOption
  motionControl?: {
    additionalInstructions: string
    resolution: MotionControlResolution
  } | null
  motionControlDurationSeconds?: number | null
  motionControlResolution?: MotionControlResolution | null
  outputQuality: OutputQuality
  orientationPreference?: OrientationPreference
  productCategory: ProductCategory
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}

export type GenerationRequestErrorCode =
  | 'invalid_input'
  | 'server_config'
  | 'service_unavailable'

export class GenerationRequestError extends Error {
  code: GenerationRequestErrorCode
  status: number

  constructor(input: {
    code: GenerationRequestErrorCode
    message: string
    status: number
  }) {
    super(input.message)
    this.name = 'GenerationRequestError'
    this.code = input.code
    this.status = input.status
  }
}

function createServiceUnavailableError(message: string) {
  return new GenerationRequestError({
    code: 'service_unavailable',
    message,
    status: 503,
  })
}

type ResolvedAssetDescriptor = SubmittedAssetDescriptor & { file: File }

type PromptVariantDescriptor = {
  index: GenerationVariantIndex
  profile: string
  prompt: string
  subjectMode: SubjectMode
}

export function getKieApiKey() {
  const apiKey = process.env.KIE_API_KEY

  if (!apiKey) {
    throw new GenerationRequestError({
      code: 'server_config',
      message: 'KIE_API_KEY is not configured on the server.',
      status: 500,
    })
  }

  return apiKey
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: `Missing required form field: ${key}.`,
      status: 400,
    })
  }

  return value
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' && value.length > 0 ? value : null
}

function readOptionalEnum<T extends string>(
  formData: FormData,
  key: string,
  values: readonly T[],
) {
  const value = readOptionalString(formData, key)

  if (!value) {
    return null
  }

  if (!values.includes(value as T)) {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: `Invalid value for ${key}.`,
      status: 400,
    })
  }

  return value as T
}

function readEnum<T extends string>(
  formData: FormData,
  key: string,
  values: readonly T[],
): T {
  const value = readString(formData, key)

  if (!values.includes(value as T)) {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: `Invalid value for ${key}.`,
      status: 400,
    })
  }

  return value as T
}

function readOptionalPositiveNumber(formData: FormData, key: string) {
  const value = readOptionalString(formData, key)

  if (!value) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: `Invalid value for ${key}.`,
      status: 400,
    })
  }

  return parsed
}

function isMimeTypeOfKind(mimeType: string, kind: 'image' | 'video') {
  return mimeType.startsWith(`${kind}/`)
}

function assertUploadedFileKind(
  file: File,
  kind: 'image' | 'video',
  label: string,
) {
  if (kind === 'image' && isConvertibleUploadImage(file)) {
    return
  }

  if (isMimeTypeOfKind(file.type, kind)) {
    return
  }

  throw new GenerationRequestError({
    code: 'invalid_input',
    message:
      kind === 'image'
        ? `${label} must be an image file.`
        : `${label} must be a video file.`,
    status: 400,
  })
}

function getExpectedUploadKind(fieldName: string): 'image' | 'video' | null {
  if (fieldName === 'asset_motionControlReferenceImage') {
    return 'image'
  }

  if (fieldName === 'asset_motionControlMotionVideo') {
    return 'video'
  }

  if (
    fieldName.startsWith('asset_') ||
    fieldName.startsWith('product_') ||
    fieldName.startsWith('video_reference_') ||
    fieldName.startsWith('carousel_')
  ) {
    return 'image'
  }

  return null
}

function getGenerationImageUploadProfile(input: {
  fieldName: string
  imageModel: ImageModelOption
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}) {
  if (
    input.fieldName === 'asset_motionControlMotionVideo' ||
    input.fieldName.endsWith('MotionVideo')
  ) {
    return null
  }

  if (input.fieldName === 'asset_motionControlReferenceImage') {
    return getImageUploadSupportProfile('motion-control-image')
  }

  if (
    input.fieldName === 'carousel_base_template_image' ||
    input.fieldName.startsWith('carousel_panel_image_')
  ) {
    return getImageUploadSupportProfile('image-model', input.imageModel)
  }

  if (
    input.fieldName.startsWith('asset_') ||
    input.fieldName.startsWith('product_') ||
    input.fieldName.startsWith('video_reference_') ||
    input.fieldName.startsWith('carousel_')
  ) {
    if (input.workspace === 'video') {
      return getImageUploadSupportProfile('video-model-image', input.videoModel)
    }

    if (input.workspace === 'motion-control') {
      return getImageUploadSupportProfile('motion-control-image')
    }

    return getImageUploadSupportProfile('image-model', input.imageModel)
  }

  return null
}

async function normalizeGenerationImageUpload(input: {
  fieldName: string
  file: File
  imageModel: ImageModelOption
  label: string
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}) {
  const profile = getGenerationImageUploadProfile({
    fieldName: input.fieldName,
    imageModel: input.imageModel,
    videoModel: input.videoModel,
    workspace: input.workspace,
  })

  if (!profile) {
    return input.file
  }

  const normalizedFile = await normalizeImageFileForProfile(input.file, profile)

  if (isFileSupportedByImageProfile(normalizedFile, profile)) {
    return normalizedFile
  }

  throw new GenerationRequestError({
    code: 'invalid_input',
    message: `${input.label} must use a supported image format for this model. HEIC, HEIF, AVIF, BMP, TIFF, and WEBP are converted automatically when possible.`,
    status: 400,
  })
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function parseCarouselDraft(formData: FormData): CarouselDraft | null {
  const raw = readOptionalString(formData, 'carouselDraft')

  if (!raw) {
    return null
  }

  const parsed = safeJsonParse(raw)

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const record = parsed as Record<string, unknown>
  const panels = Array.isArray(record.panels)
    ? record.panels.flatMap((panel) => {
        const normalized = normalizePanelDraft(panel)
        return normalized ? [normalized] : []
      })
    : []

  const baseTemplateMode: CarouselBaseTemplateMode =
    record.baseTemplateMode === 'manual' ? 'manual' : 'ai'
  const baseTemplatePrompt =
    typeof record.baseTemplatePrompt === 'string'
      ? record.baseTemplatePrompt
      : typeof record.globalPanelStyle === 'string'
        ? record.globalPanelStyle
        : ''
  const baseTemplateAsset =
    baseTemplateMode === 'manual'
      ? createCarouselAssetSlot(
          formData.get('carousel_base_template_image'),
          'carousel-base-template',
          'Base template',
        )
      : null
  const panelsWithAssets = panels.map((panel) => ({
    ...panel,
    imageAsset:
      panel.imageMode === 'manual'
        ? createCarouselAssetSlot(
            formData.get(`carousel_panel_image_${panel.id}`),
            `carousel-panel-image-${panel.id}`,
            `Carousel panel ${panel.order} image`,
          )
        : null,
  }))

  return {
    baseTemplateMode,
    baseTemplatePrompt,
    baseTemplateAsset,
    panels: panelsWithAssets,
  }
}

function normalizePanelDraft(value: unknown): CarouselPanelDraft | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const id = typeof candidate.id === 'string' ? candidate.id : ''

  if (!id) {
    return null
  }

  return {
    id,
    order: typeof candidate.order === 'number' ? Math.round(candidate.order) : 0,
    templateMode: (candidate.templateMode === 'override' || candidate.styleMode === 'override')
      ? 'override' : 'inherit',
    templatePrompt: typeof candidate.templatePrompt === 'string'
      ? candidate.templatePrompt
      : typeof candidate.stylePrompt === 'string'
        ? candidate.stylePrompt
        : '',
    imageMode: candidate.imageMode === 'ai' ? 'ai' : 'manual',
    imagePrompt: typeof candidate.imagePrompt === 'string' ? candidate.imagePrompt : '',
    imageAsset: null,
    textMode: candidate.textMode === 'ai' ? 'ai' : 'manual',
    textPrompt: typeof candidate.textPrompt === 'string' ? candidate.textPrompt : '',
    textValue: typeof candidate.textValue === 'string' ? candidate.textValue : '',
  }
}

function createCarouselAssetSlot(
  value: FormDataEntryValue | null,
  id: string,
  label: string,
): AssetSlot | null {
  if (!(value instanceof File) || value.size === 0) {
    return null
  }

  return {
    error: null,
    file: value,
    id,
    label,
    mimeType: value.type || null,
    previewUrl: null,
    size: value.size,
    uploadStatus: 'staged',
  }
}

function normalizeCreativeBrief(value: unknown): CreativeBrief | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>

  if (
    typeof record.audience !== 'string' ||
    typeof record.goal !== 'string' ||
    typeof record.platform !== 'string'
  ) {
    return null
  }

  return {
    audience: record.audience as CreativeBrief['audience'],
    goal: record.goal as CreativeBrief['goal'],
    platform: record.platform as CreativeBrief['platform'],
    productHighlights:
      typeof record.productHighlights === 'string' ? record.productHighlights : '',
    tone: typeof record.tone === 'string' ? record.tone : '',
  }
}

function normalizeCreativePlan(value: unknown): CreativePlan | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>

  if (!Array.isArray(record.storyboard)) {
    return null
  }

  return {
    ctaOptions: Array.isArray(record.ctaOptions)
      ? record.ctaOptions.filter(
          (option): option is CreativePlan['ctaOptions'][number] =>
            Boolean(option) && typeof option === 'object',
        )
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
    storyboard: record.storyboard.filter(
      (shot): shot is CreativePlan['storyboard'][number] =>
        Boolean(shot) && typeof shot === 'object',
    ),
    visualDirectionSummary:
      typeof record.visualDirectionSummary === 'string'
        ? record.visualDirectionSummary
        : '',
    voiceoverScript:
      typeof record.voiceoverScript === 'string' ? record.voiceoverScript : '',
  }
}

function createKieStatusError(
  error: string,
  fetchedAt: string | null = new Date().toISOString(),
): KieStatusResponse {
  return {
    connected: false,
    credits: null,
    error,
    fetchedAt,
    source: null,
  }
}

function extractCredits(payload: unknown): number | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return payload
  }

  if (typeof payload === 'string') {
    const numericValue = Number.parseFloat(payload)

    return Number.isFinite(numericValue) ? numericValue : null
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>

  for (const candidate of [
    record.data,
    record.credit,
    record.credits,
    record.balance,
  ]) {
    const value = extractCredits(candidate)

    if (value !== null) {
      return value
    }
  }

  return null
}

function isRemoteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function summarizePayload(payload: unknown): string {
  try {
    const text = JSON.stringify(payload)
    return text.length > 500 ? `${text.slice(0, 500)}...` : text
  } catch {
    return String(payload)
  }
}

function extractRemoteUrl(payload: unknown): string | null {
  const visited = new WeakSet<object>()

  function visit(node: unknown): string | null {
    if (typeof node === 'string') {
      const candidate = node.trim()
      return isRemoteHttpUrl(candidate) ? candidate : null
    }

    if (!node || typeof node !== 'object') {
      return null
    }

    if (visited.has(node)) {
      return null
    }

    visited.add(node)

    if (Array.isArray(node)) {
      for (const item of node) {
        const nestedUrl = visit(item)

        if (nestedUrl) {
          return nestedUrl
        }
      }

      return null
    }

    const record = node as Record<string, unknown>
    const directCandidates = [
      record.downloadUrl,
      record.downloadURL,
      record.download_url,
      record.fileUrl,
      record.fileURL,
      record.file_url,
      record.url,
      record.remoteUrl,
      record.remote_url,
      record.link,
      record.href,
      record.src,
    ]

    for (const candidate of directCandidates) {
      const directUrl = visit(candidate)

      if (directUrl) {
        return directUrl
      }
    }

    for (const value of Object.values(record)) {
      const nestedUrl = visit(value)

      if (nestedUrl) {
        return nestedUrl
      }
    }

    return null
  }

  return visit(payload)
}

function extractResultUrls(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const record = payload as Record<string, unknown>
  const candidates = [
    record.resultUrls,
    record.urls,
    record.outputUrls,
    record.originUrls,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const urls = candidate.filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      )

      if (urls.length > 0) {
        return urls
      }
    }
  }

  for (const nestedKey of ['response', 'data', 'result']) {
    const nested = extractResultUrls(record[nestedKey])

    if (nested.length > 0) {
      return nested
    }
  }

  return []
}

export async function readKieError(response: Response) {
  const text = await response.text()
  const payload = safeJsonParse(text)
  const message =
    typeof payload === 'object' &&
    payload &&
    'msg' in payload &&
    typeof payload.msg === 'string'
      ? payload.msg
      : typeof payload === 'object' &&
          payload &&
          'message' in payload &&
          typeof payload.message === 'string'
        ? payload.message
        : text

  return `${response.status} ${response.statusText}: ${message || 'Unknown KIE error'}`
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  )
}

export async function fetchKieWithTimeout(
  input: string,
  init: RequestInit,
  action: string,
) {
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(KIE_REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw createServiceUnavailableError(
        `${action} timed out after ${Math.round(KIE_REQUEST_TIMEOUT_MS / 1000)} seconds.`,
      )
    }

    throw error
  }
}

async function fetchKieCredits(
  apiKey: string,
  sourceConfig: (typeof kieCreditSources)[number],
): Promise<KieStatusResponse> {
  const response = await fetch(sourceConfig.endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw createServiceUnavailableError(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const credits = extractCredits(payload)

  if (credits === null) {
    throw createServiceUnavailableError(
      'KIE credit response did not include a usable balance.',
    )
  }

  return {
    connected: true,
    credits,
    error: null,
    fetchedAt: new Date().toISOString(),
    source: sourceConfig.source,
  }
}

function getImageAspectRatio(subjectMode: SubjectMode) {
  return subjectMode === 'product-only' ? '1:1' : '2:3'
}

function getVideoAspectRatio(
  subjectMode: SubjectMode,
  orientationPreference: OrientationPreference,
) {
  if (orientationPreference === 'portrait') {
    return '9:16'
  }

  if (orientationPreference === 'landscape') {
    return '16:9'
  }

  if (orientationPreference === 'square') {
    return '1:1'
  }

  return subjectMode === 'product-only' ? '16:9' : '9:16'
}

function normalizeVideoAudioForModel(
  videoModel: VideoModelOption,
  videoAudio: VideoAudio,
): VideoAudio {
  if (
    videoModel === 'seedance-1.5-pro' ||
    videoModel === 'seedance-2-mini' ||
    videoModel === 'seedance-2'
  ) {
    return videoAudio
  }

  return 'with-audio'
}

export function createRunId() {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function getKieStatus(): Promise<KieStatusResponse> {
  let apiKey: string

  try {
    apiKey = getKieApiKey()
  } catch (error) {
    return createKieStatusError(
      error instanceof Error
        ? error.message
        : 'KIE API key is not configured on the server.',
      null,
    )
  }

  let lastError = 'Unable to read KIE credits.'

  for (const sourceConfig of kieCreditSources) {
    try {
      return await fetchKieCredits(apiKey, sourceConfig)
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : 'Unable to read KIE credits.'
    }
  }

  return createKieStatusError(lastError)
}

function createPromptAssets(
  assetDescriptors: ParsedGenerationRequest['assetDescriptors'],
): UploadedAssetDescriptor[] {
  return assetDescriptors.map((assetDescriptor) => {
    const { file, ...descriptor } = assetDescriptor
    void file

    return {
      ...descriptor,
      remoteUrl: '',
    }
  })
}

export function buildPromptSnapshot(input: ParsedGenerationRequest) {
  if (input.experience === 'guided' && input.guided) {
    return input.guided.summary
  }

  if (input.workspace === 'carousel') {
    const draft = input.carouselDraft

    if (!draft || draft.panels.length === 0) {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Carousel draft is empty or missing panels.',
        status: 400,
      })
    }

    const orderedPanels = [...draft.panels].sort((a, b) => a.order - b.order)
    const panelBatches = Array.from(
      { length: Math.ceil(orderedPanels.length / 4) },
      (_, index) => orderedPanels.slice(index * 4, index * 4 + 4),
    )

    return panelBatches
      .map((panels) => buildCarouselBatchPrompt(panels, draft))
      .join('\n\n---\n\n')
  }

  return compileGenerationPrompt({
    assets: createPromptAssets(input.assetDescriptors),
    cameraMovement: input.workspace === 'video' ? input.cameraMovement : null,
    characterAgeGroup: input.characterAgeGroup,
    characterGender: input.characterGender,
    creativeStyle: input.creativeStyle,
    figureArtDirection: input.figureArtDirection,
    motionControlAdditionalInstructions:
      input.workspace === 'motion-control'
        ? input.motionControl?.additionalInstructions ?? ''
        : '',
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    shotEnvironment: input.shotEnvironment,
    subjectMode: input.subjectMode,
    textPrompt: input.textPrompt,
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
    workspace: input.workspace,
  })
}

function isEndFrameAsset(asset: UploadedAssetDescriptor) {
  return asset.kind === 'named' && asset.key === 'endFrame'
}

function isNamedAsset(
  asset: UploadedAssetDescriptor,
  key: NamedAssetKey,
): boolean {
  return asset.kind === 'named' && asset.key === key
}

function collectImageReferenceAssets(
  subjectMode: SubjectMode,
  assets: UploadedAssetDescriptor[],
) {
  const orderedAssets = assets
    .filter((asset) => !isEndFrameAsset(asset))
    .filter((asset) => !(asset.kind === 'named' && asset.key === 'firstFrame'))
    .filter((asset) => asset.remoteUrl.length > 0)
    .slice()
    .sort((left, right) => left.order - right.order)
  const primaryReference = choosePrimaryReference(subjectMode, orderedAssets)

  if (!primaryReference) {
    return orderedAssets
  }

  return [
    primaryReference,
    ...orderedAssets.filter(
      (asset) => asset.fieldName !== primaryReference.fieldName,
    ),
  ]
}

function collectVideoReferenceUrls(
  subjectMode: SubjectMode,
  assets: UploadedAssetDescriptor[],
  options?: {
    includeEndFrame?: boolean
    max?: number
  },
) {
  const urls = collectImageReferenceAssets(subjectMode, assets).map(
    (asset) => asset.remoteUrl,
  )
  const endFrame = chooseEndFrameReference(assets)

  if (options?.includeEndFrame && endFrame?.remoteUrl) {
    urls.push(endFrame.remoteUrl)
  }

  const dedupedUrls = urls.filter(
    (url, index) => url.length > 0 && urls.indexOf(url) === index,
  )

  return typeof options?.max === 'number'
    ? dedupedUrls.slice(0, options.max)
    : dedupedUrls
}

function collectNanoBananaReferenceAssets(
  subjectMode: SubjectMode,
  assets: UploadedAssetDescriptor[],
) {
  const orderedAssets = collectImageReferenceAssets(subjectMode, assets)
  const selectedAssets: UploadedAssetDescriptor[] = []
  const selectedFields = new Set<string>()

  const addAsset = (asset: UploadedAssetDescriptor | null | undefined) => {
    if (!asset || selectedFields.has(asset.fieldName)) {
      return
    }

    selectedAssets.push(asset)
    selectedFields.add(asset.fieldName)
  }

  const firstProduct =
    orderedAssets.find((asset) => asset.kind === 'product') ?? null
  const face1 =
    orderedAssets.find((asset) => isNamedAsset(asset, 'face1')) ?? null
  const face2 =
    orderedAssets.find((asset) => isNamedAsset(asset, 'face2')) ?? null
  const clothing =
    orderedAssets.find((asset) => isNamedAsset(asset, 'clothing')) ?? null
  const location =
    orderedAssets.find((asset) => isNamedAsset(asset, 'location')) ?? null

  if (subjectMode === 'lifestyle') {
    addAsset(face1 ?? face2)
    addAsset(firstProduct)
    addAsset(clothing)
    addAsset(location)

    if (face1) {
      addAsset(face2)
    }
  } else {
    orderedAssets
      .filter((asset) => asset.kind === 'product')
      .forEach(addAsset)
    addAsset(location)
    addAsset(clothing)
    addAsset(face1 ?? face2)
  }

  orderedAssets.forEach(addAsset)

  return selectedAssets.slice(0, NANO_BANANA_REFERENCE_LIMIT)
}

function describeNanoBananaReference(
  asset: UploadedAssetDescriptor,
  options: {
    isPrimaryProduct: boolean
    isIdentityAnchor: boolean
    subjectMode: SubjectMode
  },
) {
  if (asset.kind === 'product') {
    return options.isPrimaryProduct
      ? 'This is the primary product anchor. Preserve the exact same product design, packaging, branding, colors, materials, and proportions.'
      : 'Use it only as alternate angle or composition guidance for the same exact product. Do not introduce a different product, packaging variant, colorway, or material finish.'
  }

  switch (asset.key) {
    case 'face1':
      return options.subjectMode === 'lifestyle'
        ? 'This is the identity anchor. Preserve the same person and facial likeness.'
        : 'Use it as a supporting human reference only if a person is shown.'
    case 'face2':
      return options.subjectMode === 'lifestyle' && options.isIdentityAnchor
        ? 'This is the identity anchor. Preserve the same person and facial likeness.'
        : options.subjectMode === 'lifestyle'
          ? 'Use it only as supplementary angle or expression guidance for the same person. Do not introduce a second identity.'
        : 'Use it only as a supporting human reference if needed.'
    case 'clothing':
      return 'Use it only for wardrobe and styling cues. Ignore any face in this image.'
    case 'location':
      return 'Use it only for environment and background cues. Ignore any people in this image.'
    default:
      return 'Use it as supporting visual guidance only.'
  }
}

function buildNanoBananaPrompt(input: {
  prompt: string
  referenceAssets: UploadedAssetDescriptor[]
  subjectMode: SubjectMode
}) {
  const trimmedPrompt = input.prompt.trim()

  if (input.referenceAssets.length === 0) {
    return trimmedPrompt
  }
  const identityReference = choosePrimaryReference(
    input.subjectMode,
    input.referenceAssets,
  )
  const primaryProductReference =
    input.referenceAssets.find((asset) => asset.kind === 'product') ?? null

  const referenceInstructions = input.referenceAssets.map((asset, index) => {
    const imageIndex = index + 1

    return `Image ${imageIndex} (${asset.label}) ${describeNanoBananaReference(asset, {
      isPrimaryProduct: asset.fieldName === primaryProductReference?.fieldName,
      isIdentityAnchor: asset.fieldName === identityReference?.fieldName,
      subjectMode: input.subjectMode,
    })}`
  })

  const safeguard =
    input.subjectMode === 'lifestyle'
      ? 'Do not blend faces across references, and do not let clothing or location references override the identity anchor.'
      : 'Do not let supporting references override the core product design.'

  return [
    'Treat the uploaded references as ordered images in the exact order provided.',
    ...referenceInstructions,
    safeguard,
    trimmedPrompt,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildMarketImagePayload(input: {
  assets: UploadedAssetDescriptor[]
  imageGrid?: boolean
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  prompt: string
  subjectMode: SubjectMode
}) {
  const referenceAssets =
    input.imageModel === 'nano-banana'
      ? collectNanoBananaReferenceAssets(input.subjectMode, input.assets)
      : collectImageReferenceAssets(input.subjectMode, input.assets)
  const aspectRatio = input.imageGrid ? '9:16' : getImageAspectRatio(input.subjectMode)
  const prompt = input.imageGrid
    ? wrapPromptForImageGrid(input.prompt)
    : input.prompt

  if (input.imageModel === 'nano-banana') {
    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'nano-banana-2',
      provider: 'market' as const,
      requestBody: {
        model: 'nano-banana-2',
        input: {
          prompt: buildNanoBananaPrompt({
            prompt,
            referenceAssets,
            subjectMode: input.subjectMode,
          }),
          image_input: referenceAssets.map((asset) => asset.remoteUrl),
          aspect_ratio: aspectRatio,
          resolution: getNanoBananaResolution(input.outputQuality),
          output_format: 'png',
          google_search: false,
        },
      },
    }
  }
  throw new GenerationRequestError({
    code: 'invalid_input',
    message: `Unsupported image model: ${input.imageModel}`,
    status: 400,
  })
}

function buildVideoPayload(input: {
  assets: UploadedAssetDescriptor[]
  outputQuality: OutputQuality
  orientationPreference: OrientationPreference
  prompt: string
  subjectMode: SubjectMode
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}) {
  const primaryReference = choosePrimaryReference(input.subjectMode, input.assets)
  const firstFrameReference = chooseFirstFrameReference(input.assets)
  const endFrameReference = chooseEndFrameReference(input.assets)
  const aspectRatio = getVideoAspectRatio(
    input.subjectMode,
    input.orientationPreference,
  )
  const videoResolution = getVideoResolution(input.outputQuality)
  const maxReferenceCount = getMaxVideoReferenceCount(input.videoModel)
  const orderedStartReferenceUrls = collectVideoReferenceUrls(
    input.subjectMode,
    input.assets,
    {
      max: maxReferenceCount,
    },
  )

  if (input.videoModel === 'grok-imagine-video-1.5') {
    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'grok-imagine-video-1-5-preview',
      provider: 'market' as const,
      requestBody: {
        model: 'grok-imagine-video-1-5-preview',
        input: {
          prompt: input.prompt,
          ...(orderedStartReferenceUrls.length > 0
            ? { image_urls: orderedStartReferenceUrls }
            : null),
          aspect_ratio: aspectRatio,
          resolution: getGrokResolution(input.outputQuality),
          duration: Number.parseInt(getGrokDuration(input.videoDuration), 10),
          nsfw_checker: false,
        },
      },
    }
  }

  if (input.videoModel === 'veo-3.1') {
    if (aspectRatio === '1:1') {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Veo 3.1 supports portrait 9:16 or landscape 16:9 output, not square 1:1.',
        status: 400,
      })
    }

    const imageUrls =
      endFrameReference?.remoteUrl
        ? [...orderedStartReferenceUrls.slice(0, 2), endFrameReference.remoteUrl]
        : orderedStartReferenceUrls
    const hasExplicitEndFramePair =
      Boolean(primaryReference?.remoteUrl) &&
      Boolean(endFrameReference?.remoteUrl) &&
      imageUrls.length === 2 &&
      imageUrls[0] === primaryReference?.remoteUrl &&
      imageUrls[1] === endFrameReference?.remoteUrl

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/veo/generate`,
      modelName: VEO_DEFAULT_MODEL,
      provider: 'veo' as const,
      requestBody: {
        prompt: input.prompt,
        imageUrls,
        model: VEO_DEFAULT_MODEL,
        aspect_ratio: aspectRatio,
        enableFallback: false,
        enableTranslation: false,
        generationType:
          hasExplicitEndFramePair
            ? 'FIRST_AND_LAST_FRAMES_2_VIDEO'
            : imageUrls.length >= 1
              ? 'REFERENCE_2_VIDEO'
              : 'TEXT_2_VIDEO',
      },
    }
  }

  if (input.videoModel === 'seedance-1.5-pro') {
    const inputUrls = orderedStartReferenceUrls

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'bytedance/seedance-1.5-pro',
      provider: 'market' as const,
      requestBody: {
        model: 'bytedance/seedance-1.5-pro',
        input: {
          prompt: input.prompt,
          ...(inputUrls.length > 0 ? { input_urls: inputUrls } : null),
          aspect_ratio: aspectRatio,
          resolution: videoResolution,
          duration: getSeedanceDuration(input.videoDuration),
          fixed_lens: false,
          generate_audio: input.videoAudio === 'with-audio',
          nsfw_checker: false,
        },
      },
    }
  }

  if (input.videoModel === 'seedance-2') {
    const hasFirstFrame =
      supportsVideoFirstLastFramePair(input.videoModel) &&
      Boolean(firstFrameReference?.remoteUrl)
    const hasLastFrame = hasFirstFrame && Boolean(endFrameReference?.remoteUrl)

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'bytedance/seedance-2',
      provider: 'market' as const,
      requestBody: {
        model: 'bytedance/seedance-2',
        input: {
          prompt: input.prompt,
          ...(hasFirstFrame
            ? { first_frame_url: firstFrameReference?.remoteUrl }
            : null),
          ...(hasLastFrame
            ? { last_frame_url: endFrameReference?.remoteUrl }
            : null),
          ...(orderedStartReferenceUrls.length > 0
            ? { reference_image_urls: orderedStartReferenceUrls }
            : null),
          aspect_ratio: aspectRatio,
          resolution: videoResolution,
          duration: getSeedance2Duration(input.videoDuration),
          generate_audio: input.videoAudio === 'with-audio',
          nsfw_checker: false,
        },
      },
    }
  }

  if (input.videoModel === 'seedance-2-mini') {
    const hasFirstFrame =
      supportsVideoFirstLastFramePair(input.videoModel) &&
      Boolean(firstFrameReference?.remoteUrl)
    const hasLastFrame = hasFirstFrame && Boolean(endFrameReference?.remoteUrl)
    const useFramePairMode = hasFirstFrame || hasLastFrame

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'bytedance/seedance-2-mini',
      provider: 'market' as const,
      requestBody: {
        model: 'bytedance/seedance-2-mini',
        input: {
          prompt: input.prompt,
          ...(hasFirstFrame
            ? { first_frame_url: firstFrameReference?.remoteUrl }
            : null),
          ...(hasLastFrame
            ? { last_frame_url: endFrameReference?.remoteUrl }
            : null),
          ...(!useFramePairMode && orderedStartReferenceUrls.length > 0
            ? { reference_image_urls: orderedStartReferenceUrls }
            : null),
          aspect_ratio: aspectRatio,
          resolution: getSeedance2MiniResolution(input.outputQuality),
          duration: Number.parseInt(getSeedance2MiniDuration(input.videoDuration), 10),
          generate_audio: input.videoAudio === 'with-audio',
          return_last_frame: false,
          nsfw_checker: false,
        },
      },
    }
  }

  if (input.videoModel === 'kling-3.0') {
    const hasFirstFrame = Boolean(firstFrameReference?.remoteUrl)
    const hasLastFrame = hasFirstFrame && Boolean(endFrameReference?.remoteUrl)

    const imageUrls: string[] = []
    if (hasFirstFrame) {
      imageUrls.push(firstFrameReference!.remoteUrl)
    }
    if (hasLastFrame) {
      imageUrls.push(endFrameReference!.remoteUrl)
    }

    const mode = videoResolution === '1080p' ? 'pro' : 'std'

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'kling-3.0/video',
      provider: 'market' as const,
      requestBody: {
        model: 'kling-3.0/video',
        input: {
          prompt: input.prompt,
          ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
          aspect_ratio: aspectRatio,
          sound: input.videoAudio === 'with-audio',
          duration: getKling3Duration(input.videoDuration),
          mode: mode,
          multi_shots: false,
        },
      },
    }
  }

  throw new GenerationRequestError({
    code: 'invalid_input',
    message: `Unsupported video model: ${input.videoModel}`,
    status: 400,
  })
}

export function buildMotionControlPayload(input: {
  motionVideoUrl: string
  prompt: string
  referenceImageUrl: string
  resolution: MotionControlResolution
}) {
  return {
    model: 'kling-3.0/motion-control',
    input: {
      character_orientation: 'video',
      input_urls: [input.referenceImageUrl],
      mode: input.resolution,
      prompt: input.prompt,
      video_urls: [input.motionVideoUrl],
    },
  }
}

export async function uploadFileToKie(
  apiKey: string,
  file: File,
  workspace: WorkspaceTab,
) {
  const formData = new FormData()

  formData.append('file', file, file.name)
  formData.append('uploadPath', `evermedia-ugc/${workspace}`)

  const response = await fetchKieWithTimeout(KIE_FILE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  }, 'KIE file upload')

  if (!response.ok) {
    throw createServiceUnavailableError(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const remoteUrl = extractRemoteUrl(payload)

  if (!remoteUrl) {
    throw createServiceUnavailableError(
      `KIE file upload did not return a usable remote URL. payload=${summarizePayload(payload)}`,
    )
  }

  return remoteUrl
}

export async function uploadImageFileToKieBase64(
  apiKey: string,
  file: File,
  uploadPath = 'evermedia-ugc/image',
) {
  const contentType = file.type || 'application/octet-stream'
  const bytes = Buffer.from(await file.arrayBuffer())
  const base64Data = `data:${contentType};base64,${bytes.toString('base64')}`

  const response = await fetchKieWithTimeout(
    KIE_FILE_BASE64_UPLOAD_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        uploadPath,
      }),
    },
    'KIE base64 file upload',
  )

  if (!response.ok) {
    throw createServiceUnavailableError(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const remoteUrl = (() => {
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const root = payload as Record<string, unknown>
    const data =
      root.data && typeof root.data === 'object'
        ? (root.data as Record<string, unknown>)
        : null

    // For multimodal model inputs, prefer canonical kie download by fileId.
    const fileId =
      typeof data?.fileId === 'string'
        ? data.fileId.trim()
        : typeof root.fileId === 'string'
          ? root.fileId.trim()
          : null

    if (fileId) {
      return `https://kieai.redpandaai.co/download/${fileId}`
    }

    // Then prefer stable fileUrl fields over tempfile download URLs.
    const preferredCandidates = [
      data?.fileUrl,
      data?.fileURL,
      data?.file_url,
      data?.url,
      data?.downloadUrl,
      data?.downloadURL,
      data?.download_url,
      root.fileUrl,
      root.fileURL,
      root.file_url,
      root.url,
      root.downloadUrl,
      root.downloadURL,
      root.download_url,
    ]

    for (const candidate of preferredCandidates) {
      if (typeof candidate === 'string' && isRemoteHttpUrl(candidate.trim())) {
        return candidate.trim()
      }
    }

    return extractRemoteUrl(payload)
  })()

  if (!remoteUrl) {
    throw createServiceUnavailableError(
      `KIE base64 upload did not return a usable remote URL. payload=${summarizePayload(payload)}`,
    )
  }

  if (remoteUrl.includes('tempfile.redpandaai.co')) {
    const normalizedUrl = await resolveKieDownloadUrl(apiKey, remoteUrl)
    return normalizedUrl ?? remoteUrl
  }

  return remoteUrl
}

async function resolveKieDownloadUrl(apiKey: string, url: string) {
  const response = await fetchKieWithTimeout(
    KIE_COMMON_DOWNLOAD_URL_ENDPOINT,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      cache: 'no-store',
    },
    'KIE download URL normalization',
  )

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as unknown

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  const data = record.data

  if (typeof data === 'string' && isRemoteHttpUrl(data.trim())) {
    return data.trim()
  }

  return null
}

export function parseGenerationFormData(formData: FormData): ParsedGenerationRequest {
  const experience =
    readOptionalEnum(formData, 'experience', ['manual', 'guided'] as const) ??
    'manual'
  const workspace = readEnum(formData, 'workspace', ['image', 'video', 'carousel', 'motion-control'] as const)
  const requestedBatchSize = Number.parseInt(readString(formData, 'batchSize'), 10)

  if (![1, 2, 3, 4].includes(requestedBatchSize)) {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: 'Batch size must be between 1 and 4.',
      status: 400,
    })
  }

  const batchSize = workspace === 'video' || workspace === 'motion-control' ? 1 : requestedBatchSize

  const imageModel =
    workspace === 'image'
      ? readEnum(formData, 'imageModel', ['nano-banana'] as const)
      : 'nano-banana'
  const videoModel =
    workspace === 'video'
      ? readEnum(formData, 'videoModel', [
          'veo-3.1',
          'grok-imagine-video-1.5',
          'seedance-1.5-pro',
          'seedance-2-mini',
          'seedance-2',
          'kling-3.0',
        ] as const)
      : workspace === 'motion-control'
        ? 'kling-3.0'
      : 'veo-3.1'
  const outputQuality = readEnum(
    formData,
    'outputQuality',
    ['720p', '1080p', '4k'] as const,
  )

  if ((workspace === 'video' || workspace === 'motion-control') && outputQuality === '4k') {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: 'Video output quality supports only 720p or 1080p.',
      status: 400,
    })
  }
  const motionControlResolution =
    workspace === 'motion-control'
      ? readEnum(formData, 'motionControlResolution', ['720p', '1080p'] as const)
      : null
  const motionControlDurationSeconds =
    workspace === 'motion-control'
      ? readOptionalPositiveNumber(formData, 'motionControlDurationSeconds')
      : null
  const motionControl =
    workspace === 'motion-control'
      ? {
          additionalInstructions:
            readOptionalString(formData, 'motionControlAdditionalInstructions') ?? '',
          resolution: motionControlResolution ?? '1080p',
        }
      : null
  const manifestValue =
    workspace === 'carousel'
      ? (readOptionalString(formData, 'assetManifest') ?? '[]')
      : readString(formData, 'assetManifest')
  const parsedManifest = safeJsonParse(manifestValue)

  if (!Array.isArray(parsedManifest)) {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: 'Asset manifest is malformed.',
      status: 400,
    })
  }

  const guided = (() => {
    if (experience !== 'guided') {
      return null
    }

    const guidedShotsValue = readString(formData, 'guidedShots')
    const guidedSummary = readString(formData, 'guidedSummary').trim()
    const guidedContentConcept = readEnum(
      formData,
      'guidedContentConcept',
      ['driven-ads', 'affiliate'] as const,
    )
    const analysisModel = normalizeKieAnalysisModel(
      readString(formData, 'analysisModel'),
    )

    if (!analysisModel) {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Unsupported guided analysis model.',
        status: 400,
      })
    }
    const productUrl = readOptionalString(formData, 'productUrl') ?? ''
    const creativeBrief = normalizeCreativeBrief(
      safeJsonParse(readOptionalString(formData, 'creativeBrief') ?? 'null'),
    )
    const creativePlan = normalizeCreativePlan(
      safeJsonParse(readOptionalString(formData, 'creativePlan') ?? 'null'),
    )
    const parsedGuidedShots = safeJsonParse(guidedShotsValue)
    const normalizedPlan = normalizeGuidedAnalysisPlan(
      {
        creativeStyle: readEnum(
          formData,
          'creativeStyle',
          [
            'ugc-lifestyle',
            'cinematic',
            'tv-commercial',
            'elite-product-commercial',
          ] as const,
        ),
        productCategory: readEnum(
          formData,
          'productCategory',
          [
            'food-drink',
            'jewelry',
            'cosmetics',
            'electronics',
            'clothing',
            'miscellaneous',
          ] as const,
        ),
        shots:
          workspace === 'video' && Array.isArray(parsedGuidedShots)
            ? parsedGuidedShots.slice(0, 1)
            : parsedGuidedShots,
        summary: guidedSummary,
      },
      { shotCount: batchSize },
    )

    return {
      analysisModel,
      creativeBrief,
      creativePlan,
      contentConcept: guidedContentConcept,
      productUrl,
      shots: normalizedPlan.shots,
      summary: normalizedPlan.summary,
    }
  })()

  const assetDescriptors = parsedManifest.map((asset, index) => {
    if (!asset || typeof asset !== 'object') {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Asset manifest contains an invalid entry.',
        status: 400,
      })
    }

    const record = asset as Record<string, unknown>
    const fieldName = record.fieldName
    const label = record.label
    const kind = record.kind
    const order = record.order
    const file = formData.get(String(fieldName))

    if (
      typeof fieldName !== 'string' ||
      typeof label !== 'string' ||
      (kind !== 'named' && kind !== 'product') ||
      typeof order !== 'number'
    ) {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Asset manifest entry is missing required fields.',
        status: 400,
      })
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: `Missing uploaded file for ${label}.`,
        status: 400,
      })
    }

    const expectedUploadKind = getExpectedUploadKind(fieldName)

    if (expectedUploadKind) {
      assertUploadedFileKind(file, expectedUploadKind, label)
    }

    const parsedKey =
      typeof record.key === 'string' && namedAssetKeys.includes(record.key as NamedAssetKey)
        ? (record.key as NamedAssetKey)
        : undefined

    return {
      fieldName,
      file,
      kind: kind as 'named' | 'product',
      label,
      order: Number(order) || index,
      ...(parsedKey ? { key: parsedKey } : null),
      ...(typeof record.productId === 'string'
        ? { productId: record.productId }
        : null),
    }
  })
  const requestedVideoAudio =
    readOptionalEnum(formData, 'videoAudio', ['no-audio', 'with-audio'] as const) ??
    'no-audio'
  const normalizedVideoAudio = normalizeVideoAudioForModel(
    videoModel,
    requestedVideoAudio,
  )
  const motionControlReferenceImage = formData.get('asset_motionControlReferenceImage')
  if (motionControlReferenceImage instanceof File) {
    assertUploadedFileKind(
      motionControlReferenceImage,
      'image',
      'Motion Control reference image',
    )
  }
  const motionControlMotionVideo = formData.get('asset_motionControlMotionVideo')
  if (motionControlMotionVideo instanceof File) {
    assertUploadedFileKind(
      motionControlMotionVideo,
      'video',
      'Motion Control motion video',
    )
  }
  const carouselDraft = workspace === 'carousel' ? parseCarouselDraft(formData) : null

  return {
    activeModel: workspace === 'image' ? imageModel : videoModel,
    assetDescriptors,
    carouselDraft,
    batchSize: batchSize as BatchSize,
    cameraMovement: readOptionalEnum(
      formData,
      'cameraMovement',
      ['orbit', 'dolly', 'drone', 'crash-zoom', 'macro'] as const,
    ),
    characterAgeGroup:
      workspace === 'motion-control'
        ? 'any'
        : readEnum(
            formData,
            'characterAgeGroup',
            ['any', 'young-adult', 'adult', 'middle-aged', 'senior'] as const,
          ),
    characterGender:
      workspace === 'motion-control'
        ? 'any'
        : readEnum(
            formData,
            'characterGender',
            ['any', 'female', 'male', 'non-binary'] as const,
          ),
    creativeStyle:
      workspace === 'motion-control'
        ? 'ugc-lifestyle'
        : readEnum(
            formData,
            'creativeStyle',
            [
              'ugc-lifestyle',
              'cinematic',
              'tv-commercial',
              'elite-product-commercial',
            ] as const,
          ),
    experience,
    figureArtDirection:
      workspace === 'motion-control'
        ? 'none'
        : readEnum(
            formData,
            'figureArtDirection',
            ['none', 'curvaceous-editorial'] as const,
          ),
    guided,
    imageModel,
    motionControl,
    motionControlDurationSeconds,
    motionControlResolution,
    outputQuality,
    orientationPreference:
      workspace === 'motion-control'
        ? 'auto'
        : readOptionalEnum(
            formData,
            'orientationPreference',
            ['auto', 'portrait', 'landscape', 'square'] as const,
          ) ?? 'auto',
    productCategory:
      workspace === 'motion-control'
        ? 'miscellaneous'
        : readEnum(
            formData,
            'productCategory',
            [
              'food-drink',
              'jewelry',
              'cosmetics',
              'electronics',
              'clothing',
              'miscellaneous',
            ] as const,
          ),
    shotEnvironment:
      workspace === 'motion-control'
        ? 'indoor'
        : readEnum(
            formData,
            'shotEnvironment',
            ['indoor', 'outdoor'] as const,
          ),
    subjectMode:
      workspace === 'motion-control'
        ? 'product-only'
        : readEnum(
            formData,
            'subjectMode',
            ['product-only', 'lifestyle'] as const,
          ),
    textPrompt: readString(formData, 'textPrompt'),
    videoDuration: readEnum(
      formData,
      'videoDuration',
      ['base', 'extended'] as const,
    ),
    videoAudio: normalizedVideoAudio,
    videoModel,
    workspace,
  }
}

export async function submitProviderTask(
  apiKey: string,
  submission: {
    endpoint: string
    modelName: string
    provider: GenerationProvider
    requestBody: Record<string, unknown>
  },
) {
  const response = await fetch(submission.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission.requestBody),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw createServiceUnavailableError(await readKieError(response))
  }

  const payload = (await response.json()) as Record<string, unknown>
  const payloadData =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : null
  if (payload.code !== undefined && payload.code !== 200) {
    throw createServiceUnavailableError(
      typeof payload.msg === 'string' && payload.msg.length > 0
        ? payload.msg
        : `KIE returned error code ${String(payload.code)}.`,
    )
  }
  const taskIdCandidates = [
    payloadData?.taskId,
    payloadData?.task_id,
    payloadData?.id,
    payload.taskId,
    payload.task_id,
    payload.id,
  ]
  const taskId =
    taskIdCandidates.find(
      (candidate): candidate is string =>
        typeof candidate === 'string' && candidate.length > 0,
    ) ?? null

  if (!taskId) {
    throw createServiceUnavailableError(
      'KIE generation request did not return a task ID.',
    )
  }

  return taskId
}

async function resolveAssetDescriptors(
  input: ParsedGenerationRequest,
) {
  return input.assetDescriptors satisfies ResolvedAssetDescriptor[]
}

export function resolveSubmission(input: {
  assets: UploadedAssetDescriptor[]
  cameraMovement: CameraMovement | null
  creativeStyle: CreativeStyle
  imageGrid?: boolean
  imageModel: ImageModelOption
  motionControlResolution?: MotionControlResolution | null
  outputQuality: OutputQuality
  orientationPreference?: OrientationPreference
  productCategory: ProductCategory
  prompt: string
  subjectMode: SubjectMode
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}) {
  if (input.workspace === 'motion-control') {
    const uploadedReferenceImage = input.assets.find(
      (asset) => asset.fieldName === 'asset_motionControlReferenceImage',
    )
    const uploadedMotionVideo = input.assets.find(
      (asset) => asset.fieldName === 'asset_motionControlMotionVideo',
    )

    if (!uploadedReferenceImage || !uploadedMotionVideo || !input.motionControlResolution) {
      throw new GenerationRequestError({
        code: 'invalid_input',
        message: 'Motion Control submission is missing required inputs.',
        status: 400,
      })
    }

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'kling-3.0/motion-control',
      provider: 'market' as const,
      requestBody: buildMotionControlPayload({
        motionVideoUrl: uploadedMotionVideo.remoteUrl,
        prompt: input.prompt,
        referenceImageUrl: uploadedReferenceImage.remoteUrl,
        resolution: input.motionControlResolution,
      }),
    }
  }

  return input.workspace === 'image'
    ? buildMarketImagePayload({
        assets: input.assets,
        imageGrid: input.imageGrid ?? true,
        imageModel: input.imageModel,
        outputQuality: input.outputQuality,
        prompt: input.prompt,
        subjectMode: input.subjectMode,
      })
    : buildVideoPayload({
        assets: input.assets,
        outputQuality: input.outputQuality,
        orientationPreference: input.orientationPreference ?? 'auto',
        prompt: input.prompt,
        subjectMode: input.subjectMode,
        videoAudio: input.videoAudio,
        videoDuration: input.videoDuration,
        videoModel: input.videoModel,
    })
}

async function uploadResolvedAssets(input: {
  apiKey?: string
  assetDescriptors: ResolvedAssetDescriptor[]
  imageModel: ImageModelOption
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}) {
  const apiKey = input.apiKey ?? getKieApiKey()

  return Promise.all(
    input.assetDescriptors.map(async (descriptor) => {
      const normalizedFile = await normalizeGenerationImageUpload({
        fieldName: descriptor.fieldName,
        file: descriptor.file,
        imageModel: input.imageModel,
        label: descriptor.label,
        videoModel: input.videoModel,
        workspace: input.workspace,
      })

      return {
        ...descriptor,
        file: normalizedFile,
        remoteUrl: await uploadFileToKie(apiKey, normalizedFile, input.workspace),
      }
    }),
  )
}

async function submitCarouselGenerationRequest(
  input: ParsedGenerationRequest,
  apiKey: string,
  runId: string,
): Promise<RunSubmissionResponse> {
  const draft = input.carouselDraft!

  if (!draft || draft.panels.length === 0) {
    throw new GenerationRequestError({
      code: 'invalid_input',
      message: 'Carousel draft is empty or missing panels.',
      status: 400,
    })
  }

  const orderedPanels = [...draft.panels].sort((a, b) => a.order - b.order)
  const baseTemplateRemoteUrl = draft.baseTemplateAsset?.file
    ? await uploadFileToKie(
        apiKey,
        await normalizeGenerationImageUpload({
          fieldName: 'carousel_base_template_image',
          file: draft.baseTemplateAsset.file,
          imageModel: input.imageModel,
          label: 'Base template',
          videoModel: input.videoModel,
          workspace: input.workspace,
        }),
        input.workspace,
      )
    : null
  const panelImageRemoteUrlByPanelId = new Map<string, string>()

  for (const panel of orderedPanels) {
    if (!panel.imageAsset?.file) {
      continue
    }

    panelImageRemoteUrlByPanelId.set(
      panel.id,
      await uploadFileToKie(
        apiKey,
        await normalizeGenerationImageUpload({
          fieldName: `carousel_panel_image_${panel.id}`,
          file: panel.imageAsset.file,
          imageModel: input.imageModel,
          label: `Carousel panel ${panel.order} image`,
          videoModel: input.videoModel,
          workspace: input.workspace,
        }),
        input.workspace,
      ),
    )
  }

  const panelBatches = Array.from(
    { length: Math.ceil(orderedPanels.length / 4) },
    (_, index) => orderedPanels.slice(index * 4, index * 4 + 4),
  )
  const submissions = await Promise.all(
    panelBatches.map(async (panels) => {
      const prompt = buildCarouselBatchPrompt(panels, draft)

      const taskId = await submitProviderTask(apiKey, {
        endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
        modelName: 'nano-banana-2',
        provider: 'market' as const,
        requestBody: {
          model: 'nano-banana-2',
          input: {
            prompt,
            image_input: collectCarouselBatchReferences({
              baseTemplateRemoteUrl,
              panelImageRemoteUrlByPanelId,
              panels,
            }),
            aspect_ratio: '1:1',
            resolution: getNanoBananaResolution(input.outputQuality),
            output_format: 'png',
            google_search: false,
          },
        },
      })

      return {
        panels,
        prompt,
        taskId,
      }
    }),
  )

  return buildCarouselVariants(submissions, runId)
}

export async function submitGenerationRequest(
  input: ParsedGenerationRequest,
  options: {
    basePrompt?: string
    runId?: string
  } = {},
): Promise<RunSubmissionResponse> {
  const apiKey = getKieApiKey()
  const runId = options.runId ?? createRunId()

  if (input.workspace === 'carousel') {
    return submitCarouselGenerationRequest(input, apiKey, runId)
  }

  const resolvedAssets = await resolveAssetDescriptors(input)
  const uploadedAssets = await uploadResolvedAssets({
    apiKey,
    assetDescriptors: resolvedAssets,
    imageModel: input.imageModel,
    videoModel: input.videoModel,
    workspace: input.workspace,
  })
  const basePrompt = options.basePrompt ?? buildPromptSnapshot(input)
  const resolvedPromptSet: PromptVariantDescriptor[] =
    input.experience === 'guided' && input.guided
      ? input.guided.shots.map((shot, index) => ({
          index: (index + 1) as GenerationVariantIndex,
          profile: shot.title,
          prompt: shot.prompt,
          subjectMode: shot.subjectMode,
        }))
      : buildVariantPromptSet({
          basePrompt,
          batchSize: input.batchSize,
          cameraMovement: input.cameraMovement,
          workspace: input.workspace,
        }).map((descriptor) => ({
          ...descriptor,
          subjectMode: input.subjectMode,
        }))
  const usesManualImageGrid =
    input.experience === 'manual' && input.workspace === 'image'
  const sampleSubmission = resolveSubmission({
    assets: uploadedAssets,
    cameraMovement: input.cameraMovement,
    creativeStyle: input.creativeStyle,
    imageGrid: usesManualImageGrid,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    orientationPreference: input.orientationPreference,
    productCategory: input.productCategory,
    prompt: resolvedPromptSet[0]?.prompt ?? basePrompt,
    subjectMode: resolvedPromptSet[0]?.subjectMode ?? input.subjectMode,
    motionControlResolution: input.motionControlResolution,
    videoDuration: input.videoDuration,
    videoAudio: input.videoAudio,
    videoModel: input.videoModel,
    workspace: input.workspace,
  })

  const settledVariants = await Promise.allSettled(
    resolvedPromptSet.map(async ({ index, profile, prompt, subjectMode }) => {
      const submission = resolveSubmission({
        assets: uploadedAssets,
        cameraMovement: input.cameraMovement,
        creativeStyle: input.creativeStyle,
        imageGrid: usesManualImageGrid,
        imageModel: input.imageModel,
        outputQuality: input.outputQuality,
        orientationPreference: input.orientationPreference,
        productCategory: input.productCategory,
        prompt,
        subjectMode,
        motionControlResolution: input.motionControlResolution,
        videoDuration: input.videoDuration,
        videoAudio: input.videoAudio,
        videoModel: input.videoModel,
        workspace: input.workspace,
      })
      const taskId = await submitProviderTask(apiKey, submission)

      return {
        completedAt: null,
        createdAt: null,
        error: null,
        index,
        profile,
        prompt,
        result: null,
        status: 'rendering' as const,
        taskId,
        variantId: `${runId}-variant-${index}`,
      }
    }),
  )

  const variants: GenerationVariant[] = settledVariants.flatMap<GenerationVariant>((variant, index) => {
    const descriptor = resolvedPromptSet[index]
    const expandedDescriptors = usesManualImageGrid
      ? ([1, 2, 3, 4] as const).map((gridPosition) => {
          const variantIndex = (index * 4 + gridPosition) as GenerationVariantIndex

          return {
            index: variantIndex,
            profile: `Grid ${descriptor.index} Image ${gridPosition}`,
            prompt: descriptor.prompt,
          }
        })
      : [
          {
            index: descriptor.index,
            profile: descriptor.profile,
            prompt: descriptor.prompt,
          },
        ]

    if (variant.status === 'fulfilled') {
      return expandedDescriptors.map((expandedDescriptor) => ({
        ...variant.value,
        index: expandedDescriptor.index,
        profile: expandedDescriptor.profile,
        prompt: expandedDescriptor.prompt,
        variantId: `${runId}-variant-${expandedDescriptor.index}`,
      }))
    }

    return expandedDescriptors.map((expandedDescriptor) => ({
      completedAt: null,
      createdAt: null,
      error:
        variant.reason instanceof Error
          ? variant.reason.message
          : 'Unable to create provider task.',
      index: expandedDescriptor.index,
      profile: expandedDescriptor.profile,
      prompt: expandedDescriptor.prompt,
      result: null,
      status: 'error' as const,
      taskId: null,
      variantId: `${runId}-variant-${expandedDescriptor.index}`,
    }))
  }) satisfies GenerationVariant[]

  return {
    completedAt: null,
    createdAt: new Date().toISOString(),
    model: sampleSubmission.modelName,
    provider: sampleSubmission.provider,
    runId,
    status: variants.some((variant) => variant.status === 'rendering')
      ? 'rendering'
      : variants.every((variant) => variant.status === 'error')
        ? 'error'
        : 'partial-success',
    variants,
    workspace: input.workspace,
  }
}

function normalizeResult(
  urls: string[],
  workspace: WorkspaceTab,
  taskId: string,
  model: string,
): GenerationResult | null {
  const primaryUrl = urls[0]

  if (!primaryUrl) {
    return null
  }

  return {
    type: workspace === 'video' || workspace === 'motion-control' ? 'video' : 'image',
    url: primaryUrl,
    taskId,
    model,
  }
}

export async function getTaskStatus(input: {
  provider: GenerationProvider
  taskId: string
  workspace: WorkspaceTab
  model: string
}): Promise<TaskPollResponse> {
  const apiKey = getKieApiKey()
  const endpoint =
    input.provider === 'veo'
      ? `${KIE_API_BASE_URL}/api/v1/veo/record-info?taskId=${encodeURIComponent(input.taskId)}`
      : `${KIE_API_BASE_URL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(input.taskId)}`

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw createServiceUnavailableError(await readKieError(response))
  }

  const payload = (await response.json()) as Record<string, unknown>
  const data = payload.data as Record<string, unknown> | undefined

  if (!data) {
    throw createServiceUnavailableError(
      'KIE task status response did not include data.',
    )
  }

  if (input.provider === 'veo') {
    const successFlag = Number(data.successFlag ?? 0)

    if (successFlag === 0) {
      return {
        error: null,
        result: null,
        status: 'rendering',
        taskId: input.taskId,
      }
    }

    if (successFlag === 1) {
      const urls = extractResultUrls(data.response)

      return {
        error: null,
        result: normalizeResult(urls, input.workspace, input.taskId, input.model),
        status: 'success',
        taskId: input.taskId,
      }
    }

    return {
      error:
        typeof data.errorMessage === 'string' && data.errorMessage.length > 0
          ? data.errorMessage
          : 'Veo generation failed.',
      result: null,
      status: 'error',
      taskId: input.taskId,
    }
  }

  const state = typeof data.state === 'string' ? data.state : 'generating'

  if (state === 'waiting' || state === 'queuing' || state === 'generating') {
    return {
      error: null,
      result: null,
      status: 'rendering',
      taskId: input.taskId,
    }
  }

  if (state === 'success') {
    const resultJson =
      typeof data.resultJson === 'string' ? safeJsonParse(data.resultJson) : null
    const urls = extractResultUrls(resultJson)

    return {
      error: null,
      result: normalizeResult(urls, input.workspace, input.taskId, input.model),
      status: 'success',
      taskId: input.taskId,
    }
  }

  return {
    error:
      typeof data.failMsg === 'string' && data.failMsg.length > 0
        ? data.failMsg
        : 'Generation failed upstream.',
    result: null,
    status: 'error',
    taskId: input.taskId,
  }
}
