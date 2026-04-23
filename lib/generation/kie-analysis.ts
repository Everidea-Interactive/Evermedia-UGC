import 'server-only'

import type {
  BatchSize,
  ContentConcept,
  GuidedAnalysisPlan,
  KieAnalysisModel,
} from '@/lib/generation/types'
import { normalizeGuidedAnalysisPlan } from '@/lib/generation/guided'
import type { ScrapedProductPage } from '@/lib/generation/product-page'
import { KIE_API_BASE_URL, getKieApiKey, readKieError } from '@/lib/generation/kie'

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

  const contextLines = [
    `Product page URL: ${productPage.url}`,
    `Title tag: ${productPage.title ?? 'n/a'}`,
    `Meta description: ${productPage.description ?? 'n/a'}`,
    `OG title: ${productPage.ogTitle ?? 'n/a'}`,
    `OG description: ${productPage.ogDescription ?? 'n/a'}`,
    `JSON-LD product name: ${productPage.jsonLdName ?? 'n/a'}`,
    `Brand: ${productPage.brand ?? 'n/a'}`,
    `Price: ${productPage.price ?? 'n/a'}`,
    `Currency: ${productPage.currency ?? 'n/a'}`,
    `Page images: ${productPage.images.slice(0, 3).join(', ') || 'n/a'}`,
  ]

  return contextLines.join('\n')
}

function createSystemPrompt() {
  return [
    'You are planning product photography prompts for an e-commerce creative studio.',
    'Return only valid structured output that matches the provided schema.',
    'Each shot must be materially distinct, usable as a direct image-generation prompt, and grounded in the uploaded hero product image.',
    'Preserve product identity, color, material, silhouette, and branding.',
    'Do not mention camera model names or unsupported technical jargon.',
    'If a structured response schema or tool is available, use it directly and do not wrap the answer in prose.',
  ].join(' ')
}

function createClaudeSystemPrompt() {
  return [
    createSystemPrompt(),
    'Call the provided tool exactly once with the full guided plan.',
    'The hero product image is always attached in the request.',
    'Product page context may or may not be present; when absent, continue from the hero image alone.',
    'Do not answer with plain text outside the tool call.',
    'If evidence is limited, make the best supported assumptions and still return the structured plan.',
  ].join(' ')
}

function createUserPrompt(input: {
  contentConcept: ContentConcept
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
}) {
  return [
    `Create exactly ${input.shotCount} image-generation shots.`,
    getConceptInstruction(input.contentConcept),
    'Choose the single best productCategory and creativeStyle for the full set.',
    'Use product-only shots when detail, material, or packaging focus is strongest. Use lifestyle only when human interaction would improve conversion.',
    'Each prompt should be generation-ready and specific about composition, styling, product focus, lighting, and conversion intent.',
    'Make the titles short and readable.',
    'Make the slugs lowercase and URL-safe.',
    'Tags should be short production labels such as close-up, hero, lifestyle, detail, texture, full-body, or studio.',
    formatProductPageContext(input.productPage),
  ].join('\n')
}

export function buildGeminiAnalysisBody(input: {
  contentConcept: ContentConcept
  heroImageUrl: string
  model: Extract<KieAnalysisModel, 'gemini-2.5-flash'>
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
}) {
  return {
    messages: [
      {
        content: createSystemPrompt(),
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
              url: input.heroImageUrl,
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
  contentConcept: ContentConcept
  heroImageUrl: string
  model: Extract<KieAnalysisModel, 'claude-haiku-4-5' | 'claude-sonnet-4-6'>
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
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
    system: createClaudeSystemPrompt(),
    temperature: 0.4,
    tool_choice: {
      name: guidedPlanToolName,
      type: 'tool',
    },
    tools: [
      {
        description:
          'Submit the complete guided image-generation plan as structured data.',
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
  contentConcept: ContentConcept
  heroImageUrl: string
  productPage: ScrapedProductPage | null
  shotCount: BatchSize
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
          'claude-haiku-4-5' | 'claude-sonnet-4-6'
        >,
      })
    : buildGeminiAnalysisBody({
        ...input,
        model: input.analysisModel as Extract<KieAnalysisModel, 'gemini-2.5-flash'>,
      })

  const response = await fetch(endpoint, {
    body: JSON.stringify(requestBody),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

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
