import 'server-only'

import type {
  BatchSize,
  CameraMovement,
  ContentConcept,
  GuidedAnalysisPlan,
  KieAnalysisModel,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import { normalizeGuidedAnalysisPlan } from '@/lib/generation/guided'
import {
  getVideoDurationSeconds,
} from '@/lib/generation/model-mapping'
import type { ScrapedProductPage } from '@/lib/generation/product-page'
import {
  KIE_API_BASE_URL,
  fetchKieWithTimeout,
  getKieApiKey,
  readKieError,
} from '@/lib/generation/kie'

const guidedPlanJsonSchema = {
  additionalProperties: false,
  properties: {
    creativeStyle: {
      enum: [
        'ugc-lifestyle',
        'cinematic',
        'tv-commercial',
        'elite-product-commercial',
      ],
      type: 'string',
    },
    productCategory: {
      enum: [
        'food-drink',
        'jewelry',
        'cosmetics',
        'electronics',
        'clothing',
        'miscellaneous',
      ],
      type: 'string',
    },
    shots: {
      items: {
        additionalProperties: false,
        properties: {
          prompt: { type: 'string' },
          shotEnvironment: {
            enum: ['indoor', 'outdoor'],
            type: 'string',
          },
          slug: { type: 'string' },
          subjectMode: {
            enum: ['product-only', 'lifestyle'],
            type: 'string',
          },
          tags: {
            items: { type: 'string' },
            type: 'array',
          },
          title: { type: 'string' },
        },
        required: [
          'title',
          'slug',
          'prompt',
          'tags',
          'subjectMode',
          'shotEnvironment',
        ],
        type: 'object',
      },
      maxItems: 4,
      minItems: 1,
      type: 'array',
    },
    summary: { type: 'string' },
  },
  required: ['summary', 'productCategory', 'creativeStyle', 'shots'],
  type: 'object',
} as const

const guidedPlanToolName = 'submit_guided_analysis_plan'
const GEMINI_GUIDED_ANALYSIS_TIMEOUT_MS = 180_000

function isClaudeModel(model: KieAnalysisModel) {
  return model.startsWith('claude-')
}

function getConceptInstruction(concept: ContentConcept) {
  return concept === 'driven-ads'
    ? 'Bias toward crisp ad-ready commerce framing, clear product storytelling, direct conversion intent, and premium product emphasis.'
    : 'Bias toward believable affiliate-style UGC framing, persuasive but natural creator energy, and consumer-trust storytelling.'
}

function formatProductPageContext(productPage: ScrapedProductPage | null) {
  if (!productPage) {
    return 'Product page context: unavailable.'
  }

  const clamp = (value: string | null | undefined, max = 140) => {
    if (!value) {
      return 'n/a'
    }

    return value.length > max ? `${value.slice(0, max)}...` : value
  }

  const contextLines = [
    `URL: ${clamp(productPage.url, 180)}`,
    `Title: ${clamp(productPage.title)}`,
    `Brand: ${clamp(productPage.brand, 80)}`,
    `Price: ${clamp(productPage.price, 40)}`,
    `Currency: ${clamp(productPage.currency, 16)}`,
    `Desc: ${clamp(productPage.description, 180)}`,
    `Primary image: ${clamp(productPage.images[0], 200)}`,
  ]

  return contextLines.join('\n')
}

function getVideoTargetClipInstruction(input: {
  videoDuration?: VideoDuration
  videoModel?: VideoModelOption
}) {
  const videoDuration = input.videoDuration ?? 'base'
  const videoModel = input.videoModel ?? 'veo-3.1'
  const modelLabel =
    videoModel === 'seedance-1.5-pro'
      ? 'Seedance 1.5 Pro'
      : videoModel === 'seedance-2'
        ? 'Seedance 2.0'
        : 'Veo 3.1'

  return `Target clip length: ${getVideoDurationSeconds(videoModel, videoDuration)} seconds for ${modelLabel}.`
}

function createSystemPrompt(workspace: WorkspaceTab = 'image') {
  const medium = workspace === 'video' ? 'video-generation' : 'image-generation'
  return [
    'You are an e-commerce creative planner.',
    `Return JSON only, matching schema exactly; no prose.`,
    `Create distinct, production-ready ${medium} prompts from the hero image.`,
    'Preserve product identity, color, material, shape, and branding.',
  ].join(' ')
}

function createClaudeSystemPrompt(workspace: WorkspaceTab = 'image') {
  return [
    createSystemPrompt(workspace),
    'Call the provided tool exactly once with the full guided plan.',
    'The hero product image is always attached in the request.',
    'Product page context may or may not be present; when absent, continue from the hero image alone.',
    'Do not answer with plain text outside the tool call.',
    'If evidence is limited, make the best supported assumptions and still return the structured plan.',
  ].join(' ')
}

function createUserPrompt(input: {
  cameraMovement?: CameraMovement | null
  contentConcept: ContentConcept
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
  videoDuration?: VideoDuration
  videoModel?: VideoModelOption
  workspace?: WorkspaceTab
}) {
  const workspace = input.workspace ?? 'image'
  const shotNoun = input.shotCount === 1 ? 'shot' : 'shots'
  const promptLines = [
    `Create exactly ${input.shotCount} ${workspace === 'video' ? 'video-generation' : 'image-generation'} ${shotNoun}.`,
    getConceptInstruction(input.contentConcept),
    'Pick one productCategory and one creativeStyle for the full set.',
    'Use product-only for detail/packaging focus; use lifestyle only when it clearly improves conversion.',
  ]

  if (workspace === 'video') {
    promptLines.push(
      getVideoTargetClipInstruction(input),
      'Write complete prompts with motion, pacing, subject action, and end state.',
    )

    if (input.cameraMovement) {
      promptLines.push(
        `Motion language: include ${input.cameraMovement.replace(/-/g, ' ')} camera movement where it naturally supports the product story.`,
      )
    }
  }

  promptLines.push(
    'Each prompt must be specific about composition, styling, product focus, lighting, and conversion intent.',
    'Keep titles short; slugs lowercase URL-safe; tags short.',
    formatProductPageContext(input.productPage),
  )

  return promptLines.join('\n')
}

export function buildGeminiAnalysisBody(input: {
  cameraMovement?: CameraMovement | null
  contentConcept: ContentConcept
  heroImageDataUrl?: string | null
  heroImageUrl: string
  model: Extract<KieAnalysisModel, 'gemini-2.5-flash'>
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
  videoDuration?: VideoDuration
  videoModel?: VideoModelOption
  workspace?: WorkspaceTab
}) {
  return {
    messages: [
      {
        content: createSystemPrompt(input.workspace ?? 'image'),
        role: 'system',
      },
      {
        content: [
          {
            text: createUserPrompt(input),
            type: 'text',
          },
          {
            image_url: {
              url: input.heroImageDataUrl ?? input.heroImageUrl,
            },
            type: 'image_url',
          },
        ],
        role: 'user',
      },
    ],
    model: input.model,
    response_format: {
      json_schema: {
        name: 'guided_analysis_plan',
        schema: guidedPlanJsonSchema,
        strict: true,
      },
      type: 'json_schema',
    },
    stream: false,
    temperature: 0.4,
  }
}

export function buildClaudeAnalysisBody(input: {
  cameraMovement?: CameraMovement | null
  contentConcept: ContentConcept
  heroImageUrl: string
  model: Extract<KieAnalysisModel, 'claude-sonnet-4-6'>
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
  videoDuration?: VideoDuration
  videoModel?: VideoModelOption
  workspace?: WorkspaceTab
}) {
  return {
    max_tokens: 2_500,
    messages: [
      {
        content: [
          {
            text: createUserPrompt(input),
            type: 'text',
          },
          {
            image_url: {
              url: input.heroImageUrl,
            },
            type: 'image_url',
          },
        ],
        role: 'user',
      },
    ],
    model: input.model,
    stream: false,
    system: createClaudeSystemPrompt(input.workspace ?? 'image'),
    temperature: 0.4,
    tool_choice: {
      name: guidedPlanToolName,
      type: 'tool',
    },
    tools: [
      {
        description:
          'Submit the complete guided image or video generation plan as structured data.',
        input_schema: guidedPlanJsonSchema,
        name: guidedPlanToolName,
      },
    ],
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function extractJsonFromText(value: string) {
  const trimmedValue = value.trim()
  const directJson = safeJsonParse(trimmedValue)

  if (directJson) {
    return directJson
  }

  const fencedMatch = trimmedValue.match(/```json\s*([\s\S]+?)```/i)

  if (fencedMatch?.[1]) {
    return safeJsonParse(fencedMatch[1].trim())
  }

  return null
}

function extractContentTextBlocks(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (typeof entry === 'string') {
      return [entry]
    }

    if (!entry || typeof entry !== 'object') {
      return []
    }

    const record = entry as Record<string, unknown>

    if (typeof record.text === 'string') {
      return [record.text]
    }

    if (
      record.type === 'output_text' &&
      typeof record.text === 'string'
    ) {
      return [record.text]
    }

    if (record.type === 'tool_result' && typeof record.content === 'string') {
      return [record.content]
    }

    return []
  })
}

function extractClaudeToolInputs(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return []
    }

    const record = entry as Record<string, unknown>

    if (
      record.type === 'tool_use' &&
      record.name === guidedPlanToolName &&
      record.input &&
      typeof record.input === 'object'
    ) {
      return [record.input]
    }

    return []
  })
}

function normalizeGuidedPlanCandidate(
  value: unknown,
  shotCount: BatchSize,
): GuidedAnalysisPlan | null {
  try {
    return normalizeGuidedAnalysisPlan(value, { shotCount })
  } catch {
    return null
  }
}

function readKiePayloadError(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  const code =
    typeof record.code === 'number'
      ? record.code
      : typeof record.code === 'string'
        ? Number.parseInt(record.code, 10)
        : null
  const message =
    typeof record.msg === 'string'
      ? record.msg.trim()
      : typeof record.message === 'string'
        ? record.message.trim()
        : typeof record.error === 'string'
          ? record.error.trim()
          : null

  if (typeof code === 'number' && Number.isFinite(code) && code >= 400) {
    return message || `KIE returned error code ${code}.`
  }

  if (record.success === false) {
    return message || 'KIE returned an unsuccessful analysis response.'
  }

  return null
}

export function parseGuidedAnalysisPayload(
  model: KieAnalysisModel,
  payload: unknown,
  shotCount: BatchSize,
) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('KIE analysis response was not valid JSON.')
  }

  const record = payload as Record<string, unknown>
  const directCandidates = [payload, record.output, record.result, record.json]

  for (const candidate of directCandidates) {
    const normalizedPlan = normalizeGuidedPlanCandidate(candidate, shotCount)

    if (normalizedPlan) {
      return normalizedPlan
    }
  }

  if (isClaudeModel(model)) {
    for (const candidate of extractClaudeToolInputs(record.content)) {
      const normalizedPlan = normalizeGuidedPlanCandidate(candidate, shotCount)

      if (normalizedPlan) {
        return normalizedPlan
      }
    }

    const textContent = extractContentTextBlocks(record.content).join('\n').trim()
    const extracted = textContent ? extractJsonFromText(textContent) : null

    if (extracted) {
      return normalizeGuidedAnalysisPlan(extracted, { shotCount })
    }
  }

  const openAiContent =
    Array.isArray(record.choices) &&
    record.choices[0] &&
    typeof record.choices[0] === 'object'
      ? ((record.choices[0] as Record<string, unknown>).message as
          | Record<string, unknown>
          | undefined)
      : undefined
  const parsedMessageContent = openAiContent
    ? extractContentTextBlocks(openAiContent.content).join('\n').trim()
    : ''
  const directMessagePlan = openAiContent
    ? normalizeGuidedPlanCandidate(openAiContent.content, shotCount)
    : null
  const parsedJson =
    (typeof openAiContent?.content === 'string' && safeJsonParse(openAiContent.content)) ||
    (parsedMessageContent ? extractJsonFromText(parsedMessageContent) : null)

  if (directMessagePlan) {
    return directMessagePlan
  }

  if (parsedJson) {
    return normalizeGuidedAnalysisPlan(parsedJson, { shotCount })
  }

  const claudeTextContent = isClaudeModel(model)
    ? extractContentTextBlocks(record.content).join('\n').trim()
    : ''
  const openAiTextContent = parsedMessageContent
  const fallbackText = claudeTextContent || openAiTextContent

  if (fallbackText) {
    throw new Error(
      `KIE analysis returned unstructured text instead of the guided plan JSON: ${fallbackText.slice(0, 240)}`,
    )
  }

  throw new Error('KIE analysis response did not contain a usable guided plan.')
}

export async function analyzeGuidedProductPlan(input: {
  analysisModel: KieAnalysisModel
  cameraMovement?: CameraMovement | null
  contentConcept: ContentConcept
  heroImageDataUrl?: string | null
  heroImageUrl: string
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
  videoDuration?: VideoDuration
  videoModel?: VideoModelOption
  workspace?: WorkspaceTab
}): Promise<GuidedAnalysisPlan> {
  const apiKey = getKieApiKey()
  const isClaude = isClaudeModel(input.analysisModel)
  const endpoint = isClaude
    ? `${KIE_API_BASE_URL}/claude/v1/messages`
    : `${KIE_API_BASE_URL}/${input.analysisModel}/v1/chat/completions`
  const requestBody = isClaude
    ? buildClaudeAnalysisBody({
        ...input,
        model: input.analysisModel as Extract<
          KieAnalysisModel,
          'claude-sonnet-4-6'
        >,
      })
    : buildGeminiAnalysisBody({
        ...input,
        model: input.analysisModel as Extract<KieAnalysisModel, 'gemini-2.5-flash'>,
      })

  const response = await fetchKieWithTimeout(endpoint, {
    body: JSON.stringify(requestBody),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal:
      input.analysisModel === 'gemini-2.5-flash'
        ? AbortSignal.timeout(GEMINI_GUIDED_ANALYSIS_TIMEOUT_MS)
        : undefined,
  }, 'KIE guided analysis')

  if (!response.ok) {
    throw new Error(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const payloadError = readKiePayloadError(payload)

  if (payloadError) {
    throw new Error(payloadError)
  }

  return parseGuidedAnalysisPayload(input.analysisModel, payload, input.shotCount)
}
