import 'server-only'

import {
  buildVariantPromptSet,
  compileGenerationPrompt,
  chooseEndFrameReference,
  choosePrimaryReference,
} from '@/lib/generation/prompt'
import type {
  BatchSize,
  CameraMovement,
  CreativeStyle,
  GenerationProvider,
  GenerationResult,
  KieStatusResponse,
  KieStatusSource,
  GenerationVariant,
  GenerationVariantIndex,
  ImageModelOption,
  NamedAssetKey,
  OutputQuality,
  ProductCategory,
  RunSubmissionResponse,
  SubjectMode,
  SubmittedAssetDescriptor,
  TaskPollResponse,
  UploadedAssetDescriptor,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'

const KIE_API_BASE_URL = 'https://api.kie.ai'
const KIE_FILE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload'
const VEO_DEFAULT_MODEL = 'veo3_fast'
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

type ParsedGenerationRequest = {
  activeModel: ImageModelOption | VideoModelOption
  assetDescriptors: Array<SubmittedAssetDescriptor & { file: File }>
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  creativeStyle: CreativeStyle
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
  workspace: WorkspaceTab
}

function getKieApiKey() {
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

async function readKieError(response: Response) {
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

function getGrokResolution(outputQuality: OutputQuality) {
  if (outputQuality === '1080p') {
    return '720p'
  }

  return '480p'
}

function getKlingDuration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '10' : '5'
}

function getGrokDuration(videoDuration: VideoDuration) {
  return videoDuration === 'extended' ? '10' : '6'
}

function createRunId() {
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

function buildMarketImagePayload(input: {
  assets: UploadedAssetDescriptor[]
  imageModel: ImageModelOption
  prompt: string
  subjectMode: SubjectMode
}) {
  const primaryReference = choosePrimaryReference(input.subjectMode, input.assets)
  const aspectRatio = getImageAspectRatio(input.subjectMode)

  if (input.imageModel === 'nano-banana') {
    if (primaryReference) {
      return {
        endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
        modelName: 'google/nano-banana-edit',
        provider: 'market' as const,
        requestBody: {
        model: 'google/nano-banana-edit',
        input: {
          prompt: input.prompt,
          image_urls: [primaryReference.remoteUrl],
          output_format: 'png',
          image_size: aspectRatio,
          },
        },
      }
    }

    return {
      endpoint: `${KIE_API_BASE_URL}/api/v1/jobs/createTask`,
      modelName: 'google/nano-banana',
      provider: 'market' as const,
      requestBody: {
        model: 'google/nano-banana',
        input: {
          prompt: input.prompt,
          output_format: 'png',
          image_size: aspectRatio,
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
          prompt: input.prompt,
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
          prompt: input.prompt,
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

async function uploadFileToKie(
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
    creativeStyle: readEnum(
      formData,
      'creativeStyle',
      ['ugc-lifestyle', 'cinematic', 'tv-commercial'] as const,
    ),
    imageModel,
    outputQuality: readEnum(
      formData,
      'outputQuality',
      ['720p', '1080p', '4k'] as const,
    ),
    productCategory: readEnum(
      formData,
      'productCategory',
      ['food-drink', 'jewelry', 'cosmetics', 'electronics', 'clothing'] as const,
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

async function submitProviderTask(
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

function resolveSubmission(input: {
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

export async function submitGenerationRequest(
  input: ParsedGenerationRequest,
): Promise<RunSubmissionResponse> {
  const apiKey = getKieApiKey()
  const runId = createRunId()
  const uploadedAssets = await Promise.all(
    input.assetDescriptors.map(async (descriptor) => ({
      ...descriptor,
      remoteUrl: await uploadFileToKie(apiKey, descriptor.file, input.workspace),
    })),
  )
  const basePrompt = compileGenerationPrompt({
    assets: uploadedAssets,
    cameraMovement: input.workspace === 'video' ? input.cameraMovement : null,
    creativeStyle: input.creativeStyle,
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    subjectMode: input.subjectMode,
    textPrompt: input.textPrompt,
    videoDuration: input.videoDuration,
    workspace: input.workspace,
  })
  const promptSet = buildVariantPromptSet({
    basePrompt,
    batchSize: input.batchSize as GenerationVariantIndex,
    cameraMovement: input.cameraMovement,
    workspace: input.workspace,
  })
  const sampleSubmission = resolveSubmission({
    assets: uploadedAssets,
    cameraMovement: input.cameraMovement,
    creativeStyle: input.creativeStyle,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    prompt: promptSet[0]?.prompt ?? basePrompt,
    subjectMode: input.subjectMode,
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
    workspace: input.workspace,
  })

  const settledVariants = await Promise.allSettled(
    promptSet.map(async ({ index, profile, prompt }) => {
      const submission = resolveSubmission({
        assets: uploadedAssets,
        cameraMovement: input.cameraMovement,
        creativeStyle: input.creativeStyle,
        imageModel: input.imageModel,
        outputQuality: input.outputQuality,
        productCategory: input.productCategory,
        prompt,
        subjectMode: input.subjectMode,
        videoDuration: input.videoDuration,
        videoModel: input.videoModel,
        workspace: input.workspace,
      })
      const taskId = await submitProviderTask(apiKey, submission)

      return {
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

    const descriptor = promptSet[index]

    return {
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
    model: sampleSubmission.modelName,
    provider: sampleSubmission.provider,
    runId,
    uploadedAssets,
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
