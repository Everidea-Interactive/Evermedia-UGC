import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { splitImageGridBuffer } from '@/lib/media/image-grid'

async function createQuadrantFixture(input: {
  bottomLeft: string
  bottomRight: string
  height?: number
  topLeft: string
  topRight: string
  width?: number
}) {
  const width = input.width ?? 4
  const height = input.height ?? 4
  const cellWidth = Math.floor(width / 2)
  const cellHeight = Math.floor(height / 2)

  return sharp({
    create: {
      background: input.topLeft,
      channels: 4,
      height,
      width,
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            background: input.topRight,
            channels: 4,
            height: cellHeight,
            width: cellWidth,
          },
        })
          .png()
          .toBuffer(),
        left: cellWidth,
        top: 0,
      },
      {
        input: await sharp({
          create: {
            background: input.bottomLeft,
            channels: 4,
            height: cellHeight,
            width: cellWidth,
          },
        })
          .png()
          .toBuffer(),
        left: 0,
        top: cellHeight,
      },
      {
        input: await sharp({
          create: {
            background: input.bottomRight,
            channels: 4,
            height: cellHeight,
            width: cellWidth,
          },
        })
          .png()
          .toBuffer(),
        left: cellWidth,
        top: cellHeight,
      },
    ])
    .png()
    .toBuffer()
}

async function readFirstPixel(buffer: Buffer) {
  const { data } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  return Array.from(data.slice(0, 3))
}

async function addWhiteBorder(buffer: Buffer, border = 1) {
  return sharp(buffer)
    .extend({
      background: '#ffffff',
      bottom: border,
      left: border,
      right: border,
      top: border,
    })
    .png()
    .toBuffer()
}

describe('image grid splitting', () => {
  it('splits a 2x2 grid into four PNG quadrants in reading order', async () => {
    const grid = await createQuadrantFixture({
      bottomLeft: '#0000ff',
      bottomRight: '#ffff00',
      topLeft: '#ff0000',
      topRight: '#00ff00',
    })

    const quadrants = await splitImageGridBuffer(grid)

    expect(quadrants.map((quadrant) => quadrant.label)).toEqual([
      'Top left',
      'Top right',
      'Bottom left',
      'Bottom right',
    ])
    await expect(readFirstPixel(quadrants[0].buffer)).resolves.toEqual([255, 0, 0])
    await expect(readFirstPixel(quadrants[1].buffer)).resolves.toEqual([0, 255, 0])
    await expect(readFirstPixel(quadrants[2].buffer)).resolves.toEqual([0, 0, 255])
    await expect(readFirstPixel(quadrants[3].buffer)).resolves.toEqual([255, 255, 0])
  })

  it('ignores trailing pixels when the provider returns odd dimensions', async () => {
    const grid = await createQuadrantFixture({
      bottomLeft: '#0000ff',
      bottomRight: '#ffff00',
      height: 5,
      topLeft: '#ff0000',
      topRight: '#00ff00',
      width: 5,
    })

    const quadrants = await splitImageGridBuffer(grid)

    await expect(
      Promise.all(quadrants.map((quadrant) => sharp(quadrant.buffer).metadata())),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ height: 2, width: 2 }),
      ]),
    )
  })

  it('trims a small outer white frame before splitting quadrants', async () => {
    const borderedGrid = await addWhiteBorder(
      await createQuadrantFixture({
        bottomLeft: '#0000ff',
        bottomRight: '#ffff00',
        topLeft: '#ff0000',
        topRight: '#00ff00',
      }),
      1,
    )

    const quadrants = await splitImageGridBuffer(borderedGrid)

    await expect(readFirstPixel(quadrants[0].buffer)).resolves.toEqual([255, 0, 0])
    await expect(readFirstPixel(quadrants[1].buffer)).resolves.toEqual([0, 255, 0])
    await expect(readFirstPixel(quadrants[2].buffer)).resolves.toEqual([0, 0, 255])
    await expect(readFirstPixel(quadrants[3].buffer)).resolves.toEqual([255, 255, 0])
  })
})
