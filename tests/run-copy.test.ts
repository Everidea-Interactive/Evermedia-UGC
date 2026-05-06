import { describe, expect, it } from 'vitest'

import {
  getGenerateButtonLabel,
  getGenerationFailureNotice,
  getGenerationHelperMessage,
  getRunBodyCopy,
} from '@/lib/generation/run-copy'
import type { GenerationRun } from '@/lib/generation/types'

function createRun(
  overrides: Partial<GenerationRun> = {},
): GenerationRun {
  return {
    completedAt: null,
    createdAt: null,
    error: null,
    model: 'google/nano-banana',
    provider: 'market',
    runId: 'run-1',
    selectedVariantId: null,
    startedAt: 0,
    status: 'idle',
    variants: [],
    workspace: 'image',
    ...overrides,
  }
}

describe('run copy helpers', () => {
  it('keeps terminal CTA labels neutral', () => {
    expect(
      getGenerateButtonLabel(createRun({ status: 'partial-success' }), 2),
    ).toBe('Generate Again')
    expect(getGenerateButtonLabel(createRun({ status: 'error' }), 2)).toBe(
      'Generate Again',
    )
    expect(getGenerateButtonLabel(createRun({ status: 'cancelled' }), 2)).toBe(
      'Generate Again',
    )
    expect(getGenerateButtonLabel(createRun({ status: 'success' }), 2)).toBe(
      'Generate Again',
    )
  })

  it('keeps submit-time errors on a fresh session actionable', () => {
    const run = createRun({
      error: 'Unable to start generation.',
      runId: null,
      status: 'error',
      variants: [],
    })

    expect(getGenerateButtonLabel(run, 2)).toBe('Generate 2 Variations')
    expect(getGenerationHelperMessage(null, run)).toBe(
      'Unable to start generation.',
    )
  })

  it('uses library-oriented guidance for cancelled and failed runs', () => {
    expect(
      getGenerationHelperMessage(null, createRun({ status: 'cancelled' })),
    ).toContain('library')

    expect(
      getGenerationHelperMessage(
        null,
        createRun({
          error: 'Provider rejected every variation.',
          status: 'error',
          variants: [
            {
              completedAt: null,
              createdAt: null,
              error: 'Provider rejected every variation.',
              index: 1,
              profile: 'Hero angle',
              prompt: 'Prompt 1',
              result: null,
              status: 'error',
              taskId: null,
              variantId: 'variant-1',
            },
          ],
        }),
      ),
    ).toContain('Provider rejected every variation.')
  })

  it('describes partial-success and error bodies in terms of saved outputs', () => {
    const partialBody = getRunBodyCopy(
      createRun({
        status: 'partial-success',
        variants: [
          {
            completedAt: null,
            createdAt: null,
            error: null,
            index: 1,
            profile: 'Hero angle',
            prompt: 'Prompt 1',
            result: {
              model: 'google/nano-banana',
              taskId: 'task-1',
              type: 'image',
              url: 'https://example.com/1.png',
            },
            status: 'success',
            taskId: 'task-1',
            variantId: 'variant-1',
          },
          {
            completedAt: null,
            createdAt: null,
            error: 'Second variation failed.',
            index: 2,
            profile: 'Alternate angle',
            prompt: 'Prompt 2',
            result: null,
            status: 'error',
            taskId: 'task-2',
            variantId: 'variant-2',
          },
        ],
      }),
    )

    expect(partialBody).toContain('saved automatically')

    const errorBody = getRunBodyCopy(
      createRun({
        error: null,
        status: 'error',
        variants: [
          {
            completedAt: null,
            createdAt: null,
            error: 'Provider rejected the batch.',
            index: 1,
            profile: 'Hero angle',
            prompt: 'Prompt 1',
            result: null,
            status: 'error',
            taskId: null,
            variantId: 'variant-1',
          },
        ],
      }),
    )

    expect(errorBody).toContain('generate again')
  })

  it('extracts provider payload errors into a cleaner failure notice', () => {
    const notice = getGenerationFailureNotice(
      'KIE file upload did not return a usable remote URL. payload={"success":false,"code":401,"msg":"Authentication failed: Free users can upload up to 30 files within 30 days"}',
    )

    expect(notice.title).toBe('Generation blocked by provider limits')
    expect(notice.message).toBe(
      'Authentication failed: Free users can upload up to 30 files within 30 days (code 401)',
    )
    expect(notice.detail).toBe('KIE file upload did not return a usable remote URL.')
  })

  it('returns a generic failure notice when no payload metadata exists', () => {
    const notice = getGenerationFailureNotice('Unable to start generation.')

    expect(notice.title).toBe('Generation failed')
    expect(notice.message).toBe('Unable to start generation.')
    expect(notice.detail).toBeNull()
  })
})
