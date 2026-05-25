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
      canManageAccounts: true,
      email: 'owner@example.com',
      id: 'user-1',
      roles: ['super_admin'],
      status: 'active',
    })
    vi.mocked(deleteSavedIdeationForUser).mockResolvedValue({
      createdAt: '2026-05-12T00:00:00.000Z',
      id: 'ideation-1',
      inputSnapshot: {
        analysisModel: 'gemini-2.5-flash',
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
          {
            angle: 'Angle 2',
            audience: 'Audience 2',
            cta: 'CTA 2',
            hook: 'Hook 2',
            keyMessage: 'Message 2',
            title: 'Concept 2',
            visualDirection: 'Visual 2',
          },
          {
            angle: 'Angle 3',
            audience: 'Audience 3',
            cta: 'CTA 3',
            hook: 'Hook 3',
            keyMessage: 'Message 3',
            title: 'Concept 3',
            visualDirection: 'Visual 3',
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
      canManageAccounts: true,
      email: 'owner@example.com',
      id: 'user-1',
      roles: ['super_admin'],
      status: 'active',
    })
    vi.mocked(deleteSavedIdeationForUser).mockResolvedValue(null)

    const response = await DELETE(new Request('http://localhost/api/ideations/missing'), {
      params: Promise.resolve({ ideationId: 'missing' }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Ideation brief not found' })
  })
})
