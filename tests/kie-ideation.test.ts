import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildClaudeIdeationBody,
  buildGeminiIdeationBody,
  parseIdeationPayload,
} from '../lib/generation/kie-ideation'

const ideationResult = {
  concepts: [
    {
      angle: 'Clinical proof with confidence payoff.',
      audience: 'First-time skincare buyers in humid climates.',
      cta: 'Try the serum tonight.',
      hook: 'Clear-skin confidence without a heavy finish.',
      keyMessage: 'Fast-absorbing acne care that fits daily use.',
      title: 'Confidence Reset',
      visualDirection: 'Bright vanity routine with close texture shots.',
    },
    {
      angle: 'Desk-to-evening convenience.',
      audience: 'Busy professionals with mid-day oil concerns.',
      cta: 'Make it your daily reset.',
      hook: 'One serum that keeps pace with a long day.',
      keyMessage: 'Reliable wearability and visible calm skin.',
      title: 'Carry Through',
      visualDirection: 'Day-in-the-life transitions and polished handheld moments.',
    },
    {
      angle: 'Creator-trusted recommendation.',
      audience: 'Social shoppers comparing creator-led recommendations.',
      cta: 'See why creators repeat-buy it.',
      hook: 'The serum creators keep in the rotation.',
      keyMessage: 'Trusted by relatable voices, anchored in product texture.',
      title: 'Repeat Buy Signal',
      visualDirection: 'Creator shelf styling with macro product details.',
    },
  ],
  summary:
    'Three strategic directions balancing trust, convenience, and creator-led proof.',
}

describe('parseIdeationPayload', () => {
  it('builds the Gemini ideation payload with a strict no-prose contract', () => {
    const body = buildGeminiIdeationBody({
      briefText: '',
      contentConcept: 'affiliate',
      heroImageUrl: 'https://files.example.com/hero.png',
      model: 'gemini-2.5-flash',
      outputLanguage: 'id',
      productPage: null,
    })
    const systemPrompt = body.messages[0]?.content
    const userContent = body.messages[1]?.content
    const userText = Array.isArray(userContent)
      ? userContent.find((entry) => entry.type === 'text')?.text
      : ''

    expect(systemPrompt).toContain('Do not output markdown, headings, bullets, explanations, or wrapper text.')
    expect(systemPrompt).toContain('Write every human-readable JSON value in Bahasa Indonesia.')
    expect(systemPrompt).toContain('If you cannot comply, still return the closest valid JSON object and nothing else.')
    expect(userText).toContain('Output contract:')
    expect(userText).toContain('"summary": string')
    expect(userText).toContain('"concepts": [')
    expect(userText).toContain('Do not return labels like "Concept 1"')
  })

  it('builds the Claude ideation payload with a strict tool-only contract', () => {
    const body = buildClaudeIdeationBody({
      briefText: '',
      contentConcept: 'affiliate',
      heroImageUrl: 'https://files.example.com/hero.png',
      model: 'claude-sonnet-4-6',
      outputLanguage: 'id',
      productPage: null,
    })

    expect(body.system).toContain('Call the provided tool exactly once with the full ideation brief.')
    expect(body.system).toContain('Write every human-readable tool input value in Bahasa Indonesia.')
    expect(body.system).toContain('Never answer in plain text, XML-like tags, markdown, lists, or commentary.')
    expect(body.system).toContain('Do not emit <tool_calls>')
  })

  it('parses claude tool calls serialized into text content', () => {
    const payload = {
      content: [
        {
          text: `<tool_calls> ${JSON.stringify([
            {
              id: 'toolu_01',
              input: ideationResult,
              name: 'submit_content_ideation_brief',
              type: 'tool_use',
            },
          ])}</tool_calls>`,
          type: 'text',
        },
      ],
      id: 'msg_01',
      model: 'claude-sonnet-4-6',
      role: 'assistant',
      type: 'message',
    }

    expect(parseIdeationPayload('claude-sonnet-4-6', payload)).toEqual(
      ideationResult,
    )
  })
})
