import { describe, expect, it } from 'vitest'

import { buildCarouselBatchPrompt } from '@/lib/generation/carousel'
import type { CarouselDraft, CarouselPanelDraft } from '@/lib/generation/types'

function createDraft(panel: CarouselPanelDraft): CarouselDraft {
  return {
    baseTemplateAsset: null,
    baseTemplateMode: 'ai',
    baseTemplatePrompt: 'clean beauty carousel with top visual and bottom caption block',
    panels: [panel],
  }
}

function createUploadedAssetSlot() {
  return {
    error: null,
    file: new File(['base'], 'base-template.png', { type: 'image/png' }),
    id: 'base-template',
    label: 'Base template',
    mimeType: 'image/png',
    previewUrl: null,
    size: 4,
    uploadStatus: 'staged' as const,
  }
}

describe('carousel prompt builder', () => {
  it('adds preserve/edit instructions for manual-image manual-text panels', () => {
    const panel: CarouselPanelDraft = {
      id: 'panel-1',
      imageAsset: null,
      imageMode: 'manual',
      imagePrompt: '',
      order: 1,
      templateMode: 'override',
      templatePrompt: 'use rounded product frame with subtle border',
      textMode: 'manual',
      textPrompt: '',
      textValue: 'Bright Skin In 7 Days',
    }
    const prompt = buildCarouselBatchPrompt([panel], createDraft(panel))

    expect(prompt).toContain('Create one cohesive 2x2 carousel sheet')
    expect(prompt).toContain('Apply shared campaign template:')
    expect(prompt).toContain('Slot 1 (top-left): export panel.')
    expect(prompt).toContain('Template override: use rounded product frame with subtle border')
    expect(prompt).toContain('Use uploaded panel image as primary content source.')
    expect(prompt).toContain('Render exact on-panel text: "Bright Skin In 7 Days"')
    expect(prompt).toContain('Do not paraphrase, translate, or add extra text.')
    expect(prompt).toContain('hidden style anchor only')
    expect(prompt).toContain('No outer white border, no poster margin, no padding')
    expect(prompt).toContain('Do not present any slot as a separate poster card')
    expect(prompt).toContain('Current date context:')
  })

  it('keeps AI image and AI text prompts explicit', () => {
    const panel: CarouselPanelDraft = {
      id: 'panel-2',
      imageAsset: null,
      imageMode: 'ai',
      imagePrompt: 'serum bottle on reflective pedestal with soft studio glow',
      order: 2,
      templateMode: 'inherit',
      templatePrompt: '',
      textMode: 'ai',
      textPrompt: 'short premium benefit headline about glow and hydration',
      textValue: '',
    }
    const prompt = buildCarouselBatchPrompt([panel], createDraft(panel))

    expect(prompt).toContain(
      'Generate image content: serum bottle on reflective pedestal with soft studio glow',
    )
    expect(prompt).toContain(
      'Generate on-panel text: short premium benefit headline about glow and hydration',
    )
    expect(prompt).not.toContain('Use uploaded panel image as primary content source.')
    expect(prompt).toContain('Current date context:')
  })

  it('adds current date context when carousel prompts contain dates', () => {
    const panel: CarouselPanelDraft = {
      id: 'panel-3',
      imageAsset: null,
      imageMode: 'ai',
      imagePrompt: 'hero serum visual for today only launch banner',
      order: 3,
      templateMode: 'inherit',
      templatePrompt: '',
      textMode: 'ai',
      textPrompt: 'headline for June 20, 2026 launch event',
      textValue: '',
    }
    const prompt = buildCarouselBatchPrompt([panel], createDraft(panel), {
      currentDate: new Date('2026-06-05T00:00:00.000Z'),
    })

    expect(prompt).toContain('Current date context: 2026-06-05.')
    expect(prompt).toContain(
      'Use this only when prompt, template, base panel, or requested copy strongly indicates date-sensitive content.',
    )
    expect(prompt).toContain(
      'Resolve relative date words against this date and preserve any explicit dates exactly as written.',
    )
    expect(prompt).toContain(
      'Do not add or emphasize dates when source instructions are not date-driven.',
    )
  })

  it('treats uploaded base template as hard layout blueprint and keeps panel refs subordinate', () => {
    const panel: CarouselPanelDraft = {
      id: 'panel-4',
      imageAsset: {
        error: null,
        file: new File(['panel'], 'panel.png', { type: 'image/png' }),
        id: 'panel-image',
        label: 'Panel image',
        mimeType: 'image/png',
        previewUrl: null,
        size: 5,
        uploadStatus: 'staged',
      },
      imageMode: 'manual',
      imagePrompt: '',
      order: 1,
      templateMode: 'inherit',
      templatePrompt: '',
      textMode: 'manual',
      textPrompt: '',
      textValue: 'Exact headline',
    }
    const prompt = buildCarouselBatchPrompt([panel], {
      ...createDraft(panel),
      baseTemplateAsset: createUploadedAssetSlot(),
      baseTemplateMode: 'manual',
      baseTemplatePrompt: '',
    })

    expect(prompt).toContain(
      'When uploaded base template image exists, treat it as hard blueprint for composition.',
    )
    expect(prompt).toContain('Image 1 (Base template) is hard layout anchor for whole carousel.')
    expect(prompt).toContain(
      'Preserve same overall composition system across every exported slot: logo placement, headline stack, subheadline strip, metadata row, main visual window, source/footer area, spacing rhythm, palette direction, texture treatment, and typography hierarchy.',
    )
    expect(prompt).toContain('Image 2 (Slot 1 content source) is only for slot 1.')
    expect(prompt).toContain(
      'Use it for subject/product/content replacement inside that slot while base template still controls layout, framing, and text placement.',
    )
    expect(prompt).toContain(
      'If base template shows dedicated image placeholder or framed content area, keep that structure and swap only inner content needed for each slot rather than redesigning entire panel.',
    )
  })
})
