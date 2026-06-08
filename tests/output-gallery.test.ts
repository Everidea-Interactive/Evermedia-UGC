import { describe, expect, it } from 'vitest'

import { getOutputGalleryItems } from '@/lib/generation/output-gallery'
import type { GenerationRun, GenerationVariant } from '@/lib/generation/types'

function createVariant(
  overrides: Partial<GenerationVariant> = {},
): GenerationVariant {
  return {
    completedAt: '2026-04-30T00:00:00.000Z',
    createdAt: '2026-04-30T00:00:00.000Z',
    error: null,
    index: 1,
    profile: 'Output',
    prompt: 'Prompt',
    result: {
      model: 'nano-banana-2',
      taskId: 'task-1',
      type: 'image',
      url: '/api/media/output-1',
    },
    status: 'success',
    taskId: 'task-1',
    variantId: 'variant-1',
    ...overrides,
  }
}

function createRun(variants: GenerationVariant[]): GenerationRun {
  return {
    completedAt: '2026-04-30T00:00:00.000Z',
    createdAt: '2026-04-30T00:00:00.000Z',
    error: null,
    experience: 'manual',
    model: 'nano-banana-2',
    provider: 'market',
    runId: 'run-1',
    selectedVariantId: 'variant-2',
    startedAt: 0,
    status: 'success',
    variants,
    workspace: 'image',
  }
}

describe('output gallery items', () => {
  it('returns every completed output without promoting the selected variant', () => {
    const items = getOutputGalleryItems(
      createRun([
        createVariant({ index: 1, variantId: 'variant-1' }),
        createVariant({ index: 2, variantId: 'variant-2' }),
        createVariant({
          index: 3,
          result: null,
          status: 'rendering',
          variantId: 'variant-3',
        }),
      ]),
    )

    expect(items.map((item) => item.variantId)).toEqual([
      'variant-1',
      'variant-2',
    ])
  })

  it('marks image and video outputs as inspectable media', () => {
    const items = getOutputGalleryItems(
      createRun([
        createVariant({ index: 1, variantId: 'variant-1' }),
        createVariant({
          index: 2,
          result: {
            model: 'veo3_fast',
            taskId: 'task-2',
            type: 'video',
            url: '/api/media/output-2',
          },
          variantId: 'variant-2',
        }),
      ]),
    )

    expect(items).toEqual([
      expect.objectContaining({
        inspectable: true,
        label: 'Variation 1',
        type: 'image',
      }),
      expect.objectContaining({
        inspectable: true,
        label: 'Variation 2',
        type: 'video',
      }),
    ])
  })
})
