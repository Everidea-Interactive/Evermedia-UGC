'use client'

import Link from 'next/link'
import { AlertTriangle, Film, ImageIcon, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import {
  ImagePreviewTrigger,
  insetPanelClassName,
  panelClassName,
  rowClassName,
} from '@/components/dashboard/manual-workspace-ui'
import { Button } from '@/components/ui/button'
import { getOutputGalleryItems } from '@/lib/generation/output-gallery'
import {
  getActiveTaskCount,
  getCompletedVariantCount,
  getFailedVariantCount,
} from '@/lib/generation/run-copy'
import type { AssetSlot, WorkspaceTab } from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

function isSlotLoaded(slot: AssetSlot) {
  return Boolean(slot.file || slot.previewUrl)
}

function getSelectedRunVariant(run: ReturnType<typeof useGenerationStore.getState>['generationRun']) {
  return (
    run.variants.find((variant) => variant.variantId === run.selectedVariantId) ??
    run.variants.find((variant) => variant.status === 'success' && Boolean(variant.result)) ??
    run.variants[0] ??
    null
  )
}

export function OutputPanel({ className }: { className?: string }) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const generationRun = useGenerationStore((state) => state.generationRun)

  const loadedAssets = useMemo(
    () =>
      [...Object.values(assets), ...products].filter((slot) => isSlotLoaded(slot)),
    [assets, products],
  )
  const runMatchesWorkspace = generationRun.workspace === activeTab

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Output
            </p>
            <h2 className="mt-2 text-balance font-display text-xl font-semibold sm:text-2xl">
              Render output
            </h2>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/library">Open Library</Link>
          </Button>
        </div>

        <div className={cn(insetPanelClassName, 'overflow-hidden')}>
          <div className="p-4 sm:p-5">
            <div className="flex min-h-[240px] flex-col sm:min-h-[320px]">
              <PreviewStage
                activeTab={activeTab}
                loadedAssets={loadedAssets.length}
                runMatchesWorkspace={runMatchesWorkspace}
                runState={generationRun}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewStage({
  activeTab,
  loadedAssets,
  runMatchesWorkspace,
  runState,
}: {
  activeTab: WorkspaceTab
  loadedAssets: number
  runMatchesWorkspace: boolean
  runState: ReturnType<typeof useGenerationStore.getState>['generationRun']
}) {
  const displayVariant = runMatchesWorkspace ? getSelectedRunVariant(runState) : null
  const galleryItems = runMatchesWorkspace ? getOutputGalleryItems(runState) : []
  const totalVariants = runState.variants.length
  const completedCount = getCompletedVariantCount(runState)
  const failedVariants = getFailedVariantCount(runState)
  const activeTaskCount = getActiveTaskCount(runState)
  const runSummaryItems = [`${completedCount}/${totalVariants} complete`]

  if (failedVariants > 0) {
    runSummaryItems.push(`${failedVariants} failed`)
  }

  if (activeTaskCount > 0) {
    runSummaryItems.push(`${activeTaskCount} active`)
  }

  if (runMatchesWorkspace && totalVariants > 0) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-1 justify-center">
          <div className="flex min-h-0 w-full max-w-5xl flex-col gap-3">
            {galleryItems.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {galleryItems.map((item) => (
                  <OutputGalleryCard item={item} key={item.variantId} />
                ))}
              </div>
            ) : displayVariant ? (
              <PreviewStateCallout
                body={
                  displayVariant.error ??
                  'This variation is still waiting on the provider. The panel refreshes automatically while generation is active.'
                }
                icon={
                  runState.status === 'error' ? (
                    <AlertTriangle className="size-8" suppressHydrationWarning />
                  ) : (
                    <LoaderCircle
                      className={cn(
                        'size-8',
                        runState.status === 'rendering' && 'animate-spin',
                      )}
                      suppressHydrationWarning
                    />
                  )
                }
                title={`Variation ${displayVariant.index}`}
                tone={runState.status === 'error' ? 'destructive' : 'default'}
              />
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (runMatchesWorkspace && runState.status === 'error') {
    return (
      <PreviewStateCallout
        body={runState.error ?? 'The provider rejected this request.'}
        icon={<AlertTriangle className="size-8" suppressHydrationWarning />}
        title="Generation stopped before completion"
        tone="destructive"
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
        {activeTab === 'video' ? (
          <Film className="size-8" suppressHydrationWarning />
        ) : (
          <ImageIcon className="size-8" suppressHydrationWarning />
        )}
      </div>

      <div className="max-w-xl">
        <p className="text-balance font-display text-xl font-semibold sm:text-2xl">
          {loadedAssets > 0
            ? `${loadedAssets} references staged for rendering`
            : 'No media references loaded yet'}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {loadedAssets > 0
            ? 'Your local references are ready. Review this panel, then run generation from the footer below.'
            : 'Build the reference board first, or use the written brief if you need a prompt-only run.'}
        </p>
      </div>
    </div>
  )
}

function OutputGalleryCard({
  item,
}: {
  item: ReturnType<typeof getOutputGalleryItems>[number]
}) {
  const media = item.type === 'image' ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={item.alt}
      className="h-full w-full rounded-md bg-secondary/20 object-contain"
      src={item.url}
    />
  ) : (
    <video
      className="h-full w-full rounded-md bg-black object-contain"
      controls
      playsInline
      preload="metadata"
      src={item.url}
    />
  )

  return (
    <div className={cn(rowClassName, 'overflow-hidden p-2')}>
      <div className="mb-2 px-1">
        <p className="text-sm font-medium text-muted-foreground">
          #{item.variantIndex}
        </p>
      </div>
      <div className="aspect-square overflow-hidden rounded-md bg-secondary/20">
        {item.inspectable ? (
          <ImagePreviewTrigger
            alt={item.alt}
            className="h-full"
            label={item.label}
            src={item.url}
          >
            {media}
          </ImagePreviewTrigger>
        ) : (
          media
        )}
      </div>
    </div>
  )
}

function PreviewStateCallout({
  body,
  icon,
  title,
  tone = 'default',
}: {
  body: string
  icon: ReactNode
  title: string
  tone?: 'default' | 'destructive'
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6 text-center">
      <div
        className={cn(
          'flex size-16 items-center justify-center rounded-xl border bg-secondary text-foreground',
          tone === 'destructive'
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : 'border-border',
        )}
      >
        {icon}
      </div>
      <div className="max-w-xl">
        <p className="text-balance font-display text-xl font-semibold sm:text-2xl">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
