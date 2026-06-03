'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Image } from 'lucide-react'

import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  panelClassName,
  presetCompactTileClassName,
  presetGroupClassName,
  PresetGroupLabel,
  presetSubgroupClassName,
  SectionHeader,
} from '@/components/dashboard/manual-workspace-ui'
import type { CarouselPanelDraft } from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

export function ManualCarouselPresetSection({ className }: { className?: string }) {
  const globalPanelStyle = useGenerationStore(
    (state) => state.carouselDraft.globalPanelStyle,
  )
  const panels = useGenerationStore((state) => state.carouselDraft.panels)
  const updateCarouselDraft = useGenerationStore(
    (state) => state.updateCarouselDraft,
  )
  const updateCarouselPanel = useGenerationStore(
    (state) => state.updateCarouselPanel,
  )

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          description="Set the global panel style, text layout, and branding for every carousel panel."
          eyebrow="Carousel Preset"
          title="Panel Preset"
        />

        <div className={cn(presetGroupClassName, 'flex flex-col gap-3')}>
          <PresetGroupLabel>Global Panel Style</PresetGroupLabel>
          <Textarea
            aria-label="Global panel style"
            autoComplete="off"
            onChange={(event) =>
              updateCarouselDraft({ globalPanelStyle: event.target.value })
            }
            placeholder="Describe the shared style for all panels, e.g. white background, top image, bottom text…"
            value={globalPanelStyle}
          />
          <p className="text-xs text-muted-foreground">
            This style applies to every panel unless overridden below.
          </p>
        </div>

        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-4 py-12 text-center">
            <Image className="mb-3 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">
              No panels yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add panels in the References section to configure per-panel
              overrides.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {panels.map((panel) => (
              <CarouselPresetPanelCard
                key={panel.id}
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

function CarouselPresetPanelCard({
  panel,
  updateCarouselPanel,
}: {
  panel: CarouselPanelDraft
  updateCarouselPanel: (
    panelId: string,
    patch: Partial<CarouselPanelDraft>,
  ) => void
}) {
  const [expanded, setExpanded] = useState(
    () => panel.order === 1,
  )

  return (
    <div className={cn(panelClassName, 'overflow-hidden')}>
      <button
        aria-expanded={expanded}
        aria-label={`Panel ${panel.order} preset`}
        className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left sm:px-5"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Panel {panel.order}</h4>
          <div className="flex items-center gap-1.5">
            <ModeChip
              label="Style"
              value={panel.styleMode === 'override' ? 'Override' : 'Inherit'}
            />
            <ModeChip
              label="Image"
              value={panel.imageMode === 'ai' ? 'AI' : 'Manual'}
            />
            <ModeChip
              label="Text"
              value={panel.textMode === 'ai' ? 'AI' : 'Manual'}
            />
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className={cn(presetSubgroupClassName, 'flex flex-col gap-3')}>
            <PresetGroupLabel>Style</PresetGroupLabel>

            <ToggleGroup
              aria-label={`Panel ${panel.order} style mode`}
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value === 'inherit' || value === 'override') {
                  updateCarouselPanel(panel.id, {
                    styleMode: value,
                  })
                }
              }}
              type="single"
              value={panel.styleMode}
            >
              <ToggleGroupItem
                className={presetCompactTileClassName}
                value="inherit"
              >
                Inherit
              </ToggleGroupItem>
              <ToggleGroupItem
                className={presetCompactTileClassName}
                value="override"
              >
                Override
              </ToggleGroupItem>
            </ToggleGroup>

            {panel.styleMode === 'override' ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  aria-label={`Panel ${panel.order} style prompt`}
                  autoComplete="off"
                  className="min-h-[80px]"
                  onChange={(event) =>
                    updateCarouselPanel(panel.id, {
                      stylePrompt: event.target.value,
                    })
                  }
                  placeholder="Describe the override style for this panel…"
                  value={panel.stylePrompt}
                />

                <div className="flex flex-col gap-1.5">
                  <PresetGroupLabel>Style Generation</PresetGroupLabel>
                  <ToggleGroup
                    aria-label={`Panel ${panel.order} style generation`}
                    className="grid grid-cols-2 gap-2"
                    onValueChange={(value) => {
                      if (value === 'true' || value === 'false') {
                        updateCarouselPanel(panel.id, {
                          styleGenerationEnabled: value === 'true',
                        })
                      }
                    }}
                    type="single"
                    value={panel.styleGenerationEnabled ? 'true' : 'false'}
                  >
                    <ToggleGroupItem
                      className={presetCompactTileClassName}
                      value="true"
                    >
                      Auto
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      className={presetCompactTileClassName}
                      value="false"
                    >
                      Off
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            ) : null}
          </div>

          <div className={cn(presetSubgroupClassName, 'flex flex-col gap-3')}>
            <PresetGroupLabel>Image</PresetGroupLabel>

            <CarouselModeField
              ariaLabelPrefix={`Panel ${panel.order} image`}
              modes={[
                { label: 'AI', value: 'ai' },
                { label: 'Manual', value: 'manual' },
              ]}
              onModeChange={(value) => {
                if (value === 'ai' || value === 'manual') {
                  updateCarouselPanel(panel.id, { imageMode: value })
                }
              }}
              value={panel.imageMode}
            />

            {panel.imageMode === 'ai' ? (
              <Textarea
                aria-label={`Panel ${panel.order} image prompt`}
                autoComplete="off"
                className="min-h-[80px]"
                onChange={(event) =>
                  updateCarouselPanel(panel.id, {
                    imagePrompt: event.target.value,
                  })
                }
                placeholder="Describe the image to generate for this panel…"
                value={panel.imagePrompt}
              />
            ) : panel.imageAsset?.previewUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Panel ${panel.order} image`}
                  className="h-auto max-h-40 w-full rounded-lg object-cover"
                  src={panel.imageAsset.previewUrl}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {panel.imageAsset.label}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No image uploaded. Upload one in the References section.
              </p>
            )}
          </div>

          <div className={cn(presetSubgroupClassName, 'flex flex-col gap-3')}>
            <PresetGroupLabel>Text</PresetGroupLabel>

            <CarouselModeField
              ariaLabelPrefix={`Panel ${panel.order} text`}
              modes={[
                { label: 'AI', value: 'ai' },
                { label: 'Manual', value: 'manual' },
              ]}
              onModeChange={(value) => {
                if (value === 'ai' || value === 'manual') {
                  updateCarouselPanel(panel.id, { textMode: value })
                }
              }}
              value={panel.textMode}
            />

            {panel.textMode === 'ai' ? (
              <Textarea
                aria-label={`Panel ${panel.order} text prompt`}
                autoComplete="off"
                className="min-h-[80px]"
                onChange={(event) =>
                  updateCarouselPanel(panel.id, {
                    textPrompt: event.target.value,
                  })
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
                  updateCarouselPanel(panel.id, {
                    textValue: event.target.value,
                  })
                }
                placeholder="Enter the text content for this panel…"
                value={panel.textValue}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CarouselModeField({
  ariaLabelPrefix,
  modes,
  onModeChange,
  value,
}: {
  ariaLabelPrefix: string
  modes: { label: string; value: string }[]
  onModeChange: (value: string) => void
  value: string
}) {
  return (
    <Select
      aria-label={`${ariaLabelPrefix} mode`}
      onChange={(event) => onModeChange(event.target.value)}
      value={value}
    >
      {modes.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </Select>
  )
}

function ModeChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}: {value}
    </span>
  )
}
