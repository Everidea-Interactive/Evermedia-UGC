'use client'

import { type ChangeEvent, useState } from 'react'
import { ChevronDown, ChevronUp, Image, Trash2, Upload, X } from 'lucide-react'

import {
  assetAccept,
  panelClassName,
  presetCompactTileClassName,
  presetGroupClassName,
  PresetGroupLabel,
  presetSubgroupClassName,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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

export function ManualCarouselSetupSection({ className }: { className?: string }) {
  const baseTemplateMode = useGenerationStore((state) => state.carouselDraft.baseTemplateMode)
  const baseTemplatePrompt = useGenerationStore((state) => state.carouselDraft.baseTemplatePrompt)
  const baseTemplateAsset = useGenerationStore((state) => state.carouselDraft.baseTemplateAsset)
  const panels = useGenerationStore((state) => state.carouselDraft.panels)
  const setCarouselBaseTemplateMode = useGenerationStore((state) => state.setCarouselBaseTemplateMode)
  const setCarouselBaseTemplatePrompt = useGenerationStore((state) => state.setCarouselBaseTemplatePrompt)
  const setCarouselBaseTemplateAsset = useGenerationStore((state) => state.setCarouselBaseTemplateAsset)
  const addCarouselPanel = useGenerationStore((state) => state.addCarouselPanel)
  const deleteCarouselPanel = useGenerationStore((state) => state.deleteCarouselPanel)
  const moveCarouselPanel = useGenerationStore((state) => state.moveCarouselPanel)
  const updateCarouselPanel = useGenerationStore((state) => state.updateCarouselPanel)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          description="Set the base panel template, configure panels, and define per-panel content."
          eyebrow="Carousel Setup"
          title="Base panel"
        />

        {/* Group 1: Base panel */}
        <div className={cn(presetGroupClassName, 'flex flex-col gap-3')}>
          <PresetGroupLabel>Base template source</PresetGroupLabel>

          <ToggleGroup
            aria-label="Base template mode"
            className="grid grid-cols-2 gap-2"
            onValueChange={(value) => {
              if (value === 'ai' || value === 'manual') {
                setCarouselBaseTemplateMode(value)
              }
            }}
            type="single"
            value={baseTemplateMode}
          >
            <ToggleGroupItem className={presetCompactTileClassName} value="ai">
              AI generate
            </ToggleGroupItem>
            <ToggleGroupItem className={presetCompactTileClassName} value="manual">
              Upload own
            </ToggleGroupItem>
          </ToggleGroup>

          {baseTemplateMode === 'ai' ? (
            <div className="flex flex-col gap-2">
              <Textarea
                aria-label="Base template prompt"
                autoComplete="off"
                className="min-h-[80px]"
                onChange={(event) => setCarouselBaseTemplatePrompt(event.target.value)}
                placeholder="Describe the base template style for all panels, e.g. white background, top image, bottom text…"
                value={baseTemplatePrompt}
              />
              <p className="text-xs text-muted-foreground">
                This prompt defines the shared template instruction sent to generation for every panel.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <BaseTemplateUploadZone
                asset={baseTemplateAsset}
                onClear={() => setCarouselBaseTemplateAsset(null)}
                onUpload={(file) => setCarouselBaseTemplateAsset(file)}
              />
              <p className="text-xs text-muted-foreground">
                Upload a reference image that defines the base panel layout and style.
              </p>
            </div>
          )}
        </div>

        {/* Group 2: Panels list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <PresetGroupLabel>Panels</PresetGroupLabel>
            <Button onClick={addCarouselPanel} size="sm">
              Add Panel
            </Button>
          </div>

          {panels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-4 py-10 text-center">
              <Image className="mb-3 size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                No panels yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Add a panel to start building your carousel.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {panels.map((panel) => (
                <PanelSummaryRow
                  isFirst={panel.order <= 1}
                  isLast={panel.order >= panels.length}
                  key={panel.id}
                  onDelete={() => deleteCarouselPanel(panel.id)}
                  onMoveDown={() => moveCarouselPanel(panel.id, 'down')}
                  onMoveUp={() => moveCarouselPanel(panel.id, 'up')}
                  panel={panel}
                />
              ))}
            </div>
          )}
        </div>

        {/* Group 3-5: Per-panel detail */}
        {panels.length > 0 ? (
          <div className="flex flex-col gap-4">
            {panels.map((panel) => (
              <PanelDetailAccordion
                key={panel.id}
                panel={panel}
                updateCarouselPanel={updateCarouselPanel}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function BaseTemplateUploadZone({
  asset,
  onClear,
  onUpload,
}: {
  asset: AssetSlot | null
  onClear: () => void
  onUpload: (file: File | null) => void
}) {
  const inputId = 'base-template-upload'

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (file) {
      onUpload(file)
    }
    event.target.value = ''
  }

  if (asset?.previewUrl) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Base template"
          className="h-auto max-h-48 w-full rounded-lg object-cover"
          src={asset.previewUrl}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="truncate text-sm text-muted-foreground">{asset.label}</p>
          <Button aria-label="Clear image" onClick={onClear} size="sm" variant="ghost">
            <X className="mr-1 size-3.5" />
            Clear
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <input
        accept={assetAccept}
        className="sr-only"
        id={inputId}
        onChange={handleFileChange}
        type="file"
      />
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
            Upload a base template reference
          </p>
        </div>
        <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Upload className="size-3.5" />
          Choose file
        </div>
      </button>
    </>
  )
}

function PanelSummaryRow({
  isFirst,
  isLast,
  onDelete,
  onMoveDown,
  onMoveUp,
  panel,
}: {
  isFirst: boolean
  isLast: boolean
  onDelete: () => void
  onMoveDown: () => void
  onMoveUp: () => void
  panel: CarouselPanelDraft
}) {
  return (
    <div className={cn(panelClassName, 'flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5')}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-semibold shrink-0">Panel {panel.order}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ModeChip label="Image" value={panel.imageMode === 'ai' ? 'AI' : 'Manual'} />
          <ModeChip label="Text" value={panel.textMode === 'ai' ? 'AI' : 'Manual'} />
          <ModeChip
            label="Template"
            value={panel.templateMode === 'override' ? 'Override' : 'Inherit'}
          />
          {panel.imageAsset?.previewUrl ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Image
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
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
  )
}

function PanelDetailAccordion({
  panel,
  updateCarouselPanel,
}: {
  panel: CarouselPanelDraft
  updateCarouselPanel: (panelId: string, patch: Partial<CarouselPanelDraft>) => void
}) {
  const [contentExpanded, setContentExpanded] = useState(() => panel.order === 1)
  const [overrideExpanded, setOverrideExpanded] = useState(false)

  return (
    <div className={cn(panelClassName, 'overflow-hidden')}>
      {/* Group 3 + 4: Content image & Text content — accordion, 1st panel open by default */}
      <button
        aria-expanded={contentExpanded}
        aria-label={`Panel ${panel.order} content`}
        className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left sm:px-5"
        onClick={() => setContentExpanded(!contentExpanded)}
        type="button"
      >
        <h4 className="text-sm font-semibold">Panel {panel.order} — Content</h4>
        {contentExpanded ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {contentExpanded ? (
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {/* Content image */}
          <div className={cn(presetSubgroupClassName, 'flex flex-col gap-3')}>
            <PresetGroupLabel>Content image</PresetGroupLabel>

            <PanelImageSection panel={panel} updateCarouselPanel={updateCarouselPanel} />
          </div>

          {/* Text content */}
          <div className={cn(presetSubgroupClassName, 'flex flex-col gap-3')}>
            <PresetGroupLabel>Text content</PresetGroupLabel>

            <PanelTextSection panel={panel} updateCarouselPanel={updateCarouselPanel} />
          </div>
        </div>
      ) : null}

      {/* Group 5: Override base panel template — collapsed by default */}
      <button
        aria-expanded={overrideExpanded}
        aria-label={`Panel ${panel.order} template override`}
        className="flex w-full items-center justify-between border-t border-border px-4 py-3 text-left sm:px-5"
        onClick={() => setOverrideExpanded(!overrideExpanded)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Override base panel template</h4>
          <ModeChip
            label="Template"
            value={panel.templateMode === 'override' ? 'Override' : 'Inherit'}
          />
        </div>
        {overrideExpanded ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {overrideExpanded ? (
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <ToggleGroup
            aria-label={`Panel ${panel.order} template mode`}
            className="grid grid-cols-2 gap-2"
            onValueChange={(value) => {
              if (value === 'inherit' || value === 'override') {
                updateCarouselPanel(panel.id, { templateMode: value })
              }
            }}
            type="single"
            value={panel.templateMode}
          >
            <ToggleGroupItem className={presetCompactTileClassName} value="inherit">
              Use base template
            </ToggleGroupItem>
            <ToggleGroupItem className={presetCompactTileClassName} value="override">
              Override
            </ToggleGroupItem>
          </ToggleGroup>

          {panel.templateMode === 'override' ? (
            <Textarea
              aria-label={`Panel ${panel.order} template override prompt`}
              autoComplete="off"
              className="min-h-[80px]"
              onChange={(event) =>
                updateCarouselPanel(panel.id, { templatePrompt: event.target.value })
              }
              placeholder="Describe the override template for this panel…"
              value={panel.templatePrompt}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PanelImageSection({
  panel,
  updateCarouselPanel,
}: {
  panel: CarouselPanelDraft
  updateCarouselPanel: (panelId: string, patch: Partial<CarouselPanelDraft>) => void
}) {
  const inputId = `panel-image-${panel.id}`

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
    <div className="flex flex-col gap-3">
      <ToggleGroup
        aria-label={`Panel ${panel.order} image mode`}
        className="grid grid-cols-2 gap-2"
        onValueChange={(value) => {
          if (value === 'ai' || value === 'manual') {
            updateCarouselPanel(panel.id, { imageMode: value })
          }
        }}
        type="single"
        value={panel.imageMode}
      >
        <ToggleGroupItem className={presetCompactTileClassName} value="ai">
          Generate
        </ToggleGroupItem>
        <ToggleGroupItem className={presetCompactTileClassName} value="manual">
          Upload
        </ToggleGroupItem>
      </ToggleGroup>

      {panel.imageMode === 'ai' ? (
        <Textarea
          aria-label={`Panel ${panel.order} image prompt`}
          autoComplete="off"
          className="min-h-[80px]"
          onChange={(event) =>
            updateCarouselPanel(panel.id, { imagePrompt: event.target.value })
          }
          placeholder="Describe the image to generate for this panel…"
          value={panel.imagePrompt}
        />
      ) : (
        <div className="flex flex-col gap-2">
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
                alt={`Panel ${panel.order} image`}
                className="h-auto max-h-40 w-full rounded-lg object-cover"
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
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-center transition-colors hover:border-foreground/30 hover:bg-background/60"
              onClick={() => document.getElementById(inputId)?.click()}
              type="button"
            >
              <Image className="size-5 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                Upload image for panel {panel.order}
              </p>
              <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Upload className="size-3.5" />
                Choose file
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PanelTextSection({
  panel,
  updateCarouselPanel,
}: {
  panel: CarouselPanelDraft
  updateCarouselPanel: (panelId: string, patch: Partial<CarouselPanelDraft>) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        aria-label={`Panel ${panel.order} text mode`}
        className="grid grid-cols-2 gap-2"
        onValueChange={(value) => {
          if (value === 'ai' || value === 'manual') {
            updateCarouselPanel(panel.id, { textMode: value })
          }
        }}
        type="single"
        value={panel.textMode}
      >
        <ToggleGroupItem className={presetCompactTileClassName} value="ai">
          Generate
        </ToggleGroupItem>
        <ToggleGroupItem className={presetCompactTileClassName} value="manual">
          Input manually
        </ToggleGroupItem>
      </ToggleGroup>

      {panel.textMode === 'ai' ? (
        <Textarea
          aria-label={`Panel ${panel.order} text prompt`}
          autoComplete="off"
          className="min-h-[80px]"
          onChange={(event) =>
            updateCarouselPanel(panel.id, { textPrompt: event.target.value })
          }
          placeholder="Describe the text content to generate…"
          value={panel.textPrompt}
        />
      ) : (
        <Textarea
          aria-label={`Panel ${panel.order} text value`}
          autoComplete="off"
          className="min-h-[80px]"
          onChange={(event) =>
            updateCarouselPanel(panel.id, { textValue: event.target.value })
          }
          placeholder="Enter the text content for this panel…"
          value={panel.textValue}
        />
      )}
    </div>
  )
}

function ModeChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}: {value}
    </span>
  )
}
