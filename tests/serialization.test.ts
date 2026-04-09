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
    expect(snapshot.characterEthnicity).toBe('any')
    expect(snapshot.figureArtDirection).toBe('none')
  })

  it('resets lifestyle-only fields for product-only snapshots', () => {
    const snapshot = normalizeProjectConfigSnapshot({
      activeTab: 'image',
      batchSize: 1,
      cameraMovement: 'orbit',
      characterAgeGroup: 'young-adult',
      characterEthnicity: 'south-asian',
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
    expect(snapshot.characterEthnicity).toBe('any')
    expect(snapshot.figureArtDirection).toBe('none')
  })
})
