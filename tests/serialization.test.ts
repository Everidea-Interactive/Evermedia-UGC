import { describe, expect, it } from 'vitest'

import {
  createGenerationRunState,
  normalizeProjectConfigSnapshot,
} from '../lib/persistence/serialization'
import type { GenerationRunRecord } from '../lib/persistence/types'

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
      videoAudio: 'no-audio',
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
      videoAudio: 'no-audio',
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
      videoAudio: 'no-audio',
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

  it('preserves ideation experience values in normalized snapshots', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      experience: 'ideation',
    })

    expect(snapshot.experience).toBe('ideation')
  })

  it('keeps carousel workspace snapshots with panel draft data', () => {
    // Legacy old-format input to test migration
    const legacyDraft = {
      brief: 'homeless media carousel',
      globalPanelStyle: 'white panel with image on top',
      panels: [
        {
          id: 'panel-1',
          order: 1,
          styleMode: 'inherit',
          styleGenerationEnabled: false,
          stylePrompt: '',
          imageMode: 'manual',
          imagePrompt: '',
          imageAsset: null,
          textMode: 'manual',
          textPrompt: '',
          textValue: 'Panel one',
        },
      ],
    } as never
    const snapshot = normalizeProjectConfigSnapshot({
      activeTab: 'carousel',
      experience: 'manual',
      carouselDraft: legacyDraft,
    })

    expect(snapshot.activeTab).toBe('carousel')
    expect(snapshot.carouselDraft?.panels).toHaveLength(1)
    // Legacy fields migrated to base template
    expect(snapshot.carouselDraft?.baseTemplateMode).toBe('ai')
    expect(snapshot.carouselDraft?.baseTemplatePrompt).toBe('white panel with image on top')
    expect(snapshot.carouselDraft?.panels[0]?.templateMode).toBe('inherit')
    expect(snapshot.carouselDraft?.panels[0]?.templatePrompt).toBe('')
  })

  it('normalizes carousel base template snapshot with new fields', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      activeTab: 'carousel',
      experience: 'manual',
      carouselDraft: {
        baseTemplateMode: 'manual',
        baseTemplatePrompt: 'dark theme with neon accents',
        baseTemplateAsset: null,
        panels: [
          {
            id: 'panel-1',
            order: 1,
            templateMode: 'override',
            templatePrompt: 'bright variant',
            imageMode: 'ai',
            imagePrompt: 'Floating neon product',
            imageAsset: null,
            textMode: 'ai',
            textPrompt: 'Highlight key features',
            textValue: '',
          },
        ],
      },
    })

    expect(snapshot.activeTab).toBe('carousel')
    expect(snapshot.carouselDraft?.baseTemplateMode).toBe('manual')
    expect(snapshot.carouselDraft?.baseTemplatePrompt).toBe('dark theme with neon accents')
    expect(snapshot.carouselDraft?.baseTemplateAsset).toBeNull()
    expect(snapshot.carouselDraft?.panels).toHaveLength(1)
    expect(snapshot.carouselDraft?.panels[0]?.templateMode).toBe('override')
    expect(snapshot.carouselDraft?.panels[0]?.templatePrompt).toBe('bright variant')
  })

  it('falls back invalid persisted model values to defaults', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      imageModel: 'grok-imagine' as never,
      videoModel: 'veo-4' as never,
    })

    expect(snapshot.imageModel).toBe('nano-banana')
    expect(snapshot.videoModel).toBe('veo-3.1')
  })

  it.each(['kling', 'grok-imagine'])(
    'falls back deprecated persisted %s video models to Veo',
    (videoModel) => {
      const snapshot = normalizeProjectConfigSnapshot({
        videoModel: videoModel as never,
      })

      expect(snapshot.videoModel).toBe('veo-3.1')
    },
  )

  it('preserves Seedance 2.0 snapshots during normalization', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      videoModel: 'seedance-2' as never,
    })

    expect(snapshot.videoModel).toBe('seedance-2')
  })
})

describe('createGenerationRunState', () => {
  it('preserves the persisted run experience for client-side output isolation', () => {
    const run: GenerationRunRecord = {
      completedAt: null,
      configSnapshot: normalizeProjectConfigSnapshot({
        activeTab: 'image',
        batchSize: 1,
        cameraMovement: 'orbit',
        creativeStyle: 'tv-commercial',
        experience: 'guided',
        guided: {
          analysisModel: 'gemini-2.5-flash',
          contentConcept: 'affiliate',
          productUrl: '',
          shots: [],
          summary: 'Guided summary',
        },
        imageModel: 'nano-banana',
        outputQuality: '1080p',
        productCategory: 'cosmetics',
        shotEnvironment: 'indoor',
        subjectMode: 'product-only',
        textPrompt: '',
        videoDuration: 'base',
      videoAudio: 'no-audio',
        videoModel: 'veo-3.1',
      }),
      createdAt: '2026-04-30T00:00:00.000Z',
      id: 'run-guided',
      model: 'google/nano-banana',
      promptSnapshot: 'Prompt',
      provider: 'market',
      status: 'success',
      userId: 'user-1',
      variants: [],
      workspace: 'image',
    }

    expect(createGenerationRunState(run, []).experience).toBe('guided')
  })

  it('treats motion-control outputs as video results', () => {
    const run: GenerationRunRecord = {
      completedAt: '2026-06-08T00:00:05.000Z',
      configSnapshot: normalizeProjectConfigSnapshot({
        activeTab: 'motion-control',
        experience: 'manual',
      }),
      createdAt: '2026-06-08T00:00:00.000Z',
      id: 'run-motion-control',
      model: 'kling-3.0/motion-control',
      promptSnapshot: 'Prompt',
      provider: 'market',
      status: 'success',
      userId: 'user-1',
      variants: [
        {
          completedAt: '2026-06-08T00:00:05.000Z',
          createdAt: '2026-06-08T00:00:00.000Z',
          error: null,
          id: 'variant-1',
          profile: 'Variation 1',
          prompt: 'Prompt',
          resultAssetId: 'output-1',
          runId: 'run-motion-control',
          status: 'success',
          taskId: 'task-1',
          variantIndex: 1,
        },
      ],
      workspace: 'motion-control',
    }

    const state = createGenerationRunState(run, [
      {
        createdAt: '2026-06-08T00:00:05.000Z',
        fileSize: 123,
        id: 'output-1',
        label: 'Variation 1 Output',
        mimeType: 'video/mp4',
        originalName: 'task-1.mp4',
        runId: 'run-motion-control',
        storagePath: 'user-1/runs/run-motion-control/outputs/task-1.mp4',
        userId: 'user-1',
      },
    ])

    expect(state.variants[0]?.result).toMatchObject({
      thumbnailUrl: '/api/media/output-1',
      type: 'video',
      url: '/api/media/output-1',
    })
  })
})

