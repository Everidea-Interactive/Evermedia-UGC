'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { RotateCcw, X } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type WheelEvent as ReactWheelEvent,
} from 'react'

import { Button } from '@/components/ui/button'
import {
  DOUBLE_TAP_PREVIEW_SCALE,
  MIN_PREVIEW_SCALE,
  clampPreviewTransform,
  createInitialPreviewTransform,
  getContentPointAtViewportPoint,
  getOffsetForContentPoint,
  type PreviewPoint,
  type PreviewSize,
  type PreviewTransform,
  zoomPreviewAtPoint,
} from '@/lib/media/image-preview'

type ImagePreviewDialogProps = {
  alt: string
  children: ReactElement
  label?: string
  src: string
}

type PointerStart = {
  point: PreviewPoint
  pointerType: string
  time: number
}

type PanGesture = {
  pointerId: number
  startOffsetX: number
  startOffsetY: number
  startPoint: PreviewPoint
}

type PinchGesture = {
  anchorPoint: PreviewPoint
  startDistance: number
  startScale: number
}

type ViewerMetrics = {
  container: PreviewSize
  content: PreviewSize
  rect: DOMRect
}

const tapWindowMs = 280
const tapMovementThreshold = 20

function getDistance(first: PreviewPoint, second: PreviewPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function getMidpoint(first: PreviewPoint, second: PreviewPoint): PreviewPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

function isTap(start: PointerStart, endPoint: PreviewPoint) {
  return getDistance(start.point, endPoint) <= tapMovementThreshold
}

export function ImagePreviewDialog({
  alt,
  children,
  label,
  src,
}: ImagePreviewDialogProps) {
  const [open, setOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const transformLayerRef = useRef<HTMLDivElement | null>(null)
  const scaleLabelRef = useRef<HTMLSpanElement | null>(null)
  const metricsRef = useRef<ViewerMetrics | null>(null)
  const activePointersRef = useRef(new Map<number, PreviewPoint>())
  const pointerStartsRef = useRef(new Map<number, PointerStart>())
  const lastTapRef = useRef<{ point: PreviewPoint; time: number } | null>(null)
  const panGestureRef = useRef<PanGesture | null>(null)
  const pinchGestureRef = useRef<PinchGesture | null>(null)
  const transformRef = useRef<PreviewTransform>(createInitialPreviewTransform())
  const pendingTransformRef = useRef<PreviewTransform | null>(null)
  const transformFrameRef = useRef<number | null>(null)
  const draggingRef = useRef(false)
  const gestureMovedRef = useRef(false)

  const measureViewer = (): ViewerMetrics | null => {
    const container = containerRef.current
    const image = imageRef.current

    if (!container || !image) {
      return null
    }

    const rect = container.getBoundingClientRect()
    const content = {
      height: image.offsetHeight,
      width: image.offsetWidth,
    }

    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      content.width <= 0 ||
      content.height <= 0
    ) {
      return null
    }

    return {
      container: {
        height: rect.height,
        width: rect.width,
      },
      content,
      rect,
    }
  }

  const refreshMetrics = () => {
    const metrics = measureViewer()
    metricsRef.current = metrics
    return metrics
  }

  const getViewerMetrics = () => metricsRef.current ?? refreshMetrics()

  const cancelScheduledTransform = () => {
    if (transformFrameRef.current === null) {
      return
    }

    window.cancelAnimationFrame(transformFrameRef.current)
    transformFrameRef.current = null
  }

  const applyTransformToDom = () => {
    transformFrameRef.current = null

    const nextTransform = pendingTransformRef.current ?? transformRef.current
    const transformLayer = transformLayerRef.current
    const container = containerRef.current
    const scaleLabel = scaleLabelRef.current

    if (transformLayer) {
      transformLayer.style.transform = `translate3d(${nextTransform.offsetX}px, ${nextTransform.offsetY}px, 0) scale(${nextTransform.scale})`
    }

    if (container) {
      container.dataset.dragging = draggingRef.current ? 'true' : 'false'
      container.dataset.scale =
        nextTransform.scale > MIN_PREVIEW_SCALE + 0.001 ? 'zoomed' : 'fit'
    }

    if (scaleLabel) {
      scaleLabel.textContent = `${Math.round(nextTransform.scale * 100)}%`
    }
  }

  const scheduleTransformFlush = () => {
    if (transformFrameRef.current !== null) {
      return
    }

    transformFrameRef.current = window.requestAnimationFrame(() => {
      applyTransformToDom()
    })
  }

  const commitTransform = (
    nextTransform:
      | PreviewTransform
      | ((currentTransform: PreviewTransform) => PreviewTransform),
    options?: { immediate?: boolean },
  ) => {
    const resolvedTransform =
      typeof nextTransform === 'function'
        ? nextTransform(transformRef.current)
        : nextTransform

    transformRef.current = resolvedTransform
    pendingTransformRef.current = resolvedTransform

    if (options?.immediate) {
      cancelScheduledTransform()
      applyTransformToDom()
      return
    }

    scheduleTransformFlush()
  }

  const setDragging = (nextDragging: boolean) => {
    if (draggingRef.current === nextDragging) {
      return
    }

    draggingRef.current = nextDragging

    const container = containerRef.current

    if (container) {
      container.dataset.dragging = nextDragging ? 'true' : 'false'
    }
  }

  const clearGestures = () => {
    activePointersRef.current.clear()
    pointerStartsRef.current.clear()
    panGestureRef.current = null
    pinchGestureRef.current = null
    gestureMovedRef.current = false
    setDragging(false)
  }

  const getPointFromEvent = (event: { clientX: number; clientY: number }) => {
    const metrics = getViewerMetrics()

    if (!metrics) {
      return null
    }

    return {
      metrics,
      point: {
        x: event.clientX - metrics.rect.left,
        y: event.clientY - metrics.rect.top,
      },
    }
  }

  const resetViewer = () => {
    clearGestures()
    lastTapRef.current = null
    commitTransform(createInitialPreviewTransform(), { immediate: true })
  }

  const clampCurrentTransform = () => {
    const metrics = getViewerMetrics()

    if (!metrics) {
      return
    }

    commitTransform((currentTransform) =>
      clampPreviewTransform(currentTransform, metrics.container, metrics.content),
    )
  }

  const isPointInsideImage = (point: PreviewPoint) => {
    const metrics = getViewerMetrics()

    if (!metrics) {
      return false
    }

    const halfWidth = (metrics.content.width * transformRef.current.scale) / 2
    const halfHeight = (metrics.content.height * transformRef.current.scale) / 2
    const centerX = metrics.container.width / 2 + transformRef.current.offsetX
    const centerY = metrics.container.height / 2 + transformRef.current.offsetY

    return (
      point.x >= centerX - halfWidth &&
      point.x <= centerX + halfWidth &&
      point.y >= centerY - halfHeight &&
      point.y <= centerY + halfHeight
    )
  }

  const toggleZoom = (point: PreviewPoint) => {
    const metrics = getViewerMetrics()

    if (!metrics) {
      return
    }

    if (transformRef.current.scale > MIN_PREVIEW_SCALE + 0.001) {
      commitTransform(createInitialPreviewTransform())
      return
    }

    commitTransform(
      zoomPreviewAtPoint(
        transformRef.current,
        DOUBLE_TAP_PREVIEW_SCALE,
        point,
        metrics.container,
        metrics.content,
      ),
    )
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      cancelScheduledTransform()
      clearGestures()
      lastTapRef.current = null
    }

    setOpen(nextOpen)
  }

  const zoomFromWheelEvent = (event: {
    clientX: number
    clientY: number
    deltaY: number
  }) => {
    const nextPointer = getPointFromEvent(event)

    if (!nextPointer) {
      return false
    }

    const nextScale =
      transformRef.current.scale * Math.exp(-event.deltaY * 0.0015)

    commitTransform(
      zoomPreviewAtPoint(
        transformRef.current,
        nextScale,
        nextPointer.point,
        nextPointer.metrics.container,
        nextPointer.metrics.content,
      ),
    )

    return true
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const syncViewer = () => {
      refreshMetrics()
      resetViewer()
      clampCurrentTransform()
    }

    const handleBrowserZoomWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return
      }

      const container = containerRef.current

      if (!container) {
        return
      }

      const rect = container.getBoundingClientRect()
      const isInsideContainer =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (!isInsideContainer || !zoomFromWheelEvent(event)) {
        return
      }

      event.preventDefault()
    }

    const resizeFrame = window.requestAnimationFrame(() => {
      syncViewer()
    })

    const handleResize = () => {
      refreshMetrics()
      clampCurrentTransform()
    }

    document.addEventListener('wheel', handleBrowserZoomWheel, {
      capture: true,
      passive: false,
    })
    window.addEventListener('resize', handleResize)

    return () => {
      cancelScheduledTransform()
      window.cancelAnimationFrame(resizeFrame)
      document.removeEventListener('wheel', handleBrowserZoomWheel, true)
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = previousOverflow
      metricsRef.current = null
      clearGestures()
      lastTapRef.current = null
    }
  // Ref-backed gesture helpers are intentionally excluded here.
  // The viewer should only resync when the dialog opens or the image source changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, src])

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      return
    }

    zoomFromWheelEvent(event)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    const nextPointer = getPointFromEvent(event)

    if (!nextPointer) {
      return
    }

    event.preventDefault()

    event.currentTarget.setPointerCapture(event.pointerId)
    activePointersRef.current.set(event.pointerId, nextPointer.point)
    pointerStartsRef.current.set(event.pointerId, {
      point: nextPointer.point,
      pointerType: event.pointerType,
      time: Date.now(),
    })
    gestureMovedRef.current = false

    if (activePointersRef.current.size === 2) {
      const [firstPoint, secondPoint] = Array.from(activePointersRef.current.values())
      const midpoint = getMidpoint(firstPoint, secondPoint)

      pinchGestureRef.current = {
        anchorPoint: getContentPointAtViewportPoint(
          transformRef.current,
          midpoint,
          nextPointer.metrics.container,
        ),
        startDistance: Math.max(getDistance(firstPoint, secondPoint), 1),
        startScale: transformRef.current.scale,
      }
      panGestureRef.current = null
      setDragging(false)
      return
    }

    if (transformRef.current.scale > MIN_PREVIEW_SCALE + 0.001) {
      panGestureRef.current = {
        pointerId: event.pointerId,
        startOffsetX: transformRef.current.offsetX,
        startOffsetY: transformRef.current.offsetY,
        startPoint: nextPointer.point,
      }
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) {
      return
    }

    const nextPointer = getPointFromEvent(event)

    if (!nextPointer) {
      return
    }

    activePointersRef.current.set(event.pointerId, nextPointer.point)

    if (activePointersRef.current.size >= 2 && pinchGestureRef.current) {
      const [firstPoint, secondPoint] = Array.from(activePointersRef.current.values())
      const currentDistance = Math.max(getDistance(firstPoint, secondPoint), 1)
      const midpoint = getMidpoint(firstPoint, secondPoint)
      const nextScale =
        pinchGestureRef.current.startScale *
        (currentDistance / pinchGestureRef.current.startDistance)
      const nextOffset = getOffsetForContentPoint(
        pinchGestureRef.current.anchorPoint,
        midpoint,
        nextPointer.metrics.container,
        nextScale,
      )

      gestureMovedRef.current = true
      commitTransform(
        clampPreviewTransform(
          {
            offsetX: nextOffset.x,
            offsetY: nextOffset.y,
            scale: nextScale,
          },
          nextPointer.metrics.container,
          nextPointer.metrics.content,
        ),
      )
      return
    }

    if (
      !panGestureRef.current ||
      panGestureRef.current.pointerId !== event.pointerId ||
      transformRef.current.scale <= MIN_PREVIEW_SCALE + 0.001
    ) {
      return
    }

    const nextOffsetX =
      panGestureRef.current.startOffsetX +
      (nextPointer.point.x - panGestureRef.current.startPoint.x)
    const nextOffsetY =
      panGestureRef.current.startOffsetY +
      (nextPointer.point.y - panGestureRef.current.startPoint.y)

    gestureMovedRef.current =
      gestureMovedRef.current ||
      getDistance(panGestureRef.current.startPoint, nextPointer.point) > 2
    setDragging(true)
    commitTransform(
      clampPreviewTransform(
        {
          offsetX: nextOffsetX,
          offsetY: nextOffsetY,
          scale: transformRef.current.scale,
        },
        nextPointer.metrics.container,
        nextPointer.metrics.content,
      ),
    )
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerStart = pointerStartsRef.current.get(event.pointerId)
    const nextPointer = getPointFromEvent(event)
    const point = nextPointer?.point ?? pointerStart?.point

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    activePointersRef.current.delete(event.pointerId)
    pointerStartsRef.current.delete(event.pointerId)

    if (
      pointerStart &&
      point &&
      !gestureMovedRef.current &&
      activePointersRef.current.size === 0 &&
      !isPointInsideImage(point)
    ) {
      lastTapRef.current = null
      handleOpenChange(false)
      return
    }

    if (
      pointerStart &&
      point &&
      pointerStart.pointerType === 'touch' &&
      isTap(pointerStart, point) &&
      Date.now() - pointerStart.time <= tapWindowMs &&
      activePointersRef.current.size === 0
    ) {
      const lastTap = lastTapRef.current

      if (
        lastTap &&
        Date.now() - lastTap.time <= tapWindowMs &&
        getDistance(lastTap.point, point) <= tapMovementThreshold
      ) {
        toggleZoom(point)
        lastTapRef.current = null
      } else {
        lastTapRef.current = {
          point,
          time: Date.now(),
        }
      }
    }

    if (activePointersRef.current.size < 2) {
      pinchGestureRef.current = null
    }

    if (
      activePointersRef.current.size === 1 &&
      transformRef.current.scale > MIN_PREVIEW_SCALE + 0.001
    ) {
      const [remainingPointerId, remainingPoint] = Array.from(
        activePointersRef.current.entries(),
      )[0]

      panGestureRef.current = {
        pointerId: remainingPointerId,
        startOffsetX: transformRef.current.offsetX,
        startOffsetY: transformRef.current.offsetY,
        startPoint: remainingPoint,
      }
    } else if (activePointersRef.current.size === 0) {
      panGestureRef.current = null
      setDragging(false)
    }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const nextPointer = getPointFromEvent(event)

    if (!nextPointer) {
      return
    }

    toggleZoom(nextPointer.point)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="image-preview-backdrop fixed inset-0 z-50" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none sm:p-6"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            closeButtonRef.current?.focus({ preventScroll: true })
          }}
        >
          <Dialog.Title className="sr-only">{label ?? alt}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Fullscreen image preview. Scroll or pinch to zoom, drag to pan, use
            reset to return to fit view, or press Escape to close.
          </Dialog.Description>

          {label ? (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur">
                {label}
              </div>
            </div>
          ) : null}

          <Dialog.Close asChild>
            <Button
              aria-label="Close preview"
              className="absolute right-4 top-4 z-10 size-11 rounded-full border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur hover:bg-black/72"
              ref={closeButtonRef}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-5" />
            </Button>
          </Dialog.Close>

          <div
            ref={containerRef}
            className="image-preview-canvas relative h-full w-full overflow-hidden rounded-[1.5rem]"
            data-dragging="false"
            data-scale="fit"
            onDoubleClick={handleDoubleClick}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onWheel={handleWheel}
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                ref={transformLayerRef}
                style={{
                  transform: 'translate3d(0px, 0px, 0) scale(1)',
                  transformOrigin: 'center center',
                  willChange: 'transform',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  alt={alt}
                  className="max-h-[calc(100vh-8.5rem)] max-w-[min(92vw,1200px)] select-none object-contain shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:max-h-[calc(100vh-7rem)]"
                  draggable={false}
                  onLoad={() => {
                    refreshMetrics()
                    clampCurrentTransform()
                  }}
                  src={src}
                />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 sm:bottom-6">
            <div className="image-preview-hud pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/72 px-3.5 py-2 text-xs font-medium text-white/86 backdrop-blur">
              <button
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/86 transition-colors hover:bg-white/10"
                onClick={() => {
                  resetViewer()
                }}
                type="button"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
              <span className="text-white/58">•</span>
              <span ref={scaleLabelRef}>100%</span>
              <span className="hidden text-white/62 sm:inline">
                scroll / pinch to zoom · drag to pan
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
