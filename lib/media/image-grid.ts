import sharp from 'sharp'

export type ImageGridQuadrant = {
  buffer: Buffer
  label: 'Top left' | 'Top right' | 'Bottom left' | 'Bottom right'
  position: 1 | 2 | 3 | 4
}

export const imageGridPromptInstruction =
  'Create exactly one clean 2x2 grid image containing four distinct, complete, production-ready images based on the prompt. Use equal-sized quadrants in reading order: top-left, top-right, bottom-left, bottom-right. Do not add borders, gutters, labels, captions, text, watermarks, UI chrome, or collage frames. Keep every subject fully inside its own quadrant with no overlapping subjects or visual elements crossing quadrant boundaries.'

export function wrapPromptForImageGrid(prompt: string) {
  return `${imageGridPromptInstruction} ${prompt}`.replace(/\s+/g, ' ').trim()
}

export async function splitImageGridBuffer(
  buffer: Buffer,
): Promise<ImageGridQuadrant[]> {
  const metadata = await sharp(buffer).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  const cellWidth = Math.floor(width / 2)
  const cellHeight = Math.floor(height / 2)

  if (cellWidth < 1 || cellHeight < 1) {
    throw new Error('Generated grid image is too small to split.')
  }

  const regions: Array<Omit<ImageGridQuadrant, 'buffer'> & {
    left: number
    top: number
  }> = [
    { label: 'Top left', left: 0, position: 1, top: 0 },
    { label: 'Top right', left: cellWidth, position: 2, top: 0 },
    { label: 'Bottom left', left: 0, position: 3, top: cellHeight },
    { label: 'Bottom right', left: cellWidth, position: 4, top: cellHeight },
  ]

  return Promise.all(
    regions.map(async (region) => ({
      buffer: await sharp(buffer)
        .extract({
          height: cellHeight,
          left: region.left,
          top: region.top,
          width: cellWidth,
        })
        .png()
        .toBuffer(),
      label: region.label,
      position: region.position,
    })),
  )
}
