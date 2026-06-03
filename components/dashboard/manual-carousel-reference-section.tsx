'use client'

import { type ChangeEvent } from 'react'
import { ChevronDown, ChevronUp, Image, Trash2, Upload, X } from 'lucide-react'

import {
  assetAccept,
  panelClassName,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import { Button } from '@/components/ui/button'
import type { AssetSlot, CarouselPanelDraft } from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

function createPanelAssetSlot(file: File): AssetSlot {
  return {
    error: null,
    file,
    id: crypto.randomUUID(),
    label: file.name,
    mimeType: file.type,
    previewUrl: URL.createObjectURL(file),
    size: file.size,
    uploadStatus: 'staged',
  }
}

export function ManualCarouselReferenceSection({ className }: { className?: string }) {
  const panels = useGenerationStore((state) => state.carouselDraft.panels)
  const addCarouselPanel = useGenerationStore((state) => state.addCarouselPanel)
  const deleteCarouselPanel = useGenerationStore((state) => state.deleteCarouselPanel)
  const moveCarouselPanel = useGenerationStore((state) => state.moveCarouselPanel)
  const updateCarouselPanel = useGenerationStore((state) => state.updateCarouselPanel)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            description="Add reference images for each carousel panel. A single image can be split across multiple panels."
            eyebrow="Carousel References"
            title="Panel References"
          />
          <Button onClick={addCarouselPanel} size="sm">
            Add Panel
          </Button>
        </div>

        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-4 py-12 text-center">
            <Image className="mb-3 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">
              No panels yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add a panel to start building your carousel.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {panels.map((panel) => (
              <PanelCard
                isFirst={panel.order <= 1}
                isLast={panel.order >= panels.length}
                key={panel.id}
                onDelete={() => deleteCarouselPanel(panel.id)}
                onMoveDown={() => moveCarouselPanel(panel.id, 'down')}
                onMoveUp={() => moveCarouselPanel(panel.id, 'up')}
                panel={panel}
                updateCarouselPanel={updateCarouselPanel}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function PanelCard({
  isFirst,
  isLast,
  onDelete,
  onMoveDown,
  onMoveUp,
  panel,
  updateCarouselPanel,
}: {
  isFirst: boolean
  isLast: boolean
  onDelete: () => void
  onMoveDown: () => void
  onMoveUp: () => void
  panel: CarouselPanelDraft
  updateCarouselPanel: (panelId: string, patch: Partial<CarouselPanelDraft>) => void
}) {
  const inputId = `carousel-panel-${panel.id}`

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (file) {
      updateCarouselPanel(panel.id, {
        imageMode: 'manual',
        imageAsset: createPanelAssetSlot(file),
      })
    }
    event.target.value = ''
  }

  function handleClearImage() {
    if (panel.imageAsset?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(panel.imageAsset.previewUrl)
    }
    updateCarouselPanel(panel.id, { imageAsset: null })
  }

  return (
    <div className={cn(panelClassName, 'overflow-hidden')}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <h4 className="text-sm font-semibold">Panel {panel.order}</h4>
        <div className="flex items-center gap-0.5">
          <Button
            aria-label="Move panel up"
            disabled={isFirst}
            onClick={onMoveUp}
            size="icon"
            variant="ghost"
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            aria-label="Move panel down"
            disabled={isLast}
            onClick={onMoveDown}
            size="icon"
            variant="ghost"
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            aria-label="Delete panel"
            onClick={onDelete}
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <input
          accept={assetAccept}
          className="sr-only"
          id={inputId}
          onChange={handleFileChange}
          type="file"
        />

        {panel.imageAsset?.previewUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`Panel ${panel.order} reference`}
              className="h-auto max-h-48 w-full rounded-lg object-cover"
              src={panel.imageAsset.previewUrl}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="truncate text-sm text-muted-foreground">
                {panel.imageAsset.label}
              </p>
              <Button
                aria-label="Clear image"
                onClick={handleClearImage}
                size="sm"
                variant="ghost"
              >
                <X className="mr-1 size-3.5" />
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-center transition-colors hover:border-foreground/30 hover:bg-background/60"
            onClick={() => document.getElementById(inputId)?.click()}
            type="button"
          >
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/60">
              <Image className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Choose image</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Upload a reference image
              </p>
            </div>
            <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Upload className="size-3.5" />
              Choose file
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
