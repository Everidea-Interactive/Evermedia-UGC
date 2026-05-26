import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/media/storage', () => ({
  readStoredFileBuffer: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  getSavedOutput: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { readStoredFileBuffer } from '@/lib/media/storage'
import { getSavedOutput } from '@/lib/persistence/repository'
import { GET } from '@/app/api/media/[assetId]/route'

describe('GET /api/media/[assetId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/media/output-1'), {
      params: Promise.resolve({ assetId: 'output-1' }),
    })

    expect(response.status).toBe(401)
    await expect(response.text()).resolves.toBe('Unauthorized')
  })

  it('serves saved media across users for authenticated viewers', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'viewer@example.com',
      id: 'viewer-1',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(getSavedOutput).mockResolvedValue({
      createdAt: '2026-05-12T00:00:00.000Z',
      fileSize: 12,
      id: 'output-1',
      label: 'Output 1',
      mimeType: 'image/png',
      originalName: 'output-1.png',
      runId: 'run-1',
      storagePath: 'owner-1/runs/run-1/outputs/output-1.png',
      userId: 'owner-1',
    })
    vi.mocked(readStoredFileBuffer).mockResolvedValue(Buffer.from('image-bytes'))

    const response = await GET(new Request('http://localhost/api/media/output-1?download=1'), {
      params: Promise.resolve({ assetId: 'output-1' }),
    })

    expect(response.status).toBe(200)
    expect(getSavedOutput).toHaveBeenCalledWith('output-1')
    expect(readStoredFileBuffer).toHaveBeenCalledWith(
      'owner-1/runs/run-1/outputs/output-1.png',
    )
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="output-1.png"',
    )
  })
})
