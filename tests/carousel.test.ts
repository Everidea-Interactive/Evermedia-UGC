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
  })
})
