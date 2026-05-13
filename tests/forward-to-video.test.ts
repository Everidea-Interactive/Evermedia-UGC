import { describe, expect, it, vi, afterEach } from 'vitest'

import { fetchForwardedResultFile } from '@/lib/generation/forward-to-video'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchForwardedResultFile', () => {
  it('downloads media and converts it into a File using response metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('image-bytes', {
        headers: {
          'Content-Disposition': 'attachment; filename="forwarded-shot.png"',
          'Content-Type': 'image/png',
        },
        status: 200,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const file = await fetchForwardedResultFile('/api/media/output-123')

    expect(fetchMock).toHaveBeenCalledWith('/api/media/output-123?download=1', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    expect(file.name).toBe('forwarded-shot.png')
    expect(file.type).toBe('image/png')
    expect(file.size).toBeGreaterThan(0)
  })
})
