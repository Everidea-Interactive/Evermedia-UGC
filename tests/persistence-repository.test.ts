import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertValues = vi.fn()
const insertReturning = vi.fn()
const selectFrom = vi.fn()
const selectWhere = vi.fn()
const selectOrderBy = vi.fn()
const selectLimit = vi.fn()
const deleteWhere = vi.fn()
const insertMock = vi.fn()
const selectMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/lib/db/client', () => ({
  getDatabase: vi.fn(() => ({
    delete: deleteMock,
    insert: insertMock,
    select: selectMock,
  })),
}))

import {
  createSavedIdeationForUser,
  deleteSavedIdeationForUser,
  listSavedIdeationHistoryForUser,
} from '@/lib/persistence/repository'
import { savedIdeations } from '@/lib/db/schema'

describe('ideation persistence repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    insertMock.mockReturnValue({
      values: insertValues,
    })
    insertValues.mockReturnValue({
      returning: insertReturning,
    })

    selectMock.mockReturnValue({
      from: selectFrom,
    })
    selectFrom.mockReturnValue({
      where: selectWhere,
    })
    selectWhere.mockReturnValue({
      orderBy: selectOrderBy,
      limit: selectLimit,
    })
    deleteMock.mockReturnValue({
      where: deleteWhere,
    })
  })

  it('creates saved ideation records with normalized snapshots and result payloads', async () => {
    insertReturning.mockResolvedValue([
      {
        createdAt: new Date('2026-05-05T00:00:00.000Z'),
        id: 'ideation-1',
        inputSnapshot: {
          analysisModel: 'gemini-2.5-flash',
          briefText: 'Premium acne serum campaign.',
          contentConcept: 'affiliate',
          heroImageName: 'hero.png',
          heroImageUrl: 'https://files.example.com/hero.png',
          productUrl: 'https://example.com/product',
        },
        result: {
          concepts: [
            {
              angle: 'Angle 1',
              audience: 'Audience 1',
              cta: 'CTA 1',
              hook: 'Hook 1',
              keyMessage: 'Message 1',
              title: 'Concept 1',
              visualDirection: 'Visual 1',
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
          summary: 'Saved summary',
        },
        userId: 'user-1',
      },
    ])

    const record = await createSavedIdeationForUser({
      inputSnapshot: {
        analysisModel: 'gemini-2.5-flash',
        briefText: 'Premium acne serum campaign.',
        contentConcept: 'affiliate',
        heroImageName: 'hero.png',
        heroImageUrl: 'https://files.example.com/hero.png',
        productUrl: 'https://example.com/product',
      },
      result: {
        concepts: [
          {
            angle: 'Angle 1',
            audience: 'Audience 1',
            cta: 'CTA 1',
            hook: 'Hook 1',
            keyMessage: 'Message 1',
            title: 'Concept 1',
            visualDirection: 'Visual 1',
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
        summary: 'Saved summary',
      },
      userId: 'user-1',
    })

    expect(insertMock).toHaveBeenCalledWith(savedIdeations)
    expect(record.result.summary).toBe('Saved summary')
    expect(record.inputSnapshot.heroImageName).toBe('hero.png')
  })

  it('lists saved ideation history in descending created order', async () => {
    selectOrderBy.mockResolvedValue([
      {
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
        id: 'ideation-2',
        inputSnapshot: {
          analysisModel: 'gemini-2.5-flash',
          briefText: 'Newer brief',
          contentConcept: 'affiliate',
          heroImageName: 'newer.png',
          heroImageUrl: 'https://files.example.com/newer.png',
          productUrl: 'https://example.com/newer',
        },
        result: {
          concepts: [
            {
              angle: 'Angle 1',
              audience: 'Audience 1',
              cta: 'CTA 1',
              hook: 'Hook 1',
              keyMessage: 'Message 1',
              title: 'Concept 1',
              visualDirection: 'Visual 1',
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
          summary: 'Newest summary',
        },
        userId: 'user-1',
      },
      {
        createdAt: new Date('2026-05-05T09:00:00.000Z'),
        id: 'ideation-1',
        inputSnapshot: {
          analysisModel: 'gemini-2.5-flash',
          briefText: 'Older brief',
          contentConcept: 'driven-ads',
          heroImageName: 'older.png',
          heroImageUrl: 'https://files.example.com/older.png',
          productUrl: 'https://example.com/older',
        },
        result: {
          concepts: [
            {
              angle: 'Angle 1',
              audience: 'Audience 1',
              cta: 'CTA 1',
              hook: 'Hook 1',
              keyMessage: 'Message 1',
              title: 'Concept 1',
              visualDirection: 'Visual 1',
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
          summary: 'Older summary',
        },
        userId: 'user-1',
      },
    ])

    const records = await listSavedIdeationHistoryForUser('user-1')

    expect(records).toHaveLength(2)
    expect(records[0]?.id).toBe('ideation-2')
    expect(records[1]?.id).toBe('ideation-1')
  })

  it('returns an empty ideation history when the saved ideations table is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    selectOrderBy.mockRejectedValueOnce({
      code: '42P01',
      message: 'relation "saved_ideations" does not exist',
    })

    await expect(listSavedIdeationHistoryForUser('user-1')).resolves.toEqual([])
    expect(warnSpy).toHaveBeenCalledOnce()

    warnSpy.mockRestore()
  })

  it('deletes a saved ideation entry owned by the user', async () => {
    selectLimit.mockResolvedValue([
      {
        createdAt: new Date('2026-05-05T09:00:00.000Z'),
        id: 'ideation-1',
        inputSnapshot: {
          analysisModel: 'gemini-2.5-flash',
          briefText: 'Older brief',
          contentConcept: 'driven-ads',
          heroImageName: 'older.png',
          heroImageUrl: 'https://files.example.com/older.png',
          productUrl: 'https://example.com/older',
        },
        result: {
          concepts: [
            {
              angle: 'Angle 1',
              audience: 'Audience 1',
              cta: 'CTA 1',
              hook: 'Hook 1',
              keyMessage: 'Message 1',
              title: 'Concept 1',
              visualDirection: 'Visual 1',
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
          summary: 'Older summary',
        },
        userId: 'user-1',
      },
    ])
    deleteWhere.mockResolvedValue(undefined)

    const deleted = await deleteSavedIdeationForUser({
      ideationId: 'ideation-1',
      userId: 'user-1',
    })

    expect(deleteMock).toHaveBeenCalledWith(savedIdeations)
    expect(deleted?.id).toBe('ideation-1')
  })
})
