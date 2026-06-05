'use client'

import { LoaderCircle } from 'lucide-react'

import {
  insetPanelClassName,
  panelClassName,
  rowClassName,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

export function ManualCarouselOutputPanel({ className }: { className?: string }) {
  const generationRun = useGenerationStore((state) => state.generationRun)

  const completedOutputs = generationRun.variants
    .filter((v) => v.result && v.status === 'success')
    .sort((a, b) => a.index - b.index)

  const hasRenderingVariants = generationRun.variants.some(
    (v) => v.status === 'rendering',
  )
  const isCarouselWorkspace = generationRun.workspace === 'carousel'

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <SectionHeader
        description="Review and export your compiled carousel. Preview each panel before generating the final image set."
        eyebrow="Carousel Outputs"
        title="Carousel Preview"
      />

      <div className={cn(insetPanelClassName, 'mt-4 overflow-hidden')}>
        <div className="flex min-h-[160px] flex-col p-4 sm:p-5">
          {isCarouselWorkspace && hasRenderingVariants && completedOutputs.length === 0 ? (
            <div
              aria-live="polite"
              className="flex flex-1 flex-col items-center justify-center gap-2 text-center"
            >
              <LoaderCircle
                className="size-6 animate-spin"
                suppressHydrationWarning
              />
              <span className="text-sm text-muted-foreground">
                Generating carousel outputs...
              </span>
            </div>
          ) : completedOutputs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {completedOutputs.map((variant) => {
                const label = variant.result?.label ?? variant.profile

                return (
                  <div
                    key={variant.variantId}
                    className={cn(rowClassName, 'overflow-hidden p-2')}
                  >
                    <div className="mb-2 px-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {label}
                      </p>
                    </div>
                    <div className="aspect-square overflow-hidden rounded-md bg-secondary/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={`Carousel panel ${label}`}
                        className="h-full w-full rounded-md bg-secondary/20 object-contain"
                        src={variant.result!.url}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                No carousel outputs yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
