import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { accessMock } = vi.hoisted(() => ({
  accessMock: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  access: accessMock,
  constants: {
    W_OK: 2,
  },
}))

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  beforeEach(() => {
    accessMock.mockReset()
    accessMock.mockResolvedValue(undefined)
    vi.stubEnv('DATABASE_URL', 'postgres://postgres:postgres@db.example.com:5432/evermedia')
    vi.stubEnv('MEDIA_STORAGE_DIR', '/var/lib/evermedia-studio/media')
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('KIE_API_KEY', 'kie-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('returns 200 when the required VPS deployment dependencies are configured', async () => {
    const response = await GET()
    const payload = (await response.json()) as {
      checks: {
        databaseUrlConfigured: boolean
        kieApiKeyConfigured: boolean
        mediaStorageConfigured: boolean
        mediaStorageWritable: boolean
        supabaseConfigured: boolean
      }
      status: string
    }

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
    expect(payload.checks).toEqual({
      databaseUrlConfigured: true,
      kieApiKeyConfigured: true,
      mediaStorageConfigured: true,
      mediaStorageWritable: true,
      supabaseConfigured: true,
    })
    expect(accessMock).toHaveBeenCalledWith('/var/lib/evermedia-studio/media', 2)
  })

  it('returns 503 when a required deployment dependency is missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('KIE_API_KEY', '')
    accessMock.mockRejectedValue(new Error('not writable'))

    const response = await GET()
    const payload = (await response.json()) as {
      checks: {
        databaseUrlConfigured: boolean
        kieApiKeyConfigured: boolean
        mediaStorageConfigured: boolean
        mediaStorageWritable: boolean
        supabaseConfigured: boolean
      }
      status: string
    }

    expect(response.status).toBe(503)
    expect(payload.status).toBe('degraded')
    expect(payload.checks).toEqual({
      databaseUrlConfigured: false,
      kieApiKeyConfigured: false,
      mediaStorageConfigured: true,
      mediaStorageWritable: false,
      supabaseConfigured: true,
    })
  })
})
