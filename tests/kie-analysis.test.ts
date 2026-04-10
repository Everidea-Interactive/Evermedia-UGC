import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  analyzeGuidedProductPlan,
  buildClaudeAnalysisBody,
  buildGeminiAnalysisBody,
  parseGuidedAnalysisPayload,
} from '../lib/generation/kie-analysis'

vi.mock('../lib/generation/kie', () => ({
  KIE_API_BASE_URL: 'https://api.kie.ai',
  getKieApiKey: vi.fn(() => 'test-key'),
  readKieError: vi.fn(async () => 'upstream error'),
}))

const planPayload = {
  creativeStyle: 'tv-commercial',
  productCategory: 'cosmetics',
  shots: [
    {
      prompt: 'Prompt 1',
      shotEnvironment: 'indoor',
      slug: 'shot-1',
      subjectMode: 'product-only',
      tags: ['hero'],
      title: 'Shot 1',
    },
  ],
  summary: 'Guided summary',
}

describe('KIE analysis adapters', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds the Gemini analysis payload with JSON schema output', () => {
    const body = buildGeminiAnalysisBody({
      contentConcept: 'affiliate',
      heroImageUrl: 'https://files.example.com/hero.png',
      model: 'gemini-2.5-flash',
      productPage: null,
      shotCount: 1,
    })

    expect(body.model).toBe('gemini-2.5-flash')
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: expect.objectContaining({
        name: 'guided_analysis_plan',
        schema: expect.any(Object),
      }),
    })
    expect(body.messages[1]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
        }),
      ]),
    )
  })

  it('builds the Claude analysis payload with tool calling', () => {
    const body = buildClaudeAnalysisBody({
      contentConcept: 'driven-ads',
      heroImageUrl: 'https://files.example.com/hero.png',
      model: 'claude-haiku-4-5',
      productPage: null,
      shotCount: 2,
    })

    expect(body.model).toBe('claude-haiku-4-5')
    expect(body.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          input_schema: expect.any(Object),
          name: 'submit_guided_analysis_plan',
        }),
      ]),
    )
    expect(body.messages[0]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
        }),
      ]),
    )
  })

  it('parses direct schema-shaped Gemini responses into a guided plan', () => {
    const plan = parseGuidedAnalysisPayload('gemini-2.5-flash', planPayload, 1)

    expect(plan.summary).toBe('Guided summary')
    expect(plan.shots[0]?.title).toBe('Shot 1')
  })

  it('parses Gemini chat-completions responses into a guided plan', () => {
    const plan = parseGuidedAnalysisPayload(
      'gemini-2.5-flash',
      {
        choices: [
          {
            message: {
              content: JSON.stringify(planPayload),
            },
          },
        ],
      },
      1,
    )

    expect(plan.summary).toBe('Guided summary')
    expect(plan.shots[0]?.title).toBe('Shot 1')
  })

  it('parses Claude message responses into a guided plan', () => {
    const plan = parseGuidedAnalysisPayload(
      'claude-sonnet-4-6',
      {
        content: [
          {
            input: planPayload,
            name: 'submit_guided_analysis_plan',
            type: 'tool_use',
          },
        ],
      },
      1,
    )

    expect(plan.productCategory).toBe('cosmetics')
    expect(plan.shots[0]?.slug).toBe('shot-1')
  })

  it('uses the model-specific Gemini endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(planPayload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    )

    await analyzeGuidedProductPlan({
      analysisModel: 'gemini-2.5-flash',
      contentConcept: 'affiliate',
      heroImageUrl: 'https://files.example.com/hero.png',
      productPage: null,
      shotCount: 1,
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.kie.ai/gemini-2.5-flash/v1/chat/completions',
      expect.any(Object),
    )
  })

  it('uses the Claude messages endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              input: planPayload,
              name: 'submit_guided_analysis_plan',
              type: 'tool_use',
            },
          ],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )

    await analyzeGuidedProductPlan({
      analysisModel: 'claude-sonnet-4-6',
      contentConcept: 'affiliate',
      heroImageUrl: 'https://files.example.com/hero.png',
      productPage: null,
      shotCount: 1,
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.kie.ai/claude/v1/messages',
      expect.any(Object),
    )
  })

  it('throws when KIE returns an application-level error payload with HTTP 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 422,
          msg: 'response_format.json_schema is required',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )

    await expect(
      analyzeGuidedProductPlan({
        analysisModel: 'gemini-2.5-flash',
        contentConcept: 'affiliate',
        heroImageUrl: 'https://files.example.com/hero.png',
        productPage: null,
        shotCount: 1,
      }),
    ).rejects.toThrow('response_format.json_schema is required')
  })

  it('still parses Claude text responses when the model returns JSON in text blocks', () => {
    const plan = parseGuidedAnalysisPayload(
      'claude-sonnet-4-6',
      {
        content: [
          {
            text: JSON.stringify(planPayload),
            type: 'text',
          },
        ],
      },
      1,
    )

    expect(plan.productCategory).toBe('cosmetics')
    expect(plan.shots[0]?.slug).toBe('shot-1')
  })
})
