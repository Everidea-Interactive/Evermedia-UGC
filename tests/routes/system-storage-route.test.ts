import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { statfsMock } = vi.hoisted(() => ({
  statfsMock: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  statfs: statfsMock,
  unlink: vi.fn(),
  writeFile: vi.fn(),
}))

import { GET } from '@/app/api/system/storage/route'

describe('GET /api/system/storage', () => {
  beforeEach(() => {
    statfsMock.mockReset()
    vi.stubEnv('MEDIA_STORAGE_DIR', '/var/lib/evermedia-studio/media')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns disk space stats for configured media storage', async () => {
    statfsMock.mockResolvedValue({
      blocks: 1000,
      bfree: 250,
      bsize: 4096,
    })

    const response = await GET()
    const payload = (await response.json()) as {
      free: number
      percentageUsed: number
      total: number
      used: number
    }

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      free: 1024000,
      percentageUsed: 75,
      total: 4096000,
      used: 3072000,
    })
    expect(statfsMock).toHaveBeenCalledWith('/var/lib/evermedia-studio/media')
  })

  it('returns 503 when disk space stats cannot be read', async () => {
    statfsMock.mockRejectedValue(new Error('statfs failed'))

    const response = await GET()
    const payload = (await response.json()) as {
      error: string
    }

    expect(response.status).toBe(503)
    expect(payload).toEqual({
      error: 'Disk space unavailable.',
    })
  })
})
