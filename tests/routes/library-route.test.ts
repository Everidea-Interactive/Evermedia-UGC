import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/auth/access-repository', () => ({
  listManagedAccountEmailsByUserId: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  listSavedIdeationHistory: vi.fn(),
  listSavedOutputHistory: vi.fn(),
}))

import { listManagedAccountEmailsByUserId } from '@/lib/auth/access-repository'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  listSavedIdeationHistory,
  listSavedOutputHistory,
} from '@/lib/persistence/repository'
import { GET } from '@/app/api/library/route'

describe('GET /api/library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns the full shared library for authenticated users', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'viewer-1',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(listManagedAccountEmailsByUserId).mockResolvedValue(
      new Map([['owner-1', 'owner-1@example.com']]),
    )
    vi.mocked(listSavedIdeationHistory).mockResolvedValue([
      {
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
        ownerEmail: null,
        userId: 'owner-1',
      },
    ])
    vi.mocked(listSavedOutputHistory).mockResolvedValue([
      {
        output: {
          createdAt: '2026-05-12T00:00:00.000Z',
          fileSize: 1024,
          id: 'output-1',
          label: 'Output 1',
          mimeType: 'image/png',
          ownerEmail: null,
          originalName: 'output-1.png',
          runId: 'run-1',
          storagePath: 'owner-1/runs/run-1/outputs/output-1.png',
          userId: 'owner-1',
        },
        run: {
          completedAt: null,
          createdAt: '2026-05-12T00:00:00.000Z',
          id: 'run-1',
          model: 'model-a',
          promptSnapshot: 'Prompt',
          provider: 'market',
          status: 'success',
          workspace: 'image',
        },
        variant: {
          completedAt: '2026-05-12T00:00:05.000Z',
          createdAt: '2026-05-12T00:00:00.000Z',
          error: null,
          id: 'variant-1',
          profile: 'Profile',
          prompt: 'Prompt',
          status: 'success',
          taskId: 'task-1',
          variantIndex: 1,
        },
      },
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(listManagedAccountEmailsByUserId).toHaveBeenCalledWith()
    expect(listSavedIdeationHistory).toHaveBeenCalledWith()
    expect(listSavedOutputHistory).toHaveBeenCalledWith()
    await expect(response.json()).resolves.toMatchObject({
      ideations: [{ ownerEmail: 'owner-1@example.com', userId: 'owner-1' }],
      outputs: [{ output: { ownerEmail: 'owner-1@example.com', userId: 'owner-1' } }],
    })
  })
})
