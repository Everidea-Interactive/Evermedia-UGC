import 'server-only'

import type {
  ContentConcept,
  IdeationResult,
  KieAnalysisModel,
} from '@/lib/generation/types'
import { normalizeIdeationResult } from '@/lib/generation/ideation'
import type { ScrapedProductPage } from '@/lib/generation/product-page'
import {
  KIE_API_BASE_URL,
  fetchKieWithTimeout,
  getKieApiKey,
  readKieError,
} from '@/lib/generation/kie'

const ideationResultJsonSchema = {
  additionalProperties: false,
  properties: {
    concepts: {
      items: {
        additionalProperties: false,
        properties: {
          angle: { type: 'string' },
          audience: { type: 'string' },
          cta: { type: 'string' },
          hook: { type: 'string' },
          keyMessage: { type: 'string' },
          title: { type: 'string' },
          visualDirection: { type: 'string' },
        },
        required: [
          'title',
          'audience',
          'angle',
          'hook',
          'keyMessage',
          'visualDirection',
          'cta',
        ],
        type: 'object',
      },
      maxItems: 3,
      minItems: 3,
      type: 'array',
    },
    summary: { type: 'string' },
  },
  required: ['summary', 'concepts'],
  type: 'object',
} as const

const ideationToolName = 'submit_content_ideation_brief'

type KieMessageContentPart =
  | {
      text: string
      type: 'text'
    }
  | {
      image_url: {
        url: string
      }
      type: 'image_url'
    }

function isClaudeModel(model: KieAnalysisModel) {
  return model.startsWith('claude-')
}

function getConceptInstruction(concept: ContentConcept) {
  return concept === 'driven-ads'
    ? 'Bias toward sharper conversion framing, stronger offer positioning, and direct-response angles.'
    : 'Bias toward believable creator-led storytelling, trust-building hooks, and affiliate-style relatability.'
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

function createStructuredOutputContract() {
  return [
    'Output contract:',
    'Return exactly one JSON object with this shape and nothing else:',
    '{',
    '  "summary": string,',
    '  "concepts": [',
    '    {',
    '      "title": string,',
    '      "audience": string,',
    '      "angle": string,',
    '      "hook": string,',
    '      "keyMessage": string,',
    '      "visualDirection": string,',
    '      "cta": string',
    '    },',
    '    { ... },',
    '    { ... }',
    '  ]',
    '}',
    'Do not return labels like "Concept 1", markdown headings, bullets, separators, or explanatory text before or after the JSON object.',
    'Do not wrap the response in code fences.',
  ].join('\n')
}

function createSystemPrompt() {
  return [
    'You are a content strategist for an e-commerce creative studio.',
    'Return only valid structured output that matches the provided schema.',
    'Use whatever evidence is available across the hero image, written brief, and product page context to create strategic content ideation, not generation prompts.',
    'Preserve product identity, brand positioning, product category, and likely buyer intent.',
    'Each concept must feel materially distinct and execution-ready for a creative team.',
    'When the written brief is missing or thin, infer the strongest commercially credible positioning from the available evidence instead of asking for more context.',
    'Prefer concrete buyer motivations, product benefits, and content hooks over generic brand language.',
    'If a structured response schema or tool is available, use it directly and do not wrap the answer in prose.',
    'Do not output markdown, headings, bullets, explanations, or wrapper text.',
    'If you cannot comply, still return the closest valid JSON object and nothing else.',
  ].join(' ')
}

function createClaudeSystemPrompt() {
  return [
    createSystemPrompt(),
    'Call the provided tool exactly once with the full ideation brief.',
    'Do not answer with plain text outside the tool call.',
    'Never answer in plain text, XML-like tags, markdown, lists, or commentary.',
    'Do not emit <tool_calls>, pseudo-XML, or serialized tool arrays as text.',
    'If evidence is limited, make the best supported assumptions and still return the structured result.',
  ].join(' ')
}

function createUserPrompt(input: {
  briefText: string
  contentConcept: ContentConcept
  productPage: ScrapedProductPage | null
}) {
  const trimmedBrief = input.briefText.trim()

  return [
    'Create exactly 3 content concepts for this product.',
    getConceptInstruction(input.contentConcept),
    'Each concept must include a distinct audience, strategic angle, hook, key message, visual direction, and CTA.',
    'Keep the output strategy-oriented and channel-ready, not prompt-engineering-oriented.',
    trimmedBrief
      ? `Written brief: ${trimmedBrief}`
      : 'Written brief: none provided. Infer the strongest strategic directions from the hero image, product page details, category cues, likely buyer anxieties, likely buyer aspirations, and conversion intent.',
    'Optimization rules: make each concept materially different in buyer motivation, messaging stance, and visual execution. Avoid repeating the same hook with minor wording changes.',
    'If the product page context is sparse, use specific but defensible assumptions based on the visible product form factor, branding, and category signals.',
    createStructuredOutputContract(),
    formatProductPageContext(input.productPage),
  ].join('\n')
}

export function buildGeminiIdeationBody(input: {
  briefText: string
  contentConcept: ContentConcept
  heroImageUrl: string | null
  model: Extract<KieAnalysisModel, 'gemini-2.5-flash'>
  productPage: ScrapedProductPage | null
}) {
  const content: KieMessageContentPart[] = [
    {
      text: createUserPrompt(input),
      type: 'text',
    },
  ]

  if (input.heroImageUrl) {
    content.push({
      image_url: {
        url: input.heroImageUrl,
      },
      type: 'image_url' as const,
    })
  }

  return {
    messages: [
      {
        content: createSystemPrompt(),
        role: 'system',
      },
      {
        content,
        role: 'user',
      },
    ],
    model: input.model,
    response_format: {
      json_schema: {
        name: 'ideation_result',
        schema: ideationResultJsonSchema,
        strict: true,
      },
      type: 'json_schema',
    },
    stream: false,
    temperature: 0.5,
  }
}

export function buildClaudeIdeationBody(input: {
  briefText: string
  contentConcept: ContentConcept
  heroImageUrl: string | null
  model: Extract<KieAnalysisModel, 'claude-haiku-4-5' | 'claude-sonnet-4-6'>
  productPage: ScrapedProductPage | null
}) {
  const content: KieMessageContentPart[] = [
    {
      text: createUserPrompt(input),
      type: 'text',
    },
  ]

  if (input.heroImageUrl) {
    content.push({
      image_url: {
        url: input.heroImageUrl,
      },
      type: 'image_url' as const,
    })
  }

  return {
    max_tokens: 2_500,
    messages: [
      {
        content,
        role: 'user',
      },
    ],
    model: input.model,
    stream: false,
    system: createClaudeSystemPrompt(),
    temperature: 0.5,
    tool_choice: {
      name: ideationToolName,
      type: 'tool',
    },
    tools: [
      {
        description:
          'Submit the complete content ideation brief as structured data.',
        input_schema: ideationResultJsonSchema,
        name: ideationToolName,
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

    if (record.type === 'output_text' && typeof record.text === 'string') {
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
      record.name === ideationToolName &&
      record.input &&
      typeof record.input === 'object'
    ) {
      return [record.input]
    }

    return []
  })
}

function extractClaudeToolInputsFromText(value: string): unknown[] {
  const trimmedValue = value.trim()
  const toolCallMatch = trimmedValue.match(
    /<tool_calls>\s*([\s\S]+?)(?:<\/tool_calls>|$)/i,
  )
  const serializedToolCalls = toolCallMatch?.[1]?.trim() ?? trimmedValue
  const parsedToolCalls = safeJsonParse(serializedToolCalls)

  if (!parsedToolCalls) {
    return []
  }

  const records = Array.isArray(parsedToolCalls)
    ? parsedToolCalls
    : [parsedToolCalls]

  return extractClaudeToolInputs(records)
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
    return message || 'KIE returned an unsuccessful ideation response.'
  }

  return null
}

export function parseIdeationPayload(
  model: KieAnalysisModel,
  payload: unknown,
) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('KIE ideation response was not valid JSON.')
  }

  const record = payload as Record<string, unknown>
  const directCandidates = [payload, record.output, record.result, record.json]

  for (const candidate of directCandidates) {
    try {
      return normalizeIdeationResult(candidate)
    } catch {}
  }

  if (isClaudeModel(model)) {
    for (const candidate of extractClaudeToolInputs(record.content)) {
      try {
        return normalizeIdeationResult(candidate)
      } catch {}
    }

    const textContent = extractContentTextBlocks(record.content).join('\n').trim()

    for (const candidate of extractClaudeToolInputsFromText(textContent)) {
      try {
        return normalizeIdeationResult(candidate)
      } catch {}
    }

    const extracted = textContent ? extractJsonFromText(textContent) : null

    if (extracted) {
      return normalizeIdeationResult(extracted)
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
  const parsedJson =
    (typeof openAiContent?.content === 'string' && safeJsonParse(openAiContent.content)) ||
    (parsedMessageContent ? extractJsonFromText(parsedMessageContent) : null)

  if (parsedJson) {
    return normalizeIdeationResult(parsedJson)
  }

  const fallbackText = isClaudeModel(model)
    ? extractContentTextBlocks(record.content).join('\n').trim() || parsedMessageContent
    : parsedMessageContent

  if (fallbackText) {
    throw new Error(
      `KIE ideation returned unstructured text instead of the ideation JSON: ${fallbackText.slice(0, 240)}`,
    )
  }

  throw new Error('KIE ideation response did not contain a usable result.')
}

export async function analyzeContentIdeation(input: {
  analysisModel: KieAnalysisModel
  briefText: string
  contentConcept: ContentConcept
  heroImageUrl: string | null
  productPage: ScrapedProductPage | null
}): Promise<IdeationResult> {
  const apiKey = getKieApiKey()
  const isClaude = isClaudeModel(input.analysisModel)
  const endpoint = isClaude
    ? `${KIE_API_BASE_URL}/claude/v1/messages`
    : `${KIE_API_BASE_URL}/${input.analysisModel}/v1/chat/completions`
  const requestBody = isClaude
    ? buildClaudeIdeationBody({
        ...input,
        model: input.analysisModel as Extract<
          KieAnalysisModel,
          'claude-haiku-4-5' | 'claude-sonnet-4-6'
        >,
      })
    : buildGeminiIdeationBody({
        ...input,
        model: input.analysisModel as Extract<KieAnalysisModel, 'gemini-2.5-flash'>,
      })

  const response = await fetchKieWithTimeout(
    endpoint,
    {
      body: JSON.stringify(requestBody),
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
    'KIE content ideation',
  )

  if (!response.ok) {
    throw new Error(await readKieError(response))
  }

  const payload = (await response.json()) as unknown
  const payloadError = readKiePayloadError(payload)

  if (payloadError) {
    throw new Error(payloadError)
  }

  return parseIdeationPayload(input.analysisModel, payload)
}
