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

  // 1. Base template instruction
  if (draft.baseTemplatePrompt) {
    parts.push(`Base template: ${draft.baseTemplatePrompt}`)
  }

  // 2. Panel-specific template override
  if (panel.templateMode === 'override' && panel.templatePrompt) {
    parts.push(`Panel override: ${panel.templatePrompt}`)
  }

  // 3. Panel image content
  parts.push(panel.imagePrompt)

  // 4. Panel text content (when AI mode)
  if (panel.textMode === 'ai' && panel.textPrompt) {
    parts.push(`Panel text: ${panel.textPrompt}`)
  }

  return parts.join('\n\n')
}

export function collectCarouselPanelReferences(
  panel: CarouselPanelDraft,
  draft: CarouselDraft,
): string[] {
  const references: string[] = []

  // If base template has uploaded image guidance, use it as ordered reference
  if (draft.baseTemplateAsset?.previewUrl) {
    references.push(draft.baseTemplateAsset.previewUrl)
  }

  return references
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
