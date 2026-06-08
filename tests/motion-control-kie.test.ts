import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildMotionControlPayload, getTaskStatus } from '@/lib/generation/kie'

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
    expect(payload.input.mode).toBe('1080p')
    expect(payload.input.input_urls).toEqual(['https://cdn.example.com/reference.png'])
    expect(payload.input.video_urls).toEqual(['https://cdn.example.com/motion.mp4'])
  })

  it('returns video results for motion-control task payloads', async () => {
    process.env.KIE_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              resultJson: JSON.stringify({
                resultUrls: ['https://cdn.example.com/motion-output.mp4'],
              }),
              state: 'success',
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      ),
    )

    const result = await getTaskStatus({
      model: 'kling-3.0/motion-control',
      provider: 'market',
      taskId: 'task-1',
      workspace: 'motion-control',
    })

    expect(result.status).toBe('success')
    expect(result.result?.type).toBe('video')
  })
})
