import { describe, expect, it } from 'vitest'

import {
  formatIdeationConceptCardText,
  formatIdeationResultText,
  normalizeIdeationInputSnapshot,
  normalizeIdeationResult,
} from '../lib/generation/ideation'

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

describe('normalizeIdeationResult', () => {
  it('accepts a valid strict three-card ideation result', () => {
    const result = normalizeIdeationResult(ideationResult)

    expect(result.summary).toContain('Three strategic directions')
    expect(result.concepts).toHaveLength(3)
    expect(result.concepts[0].title).toBe('Confidence Reset')
  })

  it('rejects malformed ideation card counts', () => {
    expect(() =>
      normalizeIdeationResult({
        ...ideationResult,
        concepts: ideationResult.concepts.slice(0, 2),
      }),
    ).toThrow('instead of 3')
  })

  it('rejects cards missing required fields', () => {
    expect(() =>
      normalizeIdeationResult({
        ...ideationResult,
        concepts: [
          { ...ideationResult.concepts[0], cta: '' },
          ideationResult.concepts[1],
          ideationResult.concepts[2],
        ],
      }),
    ).toThrow('instead of 3')
  })
})

describe('normalizeIdeationInputSnapshot', () => {
  it('accepts valid persisted ideation input metadata', () => {
    expect(
      normalizeIdeationInputSnapshot({
        analysisModel: 'gemini-2.5-flash',
        briefText: 'Premium acne serum campaign brief.',
        contentConcept: 'affiliate',
        heroImageName: 'hero.png',
        heroImageUrl: 'https://files.example.com/hero.png',
        productUrl: 'https://example.com/product',
      }),
    ).toMatchObject({
      analysisModel: 'gemini-2.5-flash',
      contentConcept: 'affiliate',
    })
  })

  it('accepts missing brief text in persisted ideation input metadata', () => {
    expect(
      normalizeIdeationInputSnapshot({
        analysisModel: 'gemini-2.5-flash',
        briefText: '',
        contentConcept: 'affiliate',
        heroImageName: 'hero.png',
        heroImageUrl: 'https://files.example.com/hero.png',
        productUrl: 'https://example.com/product',
      }),
    ).toMatchObject({
      analysisModel: 'gemini-2.5-flash',
      briefText: '',
      contentConcept: 'affiliate',
    })
  })

  it('accepts link-only ideation input metadata', () => {
    expect(
      normalizeIdeationInputSnapshot({
        analysisModel: 'gemini-2.5-flash',
        briefText: 'Link-only brief.',
        contentConcept: 'affiliate',
        heroImageName: null,
        heroImageUrl: null,
        productUrl: 'https://example.com/product',
      }),
    ).toMatchObject({
      heroImageName: null,
      heroImageUrl: null,
      productUrl: 'https://example.com/product',
    })
  })

  it('accepts image-only ideation input metadata', () => {
    expect(
      normalizeIdeationInputSnapshot({
        analysisModel: 'gemini-2.5-flash',
        briefText: 'Image-only brief.',
        contentConcept: 'affiliate',
        heroImageName: 'hero.png',
        heroImageUrl: 'https://files.example.com/hero.png',
        productUrl: null,
      }),
    ).toMatchObject({
      heroImageName: 'hero.png',
      heroImageUrl: 'https://files.example.com/hero.png',
      productUrl: null,
    })
  })

  it('rejects ideation input metadata when both hero image and product URL are missing', () => {
    expect(
      normalizeIdeationInputSnapshot({
        analysisModel: 'gemini-2.5-flash',
        briefText: '',
        contentConcept: 'affiliate',
        heroImageName: null,
        heroImageUrl: null,
        productUrl: null,
      }),
    ).toBeNull()
  })
})

describe('ideation copy formatting', () => {
  it('formats a single concept card for copy actions', () => {
    const text = formatIdeationConceptCardText(ideationResult.concepts[0], 0)

    expect(text).toContain('Concept 1: Confidence Reset')
    expect(text).toContain('Visual direction: Bright vanity routine')
  })

  it('formats the full ideation brief for copy actions', () => {
    const text = formatIdeationResultText(normalizeIdeationResult(ideationResult))

    expect(text).toContain('Ideation Brief')
    expect(text).toContain('Summary: Three strategic directions')
    expect(text).toContain('Concept 3: Repeat Buy Signal')
  })
})
