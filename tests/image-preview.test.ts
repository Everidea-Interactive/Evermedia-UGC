import { describe, expect, it } from 'vitest'

import {
  clampPreviewScale,
  clampPreviewTransform,
  createInitialPreviewTransform,
  getContentPointAtViewportPoint,
  getPreviewPanBounds,
  isImageMimeType,
  zoomPreviewAtPoint,
} from '../lib/media/image-preview'

describe('image preview helpers', () => {
  const container = {
    height: 800,
    width: 1000,
  }
  const content = {
    height: 600,
    width: 800,
  }

  it('creates a fit-to-screen transform for resets', () => {
    expect(createInitialPreviewTransform()).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    })
  })

  it('clamps scale to the supported zoom range', () => {
    expect(clampPreviewScale(0.25)).toBe(1)
    expect(clampPreviewScale(2.5)).toBe(2.5)
    expect(clampPreviewScale(8)).toBe(4)
  })

  it('keeps offsets pinned at zero when the image fits the frame', () => {
    expect(
      clampPreviewTransform(
        {
          offsetX: 180,
          offsetY: -120,
          scale: 1,
        },
        container,
        content,
      ),
    ).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    })
  })

  it('clamps panning to the scaled image bounds', () => {
    expect(getPreviewPanBounds(container, content, 2)).toEqual({
      maxOffsetX: 300,
      maxOffsetY: 200,
    })

    expect(
      clampPreviewTransform(
        {
          offsetX: 420,
          offsetY: -260,
          scale: 2,
        },
        container,
        content,
      ),
    ).toEqual({
      offsetX: 300,
      offsetY: -200,
      scale: 2,
    })
  })

  it('keeps the same image point under the cursor while zooming', () => {
    const viewportPoint = {
      x: 760,
      y: 240,
    }
    const initialTransform = createInitialPreviewTransform()
    const beforeZoom = getContentPointAtViewportPoint(
      initialTransform,
      viewportPoint,
      container,
    )
    const afterZoomTransform = zoomPreviewAtPoint(
      initialTransform,
      2,
      viewportPoint,
      container,
      content,
    )
    const afterZoom = getContentPointAtViewportPoint(
      afterZoomTransform,
      viewportPoint,
      container,
    )

    expect(afterZoomTransform.scale).toBe(2)
    expect(afterZoom.x).toBeCloseTo(beforeZoom.x, 6)
    expect(afterZoom.y).toBeCloseTo(beforeZoom.y, 6)
  })

  it('detects image mime types for preview routing', () => {
    expect(isImageMimeType('image/png')).toBe(true)
    expect(isImageMimeType('video/mp4')).toBe(false)
    expect(isImageMimeType(null)).toBe(false)
  })
})
