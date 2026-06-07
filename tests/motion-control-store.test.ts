import { beforeEach, describe, expect, it } from 'vitest'

import { useGenerationStore } from '@/store/use-generation-store'

describe('motion control store', () => {
  beforeEach(() => {
    useGenerationStore.getState().resetGenerationState()
  })

  it('creates a default motion control draft and keeps it isolated from normal video refs', () => {
    const state = useGenerationStore.getState()

    expect(state.motionControl.preset).toBe('character-product')
    expect(state.motionControl.additionalInstructions).toBe('')
    expect(state.motionControl.referenceImage.file).toBeNull()
    expect(state.motionControl.motionVideo.file).toBeNull()
    expect(state.videoReferences.every((slot) => slot.file === null)).toBe(true)
  })

  it('allows manual mode to switch into motion control workspace tab', () => {
    const store = useGenerationStore.getState()

    store.setExperience('manual')
    store.setActiveTab('motion-control')

    expect(useGenerationStore.getState().experience).toBe('manual')
    expect(useGenerationStore.getState().activeTab).toBe('motion-control')
  })
})
