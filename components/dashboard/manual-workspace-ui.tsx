'use client'

import { type ChangeEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { LoaderCircle, Upload, X } from 'lucide-react'

import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Button } from '@/components/ui/button'
import type { AssetSlot, GenerationCostEstimate } from '@/lib/generation/types'
import { isImageMimeType } from '@/lib/media/image-preview'
import { useUsdToIdrRate } from '@/lib/generation/use-usd-idr-rate'
import { cn } from '@/lib/utils'

export const panelClassName = 'rounded-2xl border border-border bg-card'
export const insetPanelClassName = 'rounded-xl border border-border bg-background'
export const rowClassName = 'rounded-lg border border-border bg-background'
export const tileClassName =
  'min-h-10 w-full items-center justify-center whitespace-normal px-3 py-2.5 text-center leading-tight'
export const presetTileClassName =
  'preset-chip min-h-[2.9rem] w-full items-center justify-center whitespace-normal rounded-lg border px-3.5 py-2 text-center text-sm font-semibold leading-tight'
export const presetCompactTileClassName =
  'preset-chip preset-chip-compact w-full items-center justify-center whitespace-normal rounded-lg border text-sm font-semibold leading-tight'
export const presetGroupClassName =
  'rounded-xl border border-border/80 bg-background/70 p-3.5 sm:p-4'
export const presetSubgroupClassName =
  'rounded-lg border border-border/70 bg-secondary/35 p-3'
export const assetAccept = 'image/*,video/*'

function handleFileInput(
  event: ChangeEvent<HTMLInputElement>,
  onSelect: (file: File | null) => void,
) {
  const file = event.target.files?.[0] ?? null

  onSelect(file)
  event.target.value = ''
}

function getReferenceCardErrorLabel(slot: AssetSlot) {
  if (!slot.error) {
    return null
  }

  return 'Error'
}

function formatEstimatedCreditsValue(estimate: GenerationCostEstimate) {
  if (estimate.credits === null) {
    return '0'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(estimate.credits) ? 0 : 1,
  }).format(estimate.credits)
}

function formatEstimatedUsdValue(
  estimate: GenerationCostEstimate,
  usdToIdrRate: number,
) {
  if (estimate.usd === null) {
    return 'Rp0'
  }

  const idr = estimate.usd * usdToIdrRate

  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(idr)
}

export function ImagePreviewTrigger({
  alt,
  children,
  className,
  label,
  src,
}: {
  alt: string
  children: ReactNode
  className?: string
  label: string
  src: string
}) {
  return (
    <ImagePreviewDialog alt={alt} label={label} src={src}>
      <button
        className={cn(
          'block h-full w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className,
        )}
        type="button"
      >
        {children}
      </button>
    </ImagePreviewDialog>
  )
}

export function SectionHeader({
  description,
  eyebrow,
  title,
}: {
  description: string
  eyebrow: string
  title: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-balance font-display text-lg font-semibold">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export function ControlGroup({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode
  className?: string
  description: string
  title: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function PresetGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  )
}

export function ReferenceCardGroup({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title: string
}) {
  return (
    <div className={cn('flex w-full flex-col gap-2.5', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
        {children}
      </div>
    </div>
  )
}

export function ReferenceCard({
  className,
  icon: Icon,
  inputId,
  onClear,
  onSelect,
  previewContainerClassName,
  previewMediaClassName,
  slot,
}: {
  className?: string
  icon: LucideIcon
  inputId: string
  onClear: () => void
  onSelect: (file: File | null) => void
  previewContainerClassName?: string
  previewMediaClassName?: string
  slot: AssetSlot
}) {
  const previewSrc = slot.previewUrl
  const hasMedia = Boolean(previewSrc)
  const errorLabel = getReferenceCardErrorLabel(slot)
  const showFooterMeta = hasMedia || Boolean(slot.error) || slot.uploadStatus === 'staged'

  return (
    <div
      className={cn(
        'reference-card group relative min-h-[14rem] overflow-hidden rounded-[1rem] border bg-background transition-colors sm:aspect-square sm:min-h-0',
        slot.error
          ? 'border-destructive/45 bg-destructive/5'
          : 'border-border hover:border-foreground/30',
        className,
      )}
    >
      <input
        accept={assetAccept}
        className="sr-only"
        id={inputId}
        onChange={(event) => handleFileInput(event, onSelect)}
        type="file"
      />

      {previewSrc ? (
        slot.mimeType && isImageMimeType(slot.mimeType) ? (
          <ImagePreviewTrigger
            alt={`${slot.label} reference preview`}
            className="absolute inset-0 rounded-[1rem]"
            label={slot.label}
            src={previewSrc}
          >
            <div className={cn('absolute inset-0', previewContainerClassName)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${slot.label} reference preview`}
                className={cn('h-full w-full object-cover', previewMediaClassName)}
                src={previewSrc}
              />
            </div>
          </ImagePreviewTrigger>
        ) : (
          <video
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              previewContainerClassName,
              previewMediaClassName,
            )}
            controls
            playsInline
            preload="metadata"
            src={previewSrc}
          />
        )
      ) : (
        <Button
          className="absolute inset-0 flex h-auto w-auto flex-col items-center justify-center gap-3 px-4 text-center"
          onClick={() => document.getElementById(inputId)?.click()}
          type="button"
          variant="ghost"
        >
          <div className="flex size-12 items-center justify-center rounded-full border border-border bg-secondary/70 text-foreground">
            <Icon className="size-5" suppressHydrationWarning />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {slot.label}
            </p>
            <p className="text-xs text-muted-foreground">Upload image or video</p>
          </div>
          <div className="reference-upload-chip inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Upload className="size-3.5" suppressHydrationWarning />
            Choose file
          </div>
        </Button>
      )}

      {showFooterMeta ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/88 to-transparent px-3 pb-3 pt-8">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {slot.label}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {errorLabel ?? (hasMedia ? 'Ready' : 'Not loaded')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {slot.uploadStatus === 'staged' && !hasMedia ? (
                <LoaderCircle
                  className="size-4 animate-spin text-muted-foreground"
                  suppressHydrationWarning
                />
              ) : null}
              {hasMedia ? (
                <Button
                  className="pointer-events-auto"
                  onClick={onClear}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <X className="size-4" suppressHydrationWarning />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function PreviewSnapshotItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className={cn(rowClassName, 'px-3 py-2.5 sm:px-3.5 sm:py-3')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold leading-5 tracking-tight text-foreground sm:text-base">
        {value}
      </p>
    </div>
  )
}

export function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-secondary/70 px-3 py-2 sm:px-3.5 sm:py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="min-w-0 break-words text-[13px] font-medium leading-5 tracking-tight text-foreground sm:text-sm">
          {value}
        </p>
      </div>
    </div>
  )
}

export function GenerationEstimateStrip({
  estimate,
  isLoading,
  reason,
}: {
  estimate: GenerationCostEstimate
  isLoading: boolean
  reason: string
}) {
  const { rate: usdToIdrRate } = useUsdToIdrRate()
  const primaryText = estimate.available
    ? `Estimated: ${formatEstimatedCreditsValue(estimate)} credits`
    : isLoading
      ? 'Checking estimate'
      : 'Estimate unavailable'
  const secondaryText = estimate.available
    ? `≈ ${formatEstimatedUsdValue(estimate, usdToIdrRate)}`
    : !isLoading
      ? reason
      : null

  return (
    <div className="rounded-md border border-border bg-secondary/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Estimated cost
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium tracking-tight text-foreground">
          {primaryText}
        </p>
        {secondaryText ? (
          <p className="text-xs text-muted-foreground">{secondaryText}</p>
        ) : null}
      </div>
    </div>
  )
}
