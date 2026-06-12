import { beforeEach, describe, expect, it } from 'vitest'

import { useGenerationStore } from '@/store/use-generation-store'

describe('motion control store', () => {
  beforeEach(() => {
    useGenerationStore.getState().resetGenerationState()
  })

  it('creates a default motion control draft and keeps it isolated from normal video refs', () => {
    const state = useGenerationStore.getState()

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

  it('updates motion control preset and additional instructions independently', () => {
    const store = useGenerationStore.getState()

    store.setMotionControlAdditionalInstructions('Keep the new bottle centered.')
    store.setMotionControlMotionVideoDuration(5.257)

    const nextState = useGenerationStore.getState()

    expect(nextState.motionControl.additionalInstructions).toBe('Keep the new bottle centered.')
    expect(nextState.motionControl.motionVideo.durationSeconds).toBe(5.257)
  })

  it('restores the motion control workspace from a saved config snapshot', () => {
    useGenerationStore.getState().hydrateProjectConfig({
      activeTab: 'motion-control',
      experience: 'manual',
      motionControl: {
        additionalInstructions: 'Keep it premium.',
        resolution: '720p',
      },
    } as never)

    const state = useGenerationStore.getState()

    expect(state.activeTab).toBe('motion-control')
    expect(state.motionControl.additionalInstructions).toBe('Keep it premium.')
    expect(state.motionControl.resolution).toBe('720p')
  })
})
