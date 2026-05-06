import { describe, expect, it } from 'vitest'

import { normalizeProjectConfigSnapshot } from '../lib/persistence/serialization'

describe('normalizeProjectConfigSnapshot', () => {
  it('backfills missing preset fields for older snapshots', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      activeTab: 'image',
      batchSize: 1,
      cameraMovement: 'orbit',
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      subjectMode: 'lifestyle',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
    })

    expect(snapshot.shotEnvironment).toBe('indoor')
    expect(snapshot.characterGender).toBe('any')
    expect(snapshot.characterAgeGroup).toBe('any')
    expect(snapshot.figureArtDirection).toBe('none')
    expect(snapshot.experience).toBe('manual')
    expect(snapshot.guided).toBeNull()
  })

  it('resets lifestyle-only fields for product-only snapshots', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      activeTab: 'image',
      batchSize: 1,
      cameraMovement: 'orbit',
      characterAgeGroup: 'young-adult',
      characterGender: 'female',
      creativeStyle: 'ugc-lifestyle',
      figureArtDirection: 'curvaceous-editorial',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'outdoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
    })

    expect(snapshot.shotEnvironment).toBe('outdoor')
    expect(snapshot.characterGender).toBe('any')
    expect(snapshot.characterAgeGroup).toBe('any')
    expect(snapshot.figureArtDirection).toBe('none')
  })

  it('normalizes guided snapshot metadata when present', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      activeTab: 'image',
      batchSize: 2,
      cameraMovement: 'orbit',
      creativeStyle: 'tv-commercial',
      experience: 'guided',
      guided: {
        analysisModel: 'gemini-2.5-flash',
        creativeBrief: {
          audience: 'broad',
          goal: 'conversion',
          platform: 'tiktok',
          productHighlights: 'Hydrating finish',
          tone: 'clean and confident',
        },
        creativePlan: {
          ctaOptions: [
            {
              id: 'cta-shop-now',
              label: 'Shop now',
              placement: 'closing-shot',
              rationale: 'Direct close',
            },
          ],
          environmentDirectionSummary: 'Use a clean vanity environment.',
          messageAngle: 'Lead with trust and visible payoff.',
          selectedCtaId: 'cta-shop-now',
          soundDirectionSummary: 'Use soft but punchy beauty-friendly accents.',
          storyboard: [
            {
              ctaText: 'Shop now',
              durationSeconds: 4,
              environmentPrompt: 'Clean vanity with soft light.',
              objective: 'Hook the viewer quickly.',
              prompt: 'Hook render prompt',
              renderPrompt: 'Hook render prompt',
              shotEnvironment: 'indoor',
              slug: 'hero-shot',
              soundPrompt: 'Soft impact cue.',
              subjectMode: 'product-only',
              tags: ['hook'],
              title: 'Hero Shot',
              visualPrompt: 'Tight product framing.',
              voiceoverLine: 'Start with the fastest proof point.',
            },
          ],
          visualDirectionSummary: 'Favor trust-building creator framing.',
          voiceoverScript: 'Start with the fastest proof point.',
        },
        contentConcept: 'driven-ads',
        productUrl: 'https://example.com/product',
        shots: [
          {
            prompt: 'Prompt 1',
            shotEnvironment: 'indoor',
            slug: 'hero-shot',
            subjectMode: 'product-only',
            tags: ['hero'],
            title: 'Hero Shot',
          },
        ],
        summary: 'Summary',
      },
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      shotEnvironment: 'indoor',
      subjectMode: 'product-only',
      textPrompt: '',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
    })

    expect(snapshot.experience).toBe('guided')
    expect(snapshot.guided).toMatchObject({
      analysisModel: 'gemini-2.5-flash',
      creativeBrief: {
        audience: 'broad',
        goal: 'conversion',
      },
      creativePlan: {
        selectedCtaId: 'cta-shop-now',
      },
      contentConcept: 'driven-ads',
      productUrl: 'https://example.com/product',
      summary: 'Summary',
    })
    expect(snapshot.guided?.creativePlan?.storyboard[0]?.renderPrompt).toBe(
      'Hook render prompt',
    )
  })
})
