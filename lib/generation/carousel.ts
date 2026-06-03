import type {
  CarouselDraft,
  CarouselPanelDraft,
  GenerationVariant,
  GenerationVariantIndex,
  RunSubmissionResponse,
} from '@/lib/generation/types'

export type CarouselVariantResult = {
  type: 'manual' | 'ai'
  panelId: string
  order: number
  prompt: string
  taskId: string | null
}

export function buildCarouselPanelPrompt(
  panel: CarouselPanelDraft,
  draft: CarouselDraft,
): string {
  const parts: string[] = []

  if (draft.brief) {
    parts.push(draft.brief)
  }

  if (draft.globalPanelStyle) {
    parts.push(`Style: ${draft.globalPanelStyle}`)
  }

  if (panel.styleMode === 'override' && panel.stylePrompt) {
    parts.push(`Panel style: ${panel.stylePrompt}`)
  }

  parts.push(panel.imagePrompt)

  return parts.join('\n\n')
}

export function collectCarouselPanelReferences(
  _panel: CarouselPanelDraft,
): string[] {
  void _panel
  return []
}

export function buildCarouselVariants(
  submissions: CarouselVariantResult[],
  runId: string,
): RunSubmissionResponse {
  const variants: GenerationVariant[] = submissions.map((sub) => ({
    completedAt: null,
    createdAt: null,
    error: null,
    index: sub.order as GenerationVariantIndex,
    profile: `Panel ${sub.order}`,
    prompt: sub.prompt,
    result: null,
    status: 'rendering' as const,
    taskId: sub.taskId,
    variantId: `${runId}-variant-${sub.order}`,
  }))

  return {
    completedAt: null,
    createdAt: new Date().toISOString(),
    model: 'nano-banana-2',
    provider: 'market',
    runId,
    status: 'rendering',
    variants,
    workspace: 'carousel',
  }
}
