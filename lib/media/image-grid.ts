import sharp from 'sharp'

export type ImageGridQuadrant = {
  buffer: Buffer
  label: 'Top left' | 'Top right' | 'Bottom left' | 'Bottom right'
  position: 1 | 2 | 3 | 4
}

export const imageGridPromptInstruction =
  'Create exactly one clean 2x2 grid image containing four distinct, complete, production-ready 9:16 vertical images based on the prompt. Use equal-sized quadrants in reading order: top-left, top-right, bottom-left, bottom-right. The full grid canvas must be 9:16 so each quadrant splits into a TikTok-ready 9:16 output. The grid must be full-bleed edge-to-edge: no outer frame, no canvas margin, no padding, no white border, and no empty space around the overall grid. Do not add borders, gutters, separators, labels, captions, text, watermarks, UI chrome, collage frames, panel cards, tile frames, keylines, white strokes, or inner dividers. Each quadrant must touch its neighboring quadrants directly with seamless edge alignment. The visual background and artwork of every quadrant must bleed all the way to that quadrant edge with no inset poster treatment. Keep every subject fully inside its own quadrant with no overlapping subjects or visual elements crossing quadrant boundaries.'

export function wrapPromptForImageGrid(prompt: string) {
  return `${imageGridPromptInstruction} ${prompt}`.replace(/\s+/g, ' ').trim()
}

async function normalizeGridBufferForSplitting(buffer: Buffer) {
  const {
    data,
    info: { channels, height, width },
  } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const maxAllowedTrim = 24
  const whiteThreshold = 245

  if (width < 2 || height < 2 || channels < 4) {
    return buffer
  }

  const pixelIsNearWhite = (x: number, y: number) => {
    const offset = (y * width + x) * channels
    const red = data[offset] ?? 0
    const green = data[offset + 1] ?? 0
    const blue = data[offset + 2] ?? 0
    const alpha = data[offset + 3] ?? 255

    return (
      red >= whiteThreshold &&
      green >= whiteThreshold &&
      blue >= whiteThreshold &&
      alpha >= whiteThreshold
    )
  }

  const rowIsWhite = (y: number) => {
    for (let x = 0; x < width; x += 1) {
      if (!pixelIsNearWhite(x, y)) {
        return false
      }
    }

    return true
  }

  const columnIsWhite = (x: number) => {
    for (let y = 0; y < height; y += 1) {
      if (!pixelIsNearWhite(x, y)) {
        return false
      }
    }

    return true
  }

  let topTrim = 0
  while (topTrim < Math.min(height, maxAllowedTrim) && rowIsWhite(topTrim)) {
    topTrim += 1
  }

  let bottomTrim = 0
  while (
    bottomTrim < Math.min(height - topTrim, maxAllowedTrim) &&
    rowIsWhite(height - 1 - bottomTrim)
  ) {
    bottomTrim += 1
  }

  let leftTrim = 0
  while (leftTrim < Math.min(width, maxAllowedTrim) && columnIsWhite(leftTrim)) {
    leftTrim += 1
  }

  let rightTrim = 0
  while (
    rightTrim < Math.min(width - leftTrim, maxAllowedTrim) &&
    columnIsWhite(width - 1 - rightTrim)
  ) {
    rightTrim += 1
  }

  if (
    topTrim + bottomTrim >= height ||
    leftTrim + rightTrim >= width ||
    (topTrim === 0 && bottomTrim === 0 && leftTrim === 0 && rightTrim === 0)
  ) {
    return buffer
  }

  return sharp(buffer)
    .extract({
      height: height - topTrim - bottomTrim,
      left: leftTrim,
      top: topTrim,
      width: width - leftTrim - rightTrim,
    })
    .png()
    .toBuffer()
}

export async function splitImageGridBuffer(
  buffer: Buffer,
): Promise<ImageGridQuadrant[]> {
  const normalizedBuffer = await normalizeGridBufferForSplitting(buffer)
  const metadata = await sharp(normalizedBuffer).metadata()
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
      buffer: await sharp(normalizedBuffer)
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
