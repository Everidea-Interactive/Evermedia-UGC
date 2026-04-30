import { describe, expect, it } from 'vitest'

import { isRunVisibleForExperience } from '@/lib/generation/run-visibility'
import type { GenerationRun } from '@/lib/generation/types'

const baseRun: GenerationRun = {
  completedAt: null,
  createdAt: null,
  error: null,
  experience: 'manual',
  model: 'google/nano-banana',
  provider: 'market',
  runId: 'run-1',
  selectedVariantId: null,
  startedAt: 1,
  status: 'success',
  variants: [],
  workspace: 'image',
}

describe('generation run visibility', () => {
  it('keeps manual output panels isolated from guided runs in the same workspace', () => {
    const guidedImageRun: GenerationRun = {
      ...baseRun,
      experience: 'guided',
      runId: 'guided-run',
    }

    expect(isRunVisibleForExperience(guidedImageRun, 'manual', 'image')).toBe(false)
    expect(isRunVisibleForExperience(guidedImageRun, 'guided', 'image')).toBe(true)
  })

  it('keeps guided result panels isolated from manual runs in the same workspace', () => {
    expect(isRunVisibleForExperience(baseRun, 'guided', 'image')).toBe(false)
    expect(isRunVisibleForExperience(baseRun, 'manual', 'image')).toBe(true)
  })

  it('does not show runs from a different image or video workspace', () => {
    expect(isRunVisibleForExperience(baseRun, 'manual', 'video')).toBe(false)
  })
})
