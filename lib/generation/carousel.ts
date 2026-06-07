import { imageGridPromptInstruction } from '@/lib/media/image-grid'
import {
  buildCurrentDateContextLine,
} from '@/lib/generation/date-context'
import type {
  CarouselDraft,
  CarouselPanelDraft,
  GenerationVariant,
  GenerationVariantIndex,
  RunSubmissionResponse,
} from '@/lib/generation/types'

const gridSlotLabels = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

export type CarouselBatchSubmissionResult = {
  panels: CarouselPanelDraft[]
  prompt: string
  taskId: string | null
}

function buildPanelInstruction(
  panel: CarouselPanelDraft | null,
  index: number,
  input: {
    hasBaseTemplateImage: boolean
    manualImageReferenceIndexByPanelId: Map<string, number>
  },
) {
  const slotLabel = gridSlotLabels[index]

  if (!panel) {
    return [
      `Slot ${index + 1} (${slotLabel}): hidden style anchor only.`,
      'Keep same campaign art direction, palette, lighting, and layout system as active panels.',
      'No unique sales message. This slot is for hidden consistency support and will not be exported.',
    ].join(' ')
  }

  const parts = [`Slot ${index + 1} (${slotLabel}): export panel.`]

  if (panel.templateMode === 'override' && panel.templatePrompt) {
    parts.push(`Template override: ${panel.templatePrompt}`)
  }

  if (panel.imageMode === 'manual') {
    const referenceIndex = input.manualImageReferenceIndexByPanelId.get(panel.id)
    parts.push(
      referenceIndex
        ? `Use uploaded panel image reference ${referenceIndex} as primary content source. Preserve core subject, product details, and key composition while adapting it to this campaign layout.`
        : 'Use uploaded panel image as primary content source. Preserve core subject, product details, and key composition while adapting it to this campaign layout.',
    )
  } else if (panel.imagePrompt.trim()) {
    parts.push(`Generate image content: ${panel.imagePrompt.trim()}`)
  }

  if (panel.textMode === 'manual' && panel.textValue.trim()) {
    parts.push(
      `Render exact on-panel text: "${panel.textValue.trim()}". Do not paraphrase, translate, or add extra text.`,
    )
  } else if (panel.textMode === 'ai' && panel.textPrompt.trim()) {
    parts.push(`Generate on-panel text: ${panel.textPrompt.trim()}`)
  }

  if (input.hasBaseTemplateImage) {
    parts.push('Follow uploaded base template image for shared layout language and visual structure.')
  }

  return parts.join(' ')
}

function buildReferenceInstructions(input: {
  hasBaseTemplateImage: boolean
  manualPanels: CarouselPanelDraft[]
  manualImageReferenceIndexByPanelId: Map<string, number>
}) {
  const parts: string[] = []

  if (input.hasBaseTemplateImage) {
    parts.push(
      [
        'Image 1 (Base template) is hard layout anchor for whole carousel.',
        'Preserve same overall composition system across every exported slot: logo placement, headline stack, subheadline strip, metadata row, main visual window, source/footer area, spacing rhythm, palette direction, texture treatment, and typography hierarchy.',
        'Do not invent a different poster, card, flyer, or alternate composition.',
      ].join(' '),
    )
  }

  for (const panel of input.manualPanels) {
    const referenceIndex = input.manualImageReferenceIndexByPanelId.get(panel.id)

    if (!referenceIndex) {
      continue
    }

    parts.push(
      [
        `Image ${referenceIndex} (Slot ${panel.order} content source) is only for slot ${panel.order}.`,
        'Use it for subject/product/content replacement inside that slot while base template still controls layout, framing, and text placement.',
        'Do not let this content reference override global template structure.',
      ].join(' '),
    )
  }

  return parts
}

export function buildCarouselBatchPrompt(
  panels: CarouselPanelDraft[],
  draft: CarouselDraft,
  options: {
    currentDate?: Date
  } = {},
): string {
  const currentDate = options.currentDate ?? new Date()
  const manualPanels = panels.filter(
    (panel) => panel.imageMode === 'manual' && panel.imageAsset?.file,
  )
  const manualImageReferenceIndexByPanelId = new Map(
    manualPanels.map((panel, index) => [panel.id, draft.baseTemplateAsset?.file ? index + 2 : index + 1]),
  )
  const hasBaseTemplateImage = Boolean(draft.baseTemplateAsset?.file)
  const parts: string[] = [
    imageGridPromptInstruction,
    'Create one cohesive 2x2 carousel sheet where all four slots belong to the same campaign and share highly consistent visual style, layout language, spacing, lighting, palette, and typography treatment.',
    'When uploaded base template image exists, treat it as hard blueprint for composition. Keep same visual hierarchy and panel anatomy across all exported slots.',
    buildCurrentDateContextLine(currentDate),
  ]

  if (draft.baseTemplatePrompt.trim()) {
    parts.push(`Apply shared campaign template: ${draft.baseTemplatePrompt.trim()}`)
  }

  if (hasBaseTemplateImage) {
    parts.push('Reference image 1 is uploaded base template image. Use it as global layout and style anchor for every slot.')
  }

  if (manualPanels.length > 0) {
    parts.push(
      `Additional uploaded panel image references follow panel order for slots that use manual images. Use each referenced image only for its matching slot.`,
    )
  }

  parts.push(
    ...buildReferenceInstructions({
      hasBaseTemplateImage,
      manualImageReferenceIndexByPanelId,
      manualPanels,
    }),
  )

  for (let index = 0; index < 4; index += 1) {
    parts.push(
      buildPanelInstruction(panels[index] ?? null, index, {
        hasBaseTemplateImage,
        manualImageReferenceIndexByPanelId,
      }),
    )
  }

  parts.push(
    'Do not add borders, gutters, labels, watermarks, brand marks, or extra text outside requested panel copy. Keep each slot self-contained and fully inside its quadrant.',
  )
  parts.push(
    'Export one full-bleed square sheet only. No outer white border, no poster margin, no padding, and no empty canvas around the 2x2 grid.',
  )
  parts.push(
    'Do not present any slot as a separate poster card, white tile, framed panel, or inset canvas. Every slot background must extend flush to its quadrant edges.',
  )
  parts.push(
    'If base template shows dedicated image placeholder or framed content area, keep that structure and swap only inner content needed for each slot rather than redesigning entire panel.',
  )

  return parts.join('\n\n')
}

export function collectCarouselBatchReferences(input: {
  baseTemplateRemoteUrl?: string | null
  panels: CarouselPanelDraft[]
  panelImageRemoteUrlByPanelId: Map<string, string>
}): string[] {
  const references: string[] = []

  if (input.baseTemplateRemoteUrl) {
    references.push(input.baseTemplateRemoteUrl)
  }

  for (const panel of input.panels) {
    const remoteUrl = input.panelImageRemoteUrlByPanelId.get(panel.id)

    if (remoteUrl) {
      references.push(remoteUrl)
    }
  }

  return references
}

export function buildCarouselVariants(
  submissions: CarouselBatchSubmissionResult[],
  runId: string,
): RunSubmissionResponse {
  const variants: GenerationVariant[] = submissions.flatMap((submission, batchIndex) =>
    submission.panels.map((panel, panelIndex) => {
      const variantIndex = (batchIndex * 4 + panelIndex + 1) as GenerationVariantIndex

      return {
        completedAt: null,
        createdAt: null,
        error: null,
        index: variantIndex,
        profile: `Panel ${variantIndex}`,
        prompt: submission.prompt,
        result: null,
        status: submission.taskId ? ('rendering' as const) : ('error' as const),
        taskId: submission.taskId,
        variantId: `${runId}-variant-${variantIndex}`,
      }
    }),
  )

  return {
    completedAt: null,
    createdAt: new Date().toISOString(),
    model: 'nano-banana-2',
    provider: 'market',
    runId,
    status: variants.some((variant) => variant.status === 'rendering')
      ? 'rendering'
      : 'error',
    variants,
    workspace: 'carousel',
  }
}
