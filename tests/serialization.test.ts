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
      contentConcept: 'driven-ads',
      productUrl: 'https://example.com/product',
      summary: 'Summary',
    })
  })

  it('preserves ideation experience values in normalized snapshots', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      experience: 'ideation',
    })

    expect(snapshot.experience).toBe('ideation')
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
})

