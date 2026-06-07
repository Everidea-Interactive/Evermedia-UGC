import type { GenerationRun } from '@/lib/generation/types'

export type OutputGalleryItem = {
  alt: string
  inspectable: boolean
  label: string
  type: 'image' | 'video'
  url: string
  variantId: string
  variantIndex: number
}

export function getOutputGalleryItems(run: GenerationRun): OutputGalleryItem[] {
  return run.variants
    .slice()
    .sort((left, right) => left.index - right.index)
    .flatMap((variant) => {
      if (!variant.result) {
        return []
      }

      const label = `Variation ${variant.index}`

      return [{
        alt: `Generated result for variation ${variant.index}`,
        inspectable: true,
        label,
        type: variant.result.type,
        url: variant.result.url,
        variantId: variant.variantId,
        variantIndex: variant.index,
      }]
    })
}
