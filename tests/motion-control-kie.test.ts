import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildMotionControlPayload } from '@/lib/generation/kie'

describe('motion control kie payload', () => {
  it('forces character_orientation to video and maps 1080p to pro mode', () => {
    const payload = buildMotionControlPayload({
      prompt: 'Replace the subject and keep bottle visibility high.',
      referenceImageUrl: 'https://cdn.example.com/reference.png',
      motionVideoUrl: 'https://cdn.example.com/motion.mp4',
      resolution: '1080p',
    })

    expect(payload.model).toBe('kling-3.0/motion-control')
    expect(payload.input.character_orientation).toBe('video')
    expect(payload.input.mode).toBe('pro')
    expect(payload.input.input_urls).toEqual(['https://cdn.example.com/reference.png'])
    expect(payload.input.video_urls).toEqual(['https://cdn.example.com/motion.mp4'])
  })
})
