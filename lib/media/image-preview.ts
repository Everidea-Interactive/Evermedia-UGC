export type PreviewPoint = {
  x: number
  y: number
}

export type PreviewSize = {
  width: number
  height: number
}

export type PreviewTransform = {
  offsetX: number
  offsetY: number
  scale: number
}

export const MIN_PREVIEW_SCALE = 1
export const MAX_PREVIEW_SCALE = 4
export const DOUBLE_TAP_PREVIEW_SCALE = 2

function clamp(value: number, min: number, max: number) {
  const clamped = Math.min(Math.max(value, min), max)

  return Object.is(clamped, -0) ? 0 : clamped
}

function hasSize(size: PreviewSize) {
  return size.width > 0 && size.height > 0
}

function getCenteredViewportPoint(
  point: PreviewPoint,
  container: PreviewSize,
): PreviewPoint {
  return {
    x: point.x - container.width / 2,
    y: point.y - container.height / 2,
  }
}

export function createInitialPreviewTransform(): PreviewTransform {
  return {
    offsetX: 0,
    offsetY: 0,
    scale: MIN_PREVIEW_SCALE,
  }
}

export function isImageMimeType(mimeType: string | null | undefined) {
  return Boolean(mimeType?.startsWith('image/'))
}

export function clampPreviewScale(scale: number) {
  return clamp(scale, MIN_PREVIEW_SCALE, MAX_PREVIEW_SCALE)
}

export function getPreviewPanBounds(
  container: PreviewSize,
  content: PreviewSize,
  scale: number,
) {
  if (!hasSize(container) || !hasSize(content)) {
    return {
      maxOffsetX: 0,
      maxOffsetY: 0,
    }
  }

  const nextScale = clampPreviewScale(scale)

  return {
    maxOffsetX: Math.max((content.width * nextScale - container.width) / 2, 0),
    maxOffsetY: Math.max((content.height * nextScale - container.height) / 2, 0),
  }
}

export function clampPreviewOffset(
  offset: PreviewPoint,
  container: PreviewSize,
  content: PreviewSize,
  scale: number,
): PreviewPoint {
  const bounds = getPreviewPanBounds(container, content, scale)

  return {
    x: clamp(offset.x, -bounds.maxOffsetX, bounds.maxOffsetX),
    y: clamp(offset.y, -bounds.maxOffsetY, bounds.maxOffsetY),
  }
}

export function clampPreviewTransform(
  transform: PreviewTransform,
  container: PreviewSize,
  content: PreviewSize,
): PreviewTransform {
  const scale = clampPreviewScale(transform.scale)
  const offset = clampPreviewOffset(
    { x: transform.offsetX, y: transform.offsetY },
    container,
    content,
    scale,
  )

  return {
    offsetX: offset.x,
    offsetY: offset.y,
    scale,
  }
}

export function getContentPointAtViewportPoint(
  transform: PreviewTransform,
  viewportPoint: PreviewPoint,
  container: PreviewSize,
): PreviewPoint {
  const centeredPoint = getCenteredViewportPoint(viewportPoint, container)

  return {
    x: (centeredPoint.x - transform.offsetX) / transform.scale,
    y: (centeredPoint.y - transform.offsetY) / transform.scale,
  }
}

export function getOffsetForContentPoint(
  contentPoint: PreviewPoint,
  viewportPoint: PreviewPoint,
  container: PreviewSize,
  scale: number,
): PreviewPoint {
  const centeredPoint = getCenteredViewportPoint(viewportPoint, container)

  return {
    x: centeredPoint.x - contentPoint.x * scale,
    y: centeredPoint.y - contentPoint.y * scale,
  }
}

export function zoomPreviewAtPoint(
  transform: PreviewTransform,
  nextScale: number,
  viewportPoint: PreviewPoint,
  container: PreviewSize,
  content: PreviewSize,
): PreviewTransform {
  const scale = clampPreviewScale(nextScale)
  const contentPoint = getContentPointAtViewportPoint(
    transform,
    viewportPoint,
    container,
  )
  const offset = getOffsetForContentPoint(
    contentPoint,
    viewportPoint,
    container,
    scale,
  )

  return clampPreviewTransform(
    {
      offsetX: offset.x,
      offsetY: offset.y,
      scale,
    },
    container,
    content,
  )
}
