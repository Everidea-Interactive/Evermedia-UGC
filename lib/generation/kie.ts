import 'server-only'

import {
  buildVariantPromptSet,
  compileGenerationPrompt,
  chooseEndFrameReference,
  choosePrimaryReference,
} from '@/lib/generation/prompt'
import {
  normalizeGuidedAnalysisPlan,
  normalizeKieAnalysisModel,
} from '@/lib/generation/guided'
import {
  getGrokDuration,
  getGrokResolution,
  getKlingDuration,
  getNanoBananaResolution,
} from '@/lib/generation/model-mapping'
import type {
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
  OutputQuality,
  ProductCategory,
  RunSubmissionResponse,
  ShotEnvironment,
  SubjectMode,
  SubmittedAssetDescriptor,
  TaskPollResponse,
  UploadedAssetDescriptor,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'

export const KIE_API_BASE_URL = 'https://api.kie.ai'
const KIE_FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload'
const VEO_DEFAULT_MODEL = 'veo3_fast'
const NANO_BANANA_REFERENCE_LIMIT = 3
const namedAssetKeys = ['face1', 'face2', 'clothing', 'location', 'endFrame'] as const
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
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  experience: GenerationExperience
  figureArtDirection: FigureArtDirection
  guided: {
    analysisModel: KieAnalysisModel
    contentConcept: ContentConcept
    productUrl: string
    shots: GuidedAnalysisShot[]
    summary: string
  } | null
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
  workspace: WorkspaceTab
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
    throw new Error('KIE_API_KEY is not configured on the server.')
  }

  return apiKey
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    throw new Error(`Missing required form field: ${key}.`)
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
    throw new Error(`Invalid value for ${key}.`)
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
    throw new Error(`Invalid value for ${key}.`)
  }

  return value as T
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
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

function extractRemoteUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  const directCandidates = [
    record.url,
    record.fileUrl,
    record.file_url,
    record.downloadUrl,
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate
    }
  }

  const nestedCandidates = [record.data, record.result, record.response]

  for (const candidate of nestedCandidates) {
    const nested = extractRemoteUrl(candidate)

    if (nested) {
      return nested
    }
  }

  return null
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
    throw new Error(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const credits = extractCredits(payload)

  if (credits === null) {
    throw new Error('KIE credit response did not include a usable balance.')
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

function getVideoAspectRatio(subjectMode: SubjectMode) {
  return subjectMode === 'product-only' ? '16:9' : '9:16'
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

  return compileGenerationPrompt({
    assets: createPromptAssets(input.assetDescriptors),
    cameraMovement: input.workspace === 'video' ? input.cameraMovement : null,
    characterAgeGroup: input.characterAgeGroup,
    characterGender: input.characterGender,
    creativeStyle: input.creativeStyle,
    figureArtDirection: input.figureArtDirection,
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    shotEnvironment: input.shotEnvironment,
    subjectMode: input.subjectMode,
    textPrompt: input.textPrompt,
    videoDuration: input.videoDuration,
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
    isIdentityAnchor: boolean
    subjectMode: SubjectMode
  },
) {
  if (asset.kind === 'product') {
    return `Use it as the exact product reference. Preserve packaging, branding, colors, materials, and proportions.`
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

  const referenceInstructions = input.referenceAssets.map((asset, index) => {
    const imageIndex = index + 1

    return `Image ${imageIndex} (${asset.label}) ${describeNanoBananaReference(asset, {
      isIdentityAnchor: asset.fieldName === identityReference?.fieldName,
      subjectMode: input.subjectMode,
    })}`
  })

  const safeguard =
    input.subjectMode === 'lifestyle'
      ? 'Do not blend faces across references, and do not let clothing or location references override the identity anchor.'
      : 'Do not let supporting references override the core product design.'

  return [
    'Treat the uploaded references as image 1, image 2, and image 3 in the exact order provided when applicable.',
    ...referenceInstructions,
    safeguard,
    trimmedPrompt,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensureGrokImagePromptReference(prompt: string) {
  const trimmedPrompt = prompt.trim()

  if (/@image1\b/.test(trimmedPrompt)) {
    return trimmedPrompt
  }

  return `@image1 ${trimmedPrompt}`.trim()
}

function buildMarketImagePayload(input: {
  assets: UploadedAssetDescriptor[]
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  prompt: string
  subjectMode: SubjectMode
}) {
  const referenceAssets =
    input.imageModel === 'nano-banana'
      ? collectNanoBananaReferenceAssets(input.subjectMode, input.assets)
      : collectImageReferenceAssets(input.subjectMode, input.assets)
  const primaryReference = referenceAssets[0] ?? null
  const aspectRatio = getImageAspectRatio(input.subjectMode)

  if (input.imageModel === 'nano-banana') {
    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'nano-banana-2',
      provider: 'market' as const,
      requestBody: {
        model: 'nano-banana-2',
        input: {
          prompt: buildNanoBananaPrompt({
            prompt: input.prompt,
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

  if (primaryReference) {
    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'grok-imagine/image-to-image',
      provider: 'market' as const,
      requestBody: {
        model: 'grok-imagine/image-to-image',
        input: {
          prompt: ensureGrokImagePromptReference(input.prompt),
          image_urls: [primaryReference.remoteUrl],
        },
      },
    }
  }

  return {
    endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
    modelName: 'grok-imagine/text-to-image',
    provider: 'market' as const,
      requestBody: {
        model: 'grok-imagine/text-to-image',
        input: {
          prompt: input.prompt,
          aspect_ratio: aspectRatio,
        },
      },
  }
}

function buildVideoPayload(input: {
  assets: UploadedAssetDescriptor[]
  outputQuality: OutputQuality
  prompt: string
  subjectMode: SubjectMode
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}) {
  const primaryReference = choosePrimaryReference(input.subjectMode, input.assets)
  const endFrameReference = chooseEndFrameReference(input.assets)
  const aspectRatio = getVideoAspectRatio(input.subjectMode)

  if (input.videoModel === 'veo-3.1') {
    if (input.outputQuality === '4k') {
      throw new Error('4K Veo upgrades are not enabled in Phase 3.')
    }

    const imageUrls = [
      primaryReference?.remoteUrl,
      endFrameReference?.remoteUrl,
    ].filter((value): value is string => Boolean(value))

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
        enableTranslation: true,
        generationType:
          imageUrls.length === 2
            ? 'FIRST_AND_LAST_FRAMES_2_VIDEO'
            : imageUrls.length === 1
              ? 'REFERENCE_2_VIDEO'
              : 'TEXT_2_VIDEO',
      },
    }
  }

  if (input.videoModel === 'grok-imagine') {
    const modelName = primaryReference
      ? 'grok-imagine/image-to-video'
      : 'grok-imagine/text-to-video'

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName,
      provider: 'market' as const,
      requestBody: {
        model: modelName,
        input: {
          prompt: primaryReference
            ? ensureGrokImagePromptReference(input.prompt)
            : input.prompt,
          ...(primaryReference
            ? { image_urls: [primaryReference.remoteUrl] }
            : null),
          aspect_ratio: aspectRatio,
          mode: 'normal',
          duration: getGrokDuration(input.videoDuration),
          resolution: getGrokResolution(input.outputQuality),
        },
      },
    }
  }

  const modelName = primaryReference
    ? 'kling-2.6/image-to-video'
    : 'kling-2.6/text-to-video'

  return {
    endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
    modelName,
    provider: 'market' as const,
    requestBody: {
      model: modelName,
      input: {
        prompt: input.prompt,
        ...(primaryReference
          ? { image_urls: [primaryReference.remoteUrl] }
          : null),
        duration: getKlingDuration(input.videoDuration),
        aspect_ratio: aspectRatio,
      },
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

  const response = await fetch(KIE_FILE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const remoteUrl = extractRemoteUrl(payload)

  if (!remoteUrl) {
    throw new Error('KIE file upload did not return a usable remote URL.')
  }

  return remoteUrl
}

export function parseGenerationFormData(formData: FormData): ParsedGenerationRequest {
  const experience =
    readOptionalEnum(formData, 'experience', ['manual', 'guided'] as const) ??
    'manual'
  const workspace = readEnum(formData, 'workspace', ['image', 'video'] as const)
  const batchSize = Number.parseInt(readString(formData, 'batchSize'), 10)

  if (![1, 2, 3, 4].includes(batchSize)) {
    throw new Error('Batch size must be between 1 and 4.')
  }

  const imageModel = readEnum(
    formData,
    'imageModel',
    ['nano-banana', 'grok-imagine'] as const,
  )
  const videoModel = readEnum(
    formData,
    'videoModel',
    ['veo-3.1', 'kling', 'grok-imagine'] as const,
  )
  const manifestValue = readString(formData, 'assetManifest')
  const parsedManifest = safeJsonParse(manifestValue)

  if (!Array.isArray(parsedManifest)) {
    throw new Error('Asset manifest is malformed.')
  }

  const guided = (() => {
    if (experience !== 'guided') {
      return null
    }

    if (workspace !== 'image') {
      throw new Error('Guided mode is available for images only.')
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
      throw new Error('Unsupported guided analysis model.')
    }
    const productUrl = readOptionalString(formData, 'productUrl') ?? ''
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
        shots: safeJsonParse(guidedShotsValue),
        summary: guidedSummary,
      },
      { shotCount: batchSize },
    )

    return {
      analysisModel,
      contentConcept: guidedContentConcept,
      productUrl,
      shots: normalizedPlan.shots,
      summary: normalizedPlan.summary,
    }
  })()

  const assetDescriptors = parsedManifest.map((asset, index) => {
    if (!asset || typeof asset !== 'object') {
      throw new Error('Asset manifest contains an invalid entry.')
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
      throw new Error('Asset manifest entry is missing required fields.')
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new Error(`Missing uploaded file for ${label}.`)
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

  return {
    activeModel: workspace === 'image' ? imageModel : videoModel,
    assetDescriptors,
    batchSize: batchSize as BatchSize,
    cameraMovement: readOptionalEnum(
      formData,
      'cameraMovement',
      ['orbit', 'dolly', 'drone', 'crash-zoom', 'macro'] as const,
    ),
    characterAgeGroup: readEnum(
      formData,
      'characterAgeGroup',
      ['any', 'young-adult', 'adult', 'middle-aged', 'senior'] as const,
    ),
    characterGender: readEnum(
      formData,
      'characterGender',
      ['any', 'female', 'male', 'non-binary'] as const,
    ),
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
    experience,
    figureArtDirection: readEnum(
      formData,
      'figureArtDirection',
      ['none', 'curvaceous-editorial'] as const,
    ),
    guided,
    imageModel,
    outputQuality: readEnum(
      formData,
      'outputQuality',
      ['720p', '1080p', '4k'] as const,
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
    shotEnvironment: readEnum(
      formData,
      'shotEnvironment',
      ['indoor', 'outdoor'] as const,
    ),
    subjectMode: readEnum(
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
    throw new Error(await readKieError(response))
  }

  const payload = (await response.json()) as {
    data?: {
      taskId?: string
    }
  }
  const taskId = payload.data?.taskId

  if (!taskId) {
    throw new Error('KIE generation request did not return a task ID.')
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
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  prompt: string
  subjectMode: SubjectMode
  videoDuration: VideoDuration
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}) {
  return input.workspace === 'image'
    ? buildMarketImagePayload({
        assets: input.assets,
        imageModel: input.imageModel,
        outputQuality: input.outputQuality,
        prompt: input.prompt,
        subjectMode: input.subjectMode,
      })
    : buildVideoPayload({
        assets: input.assets,
        outputQuality: input.outputQuality,
        prompt: input.prompt,
        subjectMode: input.subjectMode,
        videoDuration: input.videoDuration,
        videoModel: input.videoModel,
    })
}

async function uploadResolvedAssets(input: {
  apiKey?: string
  assetDescriptors: ResolvedAssetDescriptor[]
  workspace: WorkspaceTab
}) {
  const apiKey = input.apiKey ?? getKieApiKey()

  return Promise.all(
    input.assetDescriptors.map(async (descriptor) => ({
      ...descriptor,
      remoteUrl: await uploadFileToKie(apiKey, descriptor.file, input.workspace),
    })),
  )
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
  const resolvedAssets = await resolveAssetDescriptors(input)
  const uploadedAssets = await uploadResolvedAssets({
    apiKey,
    assetDescriptors: resolvedAssets,
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
          batchSize: input.batchSize as GenerationVariantIndex,
          cameraMovement: input.cameraMovement,
          workspace: input.workspace,
        }).map((descriptor) => ({
          ...descriptor,
          subjectMode: input.subjectMode,
        }))
  const sampleSubmission = resolveSubmission({
    assets: uploadedAssets,
    cameraMovement: input.cameraMovement,
    creativeStyle: input.creativeStyle,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    prompt: resolvedPromptSet[0]?.prompt ?? basePrompt,
    subjectMode: resolvedPromptSet[0]?.subjectMode ?? input.subjectMode,
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
    workspace: input.workspace,
  })

  const settledVariants = await Promise.allSettled(
    resolvedPromptSet.map(async ({ index, profile, prompt, subjectMode }) => {
      const submission = resolveSubmission({
        assets: uploadedAssets,
        cameraMovement: input.cameraMovement,
        creativeStyle: input.creativeStyle,
        imageModel: input.imageModel,
        outputQuality: input.outputQuality,
        productCategory: input.productCategory,
        prompt,
        subjectMode,
        videoDuration: input.videoDuration,
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

  const variants = settledVariants.map((variant, index) => {
    if (variant.status === 'fulfilled') {
      return variant.value
    }

    const descriptor = resolvedPromptSet[index]

    return {
      completedAt: null,
      createdAt: null,
      error:
        variant.reason instanceof Error
          ? variant.reason.message
          : 'Unable to create provider task.',
      index: descriptor.index,
      profile: descriptor.profile,
      prompt: descriptor.prompt,
      result: null,
      status: 'error' as const,
      taskId: null,
      variantId: `${runId}-variant-${descriptor.index}`,
    }
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
    type: workspace === 'video' ? 'video' : 'image',
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
    throw new Error(await readKieError(response))
  }

  const payload = (await response.json()) as Record<string, unknown>
  const data = payload.data as Record<string, unknown> | undefined

  if (!data) {
    throw new Error('KIE task status response did not include data.')
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
