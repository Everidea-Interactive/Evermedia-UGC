import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  deleteSavedIdeationForUser: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { deleteSavedIdeationForUser } from '@/lib/persistence/repository'
import { DELETE } from '@/app/api/ideations/[ideationId]/route'

describe('DELETE /api/ideations/[ideationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue(null)

    const response = await DELETE(new Request('http://localhost/api/ideations/ideation-1'), {
      params: Promise.resolve({ ideationId: 'ideation-1' }),
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('deletes an owned ideation brief', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      email: 'owner@example.com',
      id: 'user-1',
    })
    vi.mocked(deleteSavedIdeationForUser).mockResolvedValue({
      createdAt: '2026-05-12T00:00:00.000Z',
      id: 'ideation-1',
      inputSnapshot: {
        analysisModel: 'KIE-ai',
        briefText: 'Brief',
        contentConcept: 'affiliate',
        contentFormat: 'photos',
        heroImageName: null,
        heroImageUrl: null,
        outputLanguage: 'en',
        productUrl: null,
      },
      result: {
        concepts: [
          {
            angle: 'Angle',
            audience: 'Audience',
            cta: 'CTA',
            hook: 'Hook',
            keyMessage: 'Message',
            title: 'Concept 1',
            visualDirection: 'Visual',
          },
        ],
        summary: 'Summary',
      },
      userId: 'user-1',
    })

    const response = await DELETE(new Request('http://localhost/api/ideations/ideation-1'), {
      params: Promise.resolve({ ideationId: 'ideation-1' }),
    })

    expect(response.status).toBe(200)
    expect(deleteSavedIdeationForUser).toHaveBeenCalledWith({
      ideationId: 'ideation-1',
      userId: 'user-1',
    })
    await expect(response.json()).resolves.toEqual({ ideationId: 'ideation-1' })
  })

  it('returns 404 when ideation brief is missing', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      email: 'owner@example.com',
      id: 'user-1',
    })
    vi.mocked(deleteSavedIdeationForUser).mockResolvedValue(null)

    const response = await DELETE(new Request('http://localhost/api/ideations/missing'), {
      params: Promise.resolve({ ideationId: 'missing' }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Ideation brief not found' })
  })
})
