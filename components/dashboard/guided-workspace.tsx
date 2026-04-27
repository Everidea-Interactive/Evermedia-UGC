'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Film,
  ImageIcon,
  LoaderCircle,
  ScanLine,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'

import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  buildGuidedAnalysisFormData,
  buildGuidedGenerationFormData,
} from '@/lib/generation/client'
import {
  clampGuidedShotCount,
  getGuidedCreativeStyleForConcept,
  kieAnalysisModels,
} from '@/lib/generation/guided'
import {
  getGenerationCostEstimate,
  getGenerationCreditValidation,
} from '@/lib/generation/pricing'
import {
  getCompletedVariantCount,
  getFailedVariantCount,
} from '@/lib/generation/run-copy'
import type {
  AssetSlot,
  CameraMovement,
  ContentConcept,
  GenerationCostEstimate,
  GenerationRun,
  GuidedAnalysisPlan,
  GuidedAnalysisShot,
  GuidedAnalysisStatus,
  ImageModelOption,
  KieAnalysisModel,
  KiePricingResponse,
  KieStatusResponse,
  OutputQuality,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import { isImageMimeType } from '@/lib/media/image-preview'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const panelClassName = 'rounded-2xl border border-border bg-card'
const insetPanelClassName = 'rounded-xl border border-border bg-background'
const rowClassName = 'rounded-lg border border-border bg-background'
const fieldLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'

const outputQualities: OutputQuality[] = ['720p', '1080p', '4k']
const videoDurations: VideoDuration[] = ['base', 'extended']

const conceptCopy = {
  affiliate: {
    description:
      'Natural creator-style visuals optimized for trust, relatability, and product persuasion.',
    label: 'Affiliate',
  },
  'driven-ads': {
    description:
      'Sharper direct-response visuals with cleaner selling angles and stronger conversion framing.',
    label: 'Driven Ads',
  },
} as const

const analysisModelLabels = {
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
} as const

const imageModelLabels = {
  'grok-imagine': 'Grok Imagine',
  'nano-banana': 'Nano Banana 2',
} as const

const videoModelLabels = {
  'grok-imagine': 'Grok Imagine',
  kling: 'Kling',
  'seedance-1.5-pro': 'Seedance 1.5 Pro',
  'veo-3.1': 'Veo 3.1',
} as const

const cameraMovementLabels: Record<CameraMovement, string> = {
  'crash-zoom': 'Crash Zoom',
  dolly: 'Dolly',
  drone: 'Drone',
  macro: 'Macro',
  orbit: 'Orbit',
}

const outputModeCopy = {
  image: {
    description: 'Analyze one product image, edit still prompts, then render images.',
    label: 'Image Guided',
  },
  video: {
    description: 'Analyze one product image, edit motion prompts, then render videos.',
    label: 'Video Guided',
  },
} as const

function handleFileInput(
  event: ChangeEvent<HTMLInputElement>,
  onSelect: (file: File | null) => void,
) {
  const file = event.target.files?.[0] ?? null

  onSelect(file)
  event.target.value = ''
}

function handleFileTriggerKeyDown(
  event: KeyboardEvent<HTMLLabelElement>,
  inputId: string,
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  document.getElementById(inputId)?.click()
}

function isSlotLoaded(slot: AssetSlot) {
  return Boolean(slot.file || slot.previewUrl)
}

function hasActiveGeneration(run: GenerationRun) {
  return run.status === 'rendering'
}

function formatEstimateCredits(credits: number | null) {
  if (credits === null) {
    return '0'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(credits) ? 0 : 1,
  }).format(credits)
}

function formatEstimateUsd(usd: number | null) {
  if (usd === null) {
    return '0.00'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 2,
  }).format(usd)
}

function getAnalysisStatusLabel(status: GuidedAnalysisStatus) {
  switch (status) {
    case 'analyzing':
      return 'Analyzing'
    case 'ready':
      return 'Ready'
    case 'error':
      return 'Needs Attention'
    default:
      return 'Waiting'
  }
}

function getGuidedVideoDurationLabel(
  model: VideoModelOption,
  duration: VideoDuration,
) {
  if (model === 'kling') {
    return duration === 'base' ? 'Base (5s)' : 'Extended (10s)'
  }

  if (model === 'grok-imagine') {
    return duration === 'base' ? 'Base (6s)' : 'Extended (10s)'
  }

  if (model === 'seedance-1.5-pro') {
    return duration === 'base' ? 'Base (8s)' : 'Extended (12s)'
  }

  return '8s'
}

function getAnalyzeHelperText({
  hasHero,
  hasPlan,
  status,
}: {
  hasHero: boolean
  hasPlan: boolean
  status: GuidedAnalysisStatus
}) {
  if (status === 'analyzing') {
    return 'Analyzing the hero image and rebuilding the guided shot list...'
  }

  if (!hasHero) {
    return 'Upload the hero product image to unlock guided analysis.'
  }

  if (hasPlan) {
    return 'Hero image ready. Re-analyze when you want to replace the current prompt set.'
  }

  return 'Hero image ready. Analyze to generate the guided shot list.'
}

function getGenerateHelperText({
  activeRun,
  creditReason,
  hasHero,
  hasPlan,
}: {
  activeRun: boolean
  creditReason: string | null
  hasHero: boolean
  hasPlan: boolean
}) {
  if (activeRun) {
    return 'The current guided batch is still rendering. Cancel it first if you need to restart.'
  }

  if (!hasHero) {
    return 'The hero product image is still required before you can generate the batch.'
  }

  if (!hasPlan) {
    return 'Analyze the hero product first to unlock prompt editing and rendering.'
  }

  if (creditReason) {
    return creditReason
  }

  return 'Prompt set is ready. Generate the guided batch when the prompts look right.'
}

function createGuidedEstimateInput(input: {
  activeTab: WorkspaceTab
  endFrameAsset: AssetSlot
  heroAsset: AssetSlot
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  shotCount: 1 | 2 | 3 | 4
  shots: GuidedAnalysisShot[]
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}) {
  return {
    activeTab: input.activeTab,
    assets: {
      clothing: {
        error: null,
        file: null,
        id: 'guided-clothing',
        label: 'Clothing',
        mimeType: null,
        previewUrl: null,
        size: null,
        uploadStatus: 'idle' as const,
      },
      endFrame: {
        ...input.endFrameAsset,
        file: input.activeTab === 'video' ? input.endFrameAsset.file : null,
      },
      face1: {
        error: null,
        file: null,
        id: 'guided-face1',
        label: 'Face 1',
        mimeType: null,
        previewUrl: null,
        size: null,
        uploadStatus: 'idle' as const,
      },
      face2: {
        error: null,
        file: null,
        id: 'guided-face2',
        label: 'Face 2',
        mimeType: null,
        previewUrl: null,
        size: null,
        uploadStatus: 'idle' as const,
      },
      location: {
        error: null,
        file: null,
        id: 'guided-location',
        label: 'Location',
        mimeType: null,
        previewUrl: null,
        size: null,
        uploadStatus: 'idle' as const,
      },
    },
    batchSize: input.shots.length
      ? clampGuidedShotCount(input.shots.length)
      : input.shotCount,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    products: [input.heroAsset],
    subjectMode: input.shots[0]?.subjectMode ?? 'product-only',
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
  }
}

function getGuidedRunStatusCopy(run: GenerationRun, hasPlan: boolean) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'rendering':
      return {
        badgeVariant: 'secondary' as const,
        label: 'Rendering',
        title: `Generating ${total} guided result${total === 1 ? '' : 's'}`,
        body: `${completed} of ${total} result${total === 1 ? '' : 's'} are ready. Remaining tasks refresh automatically every few seconds.`,
      }
    case 'success':
      return {
        badgeVariant: 'outline' as const,
        label: 'Ready',
        title: `${completed} guided result${completed === 1 ? '' : 's'} ready`,
        body: 'Review the saved outputs below or adjust the prompts and generate another batch.',
      }
    case 'partial-success':
      return {
        badgeVariant: 'secondary' as const,
        label: 'Partial',
        title: `${completed} ready, ${failed} failed`,
        body: 'Completed results are ready below. Adjust any weak prompts before generating again.',
      }
    case 'error':
      return {
        badgeVariant: 'secondary' as const,
        label: 'Failed',
        title: total > 0 ? 'No usable outputs in this batch' : 'Generation did not complete',
        body:
          run.error ??
          'The provider rejected the guided batch. Adjust the prompts or render settings and try again.',
      }
    case 'cancelled':
      return {
        badgeVariant: 'secondary' as const,
        label: 'Cancelled',
        title: 'Guided batch cancelled',
        body: 'Any completed results remain available below. Update the prompts or settings before running again.',
      }
    default:
      if (hasPlan) {
        return {
          badgeVariant: 'outline' as const,
          label: 'Ready to Render',
          title: 'Shot plan is ready',
          body: 'Keep refining the prompts on the left, then render the guided batch from this panel.',
        }
      }

      return {
        badgeVariant: 'outline' as const,
        label: 'Waiting for Analysis',
        title: 'No shot plan yet',
        body: 'Analyze the hero product first. The prompt set and render controls will stay coordinated here.',
      }
  }
}

function FieldBlock({
  children,
  description,
  htmlFor,
  label,
}: {
  children: ReactNode
  description: string
  htmlFor?: string
  label: string
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        {htmlFor ? (
          <label className={fieldLabelClassName} htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <p className={fieldLabelClassName}>{label}</p>
        )}
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/35 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function GuidedHeroUploadCard({ slot }: { slot: AssetSlot }) {
  const clearGuidedHeroAsset = useGenerationStore((state) => state.clearGuidedHeroAsset)
  const setGuidedHeroFile = useGenerationStore((state) => state.setGuidedHeroFile)
  const previewUrl = slot.previewUrl
  const inputId = 'guided-hero-upload'

  return (
    <div className={cn(insetPanelClassName, 'grid gap-5 p-4 sm:p-5')}>
      <div className="grid gap-1">
        <p className={fieldLabelClassName}>Hero Product</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Upload the single product image that anchors the guided shot plan. Use PNG,
          JPG, JPEG, WEBP, or GIF.
        </p>
      </div>

        <input
          accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          id={inputId}
          onChange={(event) => handleFileInput(event, setGuidedHeroFile)}
          type="file"
        />

      {previewUrl ? (
        <>
          <div
            className={cn(
              'relative min-h-[24rem] overflow-hidden rounded-2xl border bg-secondary/30 sm:min-h-[30rem] lg:min-h-[34rem]',
              previewUrl ? 'border-border' : 'border-dashed border-border/70',
            )}
          >
            {slot.mimeType && isImageMimeType(slot.mimeType) ? (
              <ImagePreviewDialog
                alt="Guided hero product preview"
                label={slot.label}
                src={previewUrl}
              >
                <button
                  className="absolute inset-0 block w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)] text-left"
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Guided hero product preview"
                    className="h-full w-full object-contain p-6 sm:p-8"
                    src={previewUrl}
                  />
                </button>
              </ImagePreviewDialog>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-secondary/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{slot.label}</p>
              <p className="text-xs text-muted-foreground">Ready for analysis</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <label
                  htmlFor={inputId}
                  onKeyDown={(event) => handleFileTriggerKeyDown(event, inputId)}
                  role="button"
                  tabIndex={0}
                >
                  <Upload data-icon="inline-start" suppressHydrationWarning />
                  Replace
                </label>
              </Button>
              <Button
                aria-label="Clear guided hero image"
                onClick={clearGuidedHeroAsset}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X data-icon="inline-start" suppressHydrationWarning />
                Clear
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-8 text-center sm:min-h-[30rem] lg:min-h-[34rem]">
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground">
            <ImageIcon className="size-6" suppressHydrationWarning />
          </div>
          <div>
            <p className="font-medium text-foreground">Upload the hero product image</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Guided mode uses one product image as the visual anchor for shot
              planning and final rendering.
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <label
              htmlFor={inputId}
              onKeyDown={(event) => handleFileTriggerKeyDown(event, inputId)}
              role="button"
              tabIndex={0}
            >
              <Upload data-icon="inline-start" suppressHydrationWarning />
              Upload Image
            </label>
          </Button>
        </div>
      )}

      <p className="text-sm leading-6 text-muted-foreground">
        {previewUrl
          ? 'You can replace the hero image before re-analyzing or rendering again.'
          : 'A hero image is required before guided analysis can begin.'}
      </p>
    </div>
  )
}

function GuidedEndFrameUploadCard({ slot }: { slot: AssetSlot }) {
  const clearGuidedEndFrameAsset = useGenerationStore(
    (state) => state.clearGuidedEndFrameAsset,
  )
  const setGuidedEndFrameFile = useGenerationStore(
    (state) => state.setGuidedEndFrameFile,
  )
  const previewUrl = slot.previewUrl
  const inputId = 'guided-end-frame-upload'

  return (
    <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
      <input
        accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        id={inputId}
        onChange={(event) => handleFileInput(event, setGuidedEndFrameFile)}
        type="file"
      />

      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/70 text-muted-foreground">
          <ScanLine className="size-5" suppressHydrationWarning />
        </div>
        <div className="min-w-0">
          <p className={fieldLabelClassName}>Optional End Frame</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add a final frame for video models that support first-and-last-frame
            guidance.
          </p>
        </div>
      </div>

      {previewUrl && slot.mimeType && isImageMimeType(slot.mimeType) ? (
        <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
          <ImagePreviewDialog
            alt="Guided end frame preview"
            label={slot.label}
            src={previewUrl}
          >
            <button className="block w-full text-left" type="button">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Guided end frame preview"
                className="aspect-video w-full object-contain p-3"
                src={previewUrl}
              />
            </button>
          </ImagePreviewDialog>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <label
            htmlFor={inputId}
            onKeyDown={(event) => handleFileTriggerKeyDown(event, inputId)}
            role="button"
            tabIndex={0}
          >
            <Upload data-icon="inline-start" suppressHydrationWarning />
            {previewUrl ? 'Replace' : 'Upload End Frame'}
          </label>
        </Button>
        {previewUrl ? (
          <Button
            aria-label="Clear guided end frame"
            onClick={clearGuidedEndFrameAsset}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X data-icon="inline-start" suppressHydrationWarning />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function GuidedResultTile({
  variant,
}: {
  variant: GenerationRun['variants'][number]
}) {
  const content = variant.result?.url ? (
    variant.result.type === 'image' ? (
      <ImagePreviewDialog
        alt={`${variant.profile} result`}
        label={variant.profile}
        src={variant.result.url}
      >
        <button className="block h-full w-full text-left" type="button">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${variant.profile} result`}
            className="aspect-[3/4] w-full object-cover"
            src={variant.result.url}
          />
        </button>
      </ImagePreviewDialog>
    ) : (
      <video
        aria-label={`${variant.profile} result`}
        className="aspect-[3/4] w-full bg-black object-cover"
        controls
        playsInline
        preload="metadata"
        src={variant.result.url}
      />
    )
  ) : (
    <div className="flex aspect-[3/4] items-center justify-center bg-secondary/50 text-center text-sm text-muted-foreground">
      <div className="grid gap-2 px-4">
        {variant.status === 'rendering' ? (
          <LoaderCircle className="mx-auto size-6 animate-spin" suppressHydrationWarning />
        ) : (
          <AlertTriangle className="mx-auto size-6" suppressHydrationWarning />
        )}
        <span>
          {variant.status === 'rendering'
            ? 'Generating...'
            : variant.error ?? 'Render failed'}
        </span>
      </div>
    </div>
  )

  return (
    <article className={cn(rowClassName, 'overflow-hidden')}>
      {content}
      <div className="grid gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground">{variant.profile}</p>
          <Badge variant={variant.status === 'success' ? 'outline' : 'secondary'}>
            {variant.status}
          </Badge>
        </div>
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
          {variant.prompt}
        </p>
      </div>
    </article>
  )
}

function GuidedOutputModeSection({
  activeTab,
  setActiveTab,
}: {
  activeTab: WorkspaceTab
  setActiveTab: (activeTab: WorkspaceTab) => void
}) {
  return (
    <section className={cn(panelClassName, 'p-3 sm:p-4')}>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Output mode
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose whether Guided builds a still render or a motion render
            before analyzing the product.
          </p>
        </div>

        <Tabs
          onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
          value={activeTab}
        >
          <TabsList aria-label="Guided Workspace Tabs" className="w-full grid-cols-2">
            {(['image', 'video'] as const).map((value) => {
              const Icon = value === 'image' ? ImageIcon : Film
              const copy = outputModeCopy[value]

              return (
                <TabsTrigger
                  className="min-h-[5rem] px-5 py-4 sm:min-h-[5.5rem]"
                  key={value}
                  value={value}
                >
                  <span className="mx-auto flex w-full max-w-[12rem] items-center justify-center gap-3 text-left">
                    <Icon className="size-5 shrink-0" suppressHydrationWarning />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-base font-semibold">{copy.label}</span>
                      <span className="text-xs font-normal text-current/72">
                        {copy.description}
                      </span>
                    </span>
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>
    </section>
  )
}

function GuidedAnalyzePanel({
  activeTab,
  analysisError,
  analysisHelperText,
  analysisStatus,
  cameraMovement,
  canAnalyze,
  guidedInput,
  onAnalyze,
  onReset,
  setCameraMovement,
  setGuidedAnalysisModel,
  setGuidedContentConcept,
  setGuidedProductUrl,
  setGuidedShotCount,
}: {
  activeTab: WorkspaceTab
  analysisError: string | null
  analysisHelperText: string
  analysisStatus: GuidedAnalysisStatus
  cameraMovement: CameraMovement | null
  canAnalyze: boolean
  guidedInput: {
    analysisModel: KieAnalysisModel
    contentConcept: ContentConcept
    heroAsset: AssetSlot
    productUrl: string
    shotCount: 1 | 2 | 3 | 4
  }
  onAnalyze: () => void
  onReset: () => void
  setCameraMovement: (cameraMovement: CameraMovement | null) => void
  setGuidedAnalysisModel: (model: KieAnalysisModel) => void
  setGuidedContentConcept: (concept: ContentConcept) => void
  setGuidedProductUrl: (productUrl: string) => void
  setGuidedShotCount: (shotCount: 1 | 2 | 3 | 4) => void
}) {
  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5')}>
      <div className="grid gap-5">
        <div className="grid gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Step 1
              </p>
              <h2 className="font-display text-xl font-semibold">Analyze input</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Upload the hero product, add any page context, then generate the
                initial shot list before editing the prompts.
              </p>
            </div>

            <Button onClick={onReset} size="sm" variant="ghost">
              Reset Guided Mode
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(420px,1.14fr)_minmax(0,0.86fr)]">
          <GuidedHeroUploadCard slot={guidedInput.heroAsset} />

          <div className="grid gap-4">
            <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
              <FieldBlock
                description="Optional enrichment for the page title, description, and product schema."
                htmlFor="guided-product-url"
                label="Product URL"
              >
                <Input
                  aria-label="Product URL"
                  autoComplete="url"
                  id="guided-product-url"
                  name="guidedProductUrl"
                  onChange={(event) => setGuidedProductUrl(event.target.value)}
                  placeholder="https://example.com/products/hero-item"
                  type="url"
                  value={guidedInput.productUrl}
                />
              </FieldBlock>

              {guidedInput.productUrl ? (
                <a
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  href={guidedInput.productUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="size-4" suppressHydrationWarning />
                  Open product page
                </a>
              ) : null}
            </div>

            <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
              <FieldBlock
                description="Pick the commercial framing before analysis."
                label="Content Concept"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(conceptCopy).map(([value, copy]) => (
                    <button
                      aria-pressed={guidedInput.contentConcept === value}
                      className={cn(
                        rowClassName,
                        'h-full px-3 py-3 text-left transition-colors',
                        guidedInput.contentConcept === value
                          ? 'border-foreground/35 bg-secondary'
                          : 'hover:border-foreground/20',
                      )}
                      key={value}
                      onClick={() =>
                        setGuidedContentConcept(value as keyof typeof conceptCopy)
                      }
                      type="button"
                    >
                      <p className="font-medium text-foreground">{copy.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {copy.description}
                      </p>
                    </button>
                  ))}
                </div>
              </FieldBlock>
            </div>

            <div className="grid gap-4">
              <div
                className={cn(
                  insetPanelClassName,
                  'grid gap-4 p-4',
                )}
              >
                {activeTab === 'video' ? (
                  <div className="grid gap-4">
                    <FieldBlock
                      description="Motion language used during analysis and rendering."
                      htmlFor="guided-camera-movement"
                      label="Camera Movement"
                    >
                      <Select
                        aria-label="Camera movement"
                        id="guided-camera-movement"
                        onChange={(event) =>
                          setCameraMovement(
                            event.target.value
                              ? (event.target.value as CameraMovement)
                              : null,
                          )
                        }
                        value={cameraMovement ?? ''}
                      >
                        <option value="">None</option>
                        {Object.entries(cameraMovementLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </FieldBlock>

                    <p className="text-sm text-muted-foreground">
                      Default style bias:{' '}
                      <span className="font-medium text-foreground">
                        {getGuidedCreativeStyleForConcept(
                          guidedInput.contentConcept,
                        ).replace(/-/g, ' ')}
                      </span>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3">
                      <div className="grid gap-1">
                        <label className={fieldLabelClassName} htmlFor="guided-shot-count">
                          Shot Count
                        </label>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Generate exactly this many prompts and result tiles.
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Default style bias:{' '}
                        <span className="font-medium text-foreground">
                          {getGuidedCreativeStyleForConcept(
                            guidedInput.contentConcept,
                          ).replace(/-/g, ' ')}
                        </span>
                      </p>
                    </div>

                    <div className="w-full sm:max-w-[17rem]">
                      <Select
                        aria-label="Shot count"
                        id="guided-shot-count"
                        onChange={(event) =>
                          setGuidedShotCount(
                            clampGuidedShotCount(
                              Number.parseInt(event.target.value, 10),
                            ),
                          )
                        }
                        value={String(guidedInput.shotCount)}
                      >
                        {[1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                            {value} shot{value === 1 ? '' : 's'}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div
                className={cn(
                  insetPanelClassName,
                  'grid gap-4 p-4',
                )}
              >
                <div className="grid gap-1">
                  <label className={fieldLabelClassName} htmlFor="guided-analysis-model">
                    KIE Analysis Model
                  </label>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Cost-aware LLM selection for the planning step.
                  </p>
                </div>

                <div className="w-full sm:max-w-[17rem]">
                  <Select
                    aria-label="KIE analysis model"
                    id="guided-analysis-model"
                    onChange={(event) =>
                      setGuidedAnalysisModel(
                        event.target.value as (typeof kieAnalysisModels)[number],
                      )
                    }
                    value={guidedInput.analysisModel}
                  >
                    {kieAnalysisModels.map((model) => (
                      <option key={model} value={model}>
                        {analysisModelLabels[model]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Ready to analyze</p>
              <p
                aria-live="polite"
                className="mt-1 text-sm leading-6 text-muted-foreground"
              >
                {analysisHelperText}
              </p>
            </div>

            <Button
              className="min-h-11 sm:min-w-[12rem]"
              disabled={!canAnalyze}
              onClick={onAnalyze}
            >
              {analysisStatus === 'analyzing' ? (
                <LoaderCircle className="animate-spin" suppressHydrationWarning />
              ) : (
                <Sparkles suppressHydrationWarning />
              )}
              {analysisStatus === 'analyzing'
                ? 'Analyzing Product...'
                : 'Analyze Product'}
            </Button>
          </div>
        </div>

        {analysisError ? (
          <div
            aria-live="polite"
            className={cn(
              'rounded-xl border px-4 py-3 text-sm leading-6',
              analysisStatus === 'error'
                ? 'border-destructive/45 bg-destructive/10 text-destructive'
                : 'border-border bg-secondary/50 text-muted-foreground',
            )}
          >
            {analysisError}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function GuidedPlanEditor({
  plan,
  updateGuidedShotPrompt,
}: {
  plan: GuidedAnalysisPlan | null
  updateGuidedShotPrompt: (slug: string, prompt: string) => void
}) {
  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5')}>
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Step 2
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Edit the shot plan
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              These prompt fields are the exact instructions sent into the guided
              render batch.
            </p>
          </div>

          {plan ? (
            <Badge className="self-start" variant="outline">
              {plan.shots.length} editable prompt{plan.shots.length === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>

        {plan ? (
          <div className="grid gap-3">
            {plan.shots.map((shot, index) => (
              <GuidedShotEditorCard
                index={index}
                key={shot.slug}
                onUpdatePrompt={updateGuidedShotPrompt}
                shot={shot}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/70 px-6 text-center">
            <Sparkles className="size-8 text-muted-foreground" suppressHydrationWarning />
            <div>
              <p className="font-medium text-foreground">No guided prompt set yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Run the guided analysis first. The shot list will appear here as
                editable prompts.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function GuidedShotEditorCard({
  index,
  onUpdatePrompt,
  shot,
}: {
  index: number
  onUpdatePrompt: (slug: string, prompt: string) => void
  shot: GuidedAnalysisShot
}) {
  const textareaId = `guided-shot-prompt-${shot.slug}`

  return (
    <article className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Shot {index + 1}</Badge>
            <p className="font-medium text-foreground">{shot.title}</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shot.slug}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{shot.subjectMode}</Badge>
          <Badge variant="secondary">{shot.shotEnvironment}</Badge>
          {shot.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <label className={fieldLabelClassName} htmlFor={textareaId}>
          Prompt
        </label>
        <p className="text-sm leading-6 text-muted-foreground">
          This exact prompt is sent to the selected generation provider.
        </p>
        <Textarea
          aria-label={`${shot.title} prompt`}
          className="min-h-32"
          id={textareaId}
          name={textareaId}
          onChange={(event) => onUpdatePrompt(shot.slug, event.target.value)}
          value={shot.prompt}
        />
      </div>
    </article>
  )
}

function GuidedRunPanel({
  activeTab,
  activeRunInGuidedMode,
  analysisStatus,
  canGenerate,
  endFrameAsset,
  estimate,
  generateHelperText,
  generationRun,
  imageModel,
  isPricingLoading,
  onCancel,
  onGenerate,
  outputQuality,
  plan,
  setImageModel,
  setOutputQuality,
  setVideoDuration,
  setVideoModel,
  videoDuration,
  videoModel,
}: {
  activeTab: WorkspaceTab
  activeRunInGuidedMode: boolean
  analysisStatus: GuidedAnalysisStatus
  canGenerate: boolean
  endFrameAsset: AssetSlot
  estimate: GenerationCostEstimate
  generateHelperText: string
  generationRun: GenerationRun
  imageModel: ImageModelOption
  isPricingLoading: boolean
  onCancel: () => void
  onGenerate: () => void
  outputQuality: OutputQuality
  plan: GuidedAnalysisPlan | null
  setImageModel: (model: ImageModelOption) => void
  setOutputQuality: (quality: OutputQuality) => void
  setVideoDuration: (duration: VideoDuration) => void
  setVideoModel: (model: VideoModelOption) => void
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}) {
  const runStatus = getGuidedRunStatusCopy(generationRun, Boolean(plan?.shots.length))

  return (
    <aside className="xl:sticky xl:top-6">
      <section className={cn(panelClassName, 'p-4 sm:p-5')}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Step 3
            </p>
            <h2 className="font-display text-xl font-semibold">
              Generate the guided batch
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep the render settings and batch status visible while you refine
              the prompts.
            </p>
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={fieldLabelClassName}>Plan Summary</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Keep the analysis output visible while editing and rendering.
                </p>
              </div>
              <Badge variant="outline">{getAnalysisStatusLabel(analysisStatus)}</Badge>
            </div>

            {plan ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{plan.productCategory}</Badge>
                  <Badge variant="outline">{plan.creativeStyle}</Badge>
                  <Badge variant="outline">
                    {plan.shots.length} shot{plan.shots.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <SummaryStat
                    label="Analysis"
                    value={getAnalysisStatusLabel(analysisStatus)}
                  />
                  <SummaryStat
                    label="Prompt Set"
                    value={`${plan.shots.length} ready`}
                  />
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  {plan.summary}
                </p>
              </>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/25 px-5 text-center">
                <Sparkles
                  className="size-7 text-muted-foreground"
                  suppressHydrationWarning
                />
                <div>
                  <p className="font-medium text-foreground">Waiting for analysis</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Analyze the hero product first. The shot summary will appear
                    here once the prompt set is ready.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
            {activeTab === 'image' ? (
              <FieldBlock
                description="The final prompt set is rendered with the active image model."
                htmlFor="guided-image-model"
                label="Image Model"
              >
                <Select
                  aria-label="Image model"
                  id="guided-image-model"
                  onChange={(event) =>
                    setImageModel(event.target.value as typeof imageModel)
                  }
                  value={imageModel}
                >
                  {Object.entries(imageModelLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldBlock>
            ) : (
              <>
                <FieldBlock
                  description="The final prompt set is rendered with the active video model."
                  htmlFor="guided-video-model"
                  label="Video Model"
                >
                  <Select
                    aria-label="Video model"
                    id="guided-video-model"
                    onChange={(event) =>
                      setVideoModel(event.target.value as typeof videoModel)
                    }
                    value={videoModel}
                  >
                    {Object.entries(videoModelLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldBlock>

                <FieldBlock
                  description="Clip length passed to models that expose duration controls."
                  htmlFor="guided-video-duration"
                  label="Video Duration"
                >
                  <Select
                    aria-label="Video duration"
                    id="guided-video-duration"
                    onChange={(event) =>
                      setVideoDuration(event.target.value as typeof videoDuration)
                    }
                    value={videoDuration}
                  >
                    {videoDurations.map((duration) => (
                      <option key={duration} value={duration}>
                        {getGuidedVideoDurationLabel(videoModel, duration)}
                      </option>
                    ))}
                  </Select>
                </FieldBlock>

              </>
            )}

            <FieldBlock
              description="Resolution preference for the guided run."
              htmlFor="guided-output-quality"
              label="Output Quality"
            >
              <Select
                aria-label="Output quality"
                id="guided-output-quality"
                onChange={(event) =>
                  setOutputQuality(event.target.value as typeof outputQuality)
                }
                value={outputQuality}
              >
                {outputQualities.map((quality) => (
                  <option key={quality} value={quality}>
                    {quality}
                  </option>
                ))}
              </Select>
            </FieldBlock>

            {activeTab === 'video' && videoModel === 'veo-3.1' && outputQuality === '4k' ? (
              <p className="text-xs leading-5 text-muted-foreground">
                4K Veo upgrades are reserved for a later phase, so guided video
                generation stays disabled until you switch back to 720p or 1080p.
              </p>
            ) : null}

            {activeTab === 'video' &&
            videoModel === 'seedance-1.5-pro' &&
            outputQuality === '4k' ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Seedance 1.5 Pro supports up to 1080p in this workflow. Switch
                back to 720p or 1080p before generating.
              </p>
            ) : null}

            {activeTab === 'video' ? (
              <GuidedEndFrameUploadCard slot={endFrameAsset} />
            ) : null}
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-2 p-4')}>
            <p className={fieldLabelClassName}>Estimated Cost</p>
            <p className="text-sm font-medium text-foreground">
              {estimate.available
                ? `Estimated: ${formatEstimateCredits(estimate.credits)} credits`
                : isPricingLoading
                  ? 'Checking estimate...'
                  : 'Estimate unavailable'}
            </p>
            <p className="text-sm text-muted-foreground">
              {estimate.available
                ? `Approx. $${formatEstimateUsd(estimate.usd)} USD`
                : estimate.reason ?? 'Live pricing unavailable.'}
            </p>
          </div>

          <div
            aria-live="polite"
            className={cn(insetPanelClassName, 'grid gap-3 p-4')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={fieldLabelClassName}>Run Status</p>
                <p className="mt-1 font-medium text-foreground">{runStatus.title}</p>
              </div>
              <Badge variant={runStatus.badgeVariant}>{runStatus.label}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {runStatus.body}
            </p>
          </div>

          <div className="grid gap-2">
            {activeRunInGuidedMode ? (
              <Button onClick={onCancel} variant="ghost">
                Cancel Guided Run
              </Button>
            ) : null}

            <Button
              className="min-h-12 text-base"
              disabled={!canGenerate}
              onClick={onGenerate}
            >
              {activeRunInGuidedMode ? (
                <LoaderCircle className="animate-spin" suppressHydrationWarning />
              ) : (
                <WandSparkles suppressHydrationWarning />
              )}
              {activeRunInGuidedMode
                ? 'Generating Guided Batch...'
                : 'Generate Guided Batch'}
            </Button>

            <p
              aria-live="polite"
              className="text-sm leading-6 text-muted-foreground"
            >
              {generateHelperText}
            </p>
          </div>
        </div>
      </section>
    </aside>
  )
}

function GuidedResultsSection({ generationRun }: { generationRun: GenerationRun }) {
  const hasVariants = generationRun.variants.length > 0
  const resultsDescription =
    generationRun.status === 'rendering'
      ? 'Guided runs populate one result tile per planned shot as each task completes.'
      : 'Guided runs render one tile per planned shot and keep the prompts attached to each result.'

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5')}>
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Results
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Generated results
            </h2>
            <p
              aria-live="polite"
              className="mt-1 text-sm leading-6 text-muted-foreground"
            >
              {resultsDescription}
            </p>
          </div>

          {hasVariants ? (
            <Badge className="self-start" variant="outline">
              {generationRun.variants.length} variation
              {generationRun.variants.length === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>

        {hasVariants ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {generationRun.variants.map((variant) => (
              <GuidedResultTile key={variant.variantId} variant={variant} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/70 px-6 text-center">
            <WandSparkles className="size-8 text-muted-foreground" suppressHydrationWarning />
            <div>
              <p className="font-medium text-foreground">No guided batch generated yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Analyze the product, edit the prompt set, then render the guided
                batch to populate this grid.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function GuidedWorkspace({
  className,
  isPricingLoading,
  kiePricing,
  kiePricingError,
  kieStatus,
}: {
  className?: string
  isPricingLoading: boolean
  kiePricing: KiePricingResponse | null
  kiePricingError: string | null
  kieStatus: KieStatusResponse
}) {
  const [isReanalyzeDialogOpen, setIsReanalyzeDialogOpen] = useState(false)
  const activeTab = useGenerationStore((state) => state.activeTab)
  const analysisError = useGenerationStore((state) => state.analysisError)
  const analysisStatus = useGenerationStore((state) => state.analysisStatus)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const guidedInput = useGenerationStore((state) => state.guidedInput)
  const guidedPlan = useGenerationStore((state) => state.guidedPlan)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const setActiveTab = useGenerationStore((state) => state.setActiveTab)
  const setAnalysisError = useGenerationStore((state) => state.setAnalysisError)
  const setAnalysisStatus = useGenerationStore((state) => state.setAnalysisStatus)
  const setCameraMovement = useGenerationStore((state) => state.setCameraMovement)
  const setGuidedAnalysisModel = useGenerationStore(
    (state) => state.setGuidedAnalysisModel,
  )
  const setGuidedContentConcept = useGenerationStore(
    (state) => state.setGuidedContentConcept,
  )
  const setGuidedPlan = useGenerationStore((state) => state.setGuidedPlan)
  const setGuidedProductUrl = useGenerationStore(
    (state) => state.setGuidedProductUrl,
  )
  const setGuidedShotCount = useGenerationStore((state) => state.setGuidedShotCount)
  const setImageModel = useGenerationStore((state) => state.setImageModel)
  const setOutputQuality = useGenerationStore((state) => state.setOutputQuality)
  const setVideoDuration = useGenerationStore((state) => state.setVideoDuration)
  const setVideoModel = useGenerationStore((state) => state.setVideoModel)
  const updateGuidedShotPrompt = useGenerationStore(
    (state) => state.updateGuidedShotPrompt,
  )
  const hydrateGenerationRun = useGenerationStore(
    (state) => state.hydrateGenerationRun,
  )
  const setGenerationError = useGenerationStore((state) => state.setGenerationError)
  const resetGuidedState = useGenerationStore((state) => state.resetGuidedState)

  const hasHero = isSlotLoaded(guidedInput.heroAsset)
  const hasPlan = Boolean(guidedPlan?.shots.length)
  const activeRunInGuidedMode = hasActiveGeneration(generationRun)
  const canAnalyze = hasHero && analysisStatus !== 'analyzing'

  const estimate = useMemo(
    () =>
      getGenerationCostEstimate(
        createGuidedEstimateInput({
          activeTab,
          endFrameAsset: guidedInput.endFrameAsset,
          heroAsset: guidedInput.heroAsset,
          imageModel,
          outputQuality,
          shotCount: activeTab === 'video' ? 1 : guidedInput.shotCount,
          shots: guidedPlan?.shots ?? [],
          videoDuration,
          videoModel,
        }),
        kiePricing?.matrix ?? null,
      ),
    [
      activeTab,
      guidedInput.endFrameAsset,
      guidedInput.heroAsset,
      guidedInput.shotCount,
      guidedPlan,
      imageModel,
      outputQuality,
      videoDuration,
      videoModel,
      kiePricing?.matrix,
    ],
  )
  const creditValidation = useMemo(
    () =>
      getGenerationCreditValidation({
        balanceCredits: kieStatus.credits,
        balanceError: kieStatus.error,
        estimate,
        pricingError: kiePricingError,
      }),
    [estimate, kieStatus.credits, kieStatus.error, kiePricingError],
  )
  const canGenerate =
    hasPlan && hasHero && !activeRunInGuidedMode && creditValidation.canGenerate

  const analysisHelperText = getAnalyzeHelperText({
    hasHero,
    hasPlan,
    status: analysisStatus,
  })
  const generateHelperText = getGenerateHelperText({
    activeRun: activeRunInGuidedMode,
    creditReason: creditValidation.reason,
    hasHero,
    hasPlan,
  })
  useEffect(() => {
    const runId = generationRun.runId

    if (!runId || generationRun.status !== 'rendering') {
      return
    }

    let isCancelled = false

    const pollRunState = async () => {
      try {
        const response = await fetch(
          `/api/generation/runs/${encodeURIComponent(runId)}`,
          {
            cache: 'no-store',
          },
        )
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string
              run?: GenerationRun
            }
          | null

        if (!response.ok || !payload?.run || isCancelled) {
          if (!response.ok) {
            throw new Error(payload?.error ?? 'Unable to refresh guided run status.')
          }

          return
        }

        hydrateGenerationRun(payload.run)
      } catch (error) {
        if (!isCancelled) {
          setGenerationError(
            error instanceof Error
              ? error.message
              : 'Unable to refresh guided run status.',
          )
        }
      }
    }

    void pollRunState()
    const interval = window.setInterval(() => {
      void pollRunState()
    }, 2_500)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [generationRun.runId, generationRun.status, hydrateGenerationRun, setGenerationError])

  useEffect(() => {
    if (!guidedPlan) {
      setIsReanalyzeDialogOpen(false)
    }
  }, [guidedPlan])

  const runAnalyze = async () => {
    if (!guidedInput.heroAsset.file) {
      setAnalysisError('A hero product image is required.')
      setAnalysisStatus('error')
      return
    }

    try {
      setAnalysisStatus('analyzing')
      setAnalysisError(null)

      const { formData } = buildGuidedAnalysisFormData({
        analysisModel: guidedInput.analysisModel,
        cameraMovement,
        contentConcept: guidedInput.contentConcept,
        heroAsset: guidedInput.heroAsset,
        productUrl: guidedInput.productUrl,
        shotCount: activeTab === 'video' ? 1 : guidedInput.shotCount,
        videoDuration,
        videoModel,
        workspace: activeTab,
      })
      const response = await fetch('/api/guided/analyze', {
        body: formData,
        method: 'POST',
      })
      const payload = (await response.json()) as
        | {
            error?: string
            plan?: typeof guidedPlan
            warning?: string | null
          }
        | null

      if (!response.ok || !payload?.plan) {
        throw new Error(payload?.error ?? 'Unable to analyze the guided product input.')
      }

      setGuidedPlan(payload.plan)
      setAnalysisError(payload.warning ?? null)
    } catch (error) {
      setAnalysisStatus('error')
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Unable to analyze the guided product input.',
      )
    }
  }

  const handleAnalyze = () => {
    if (!guidedInput.heroAsset.file) {
      setAnalysisError('A hero product image is required.')
      setAnalysisStatus('error')
      return
    }

    if (guidedPlan) {
      setIsReanalyzeDialogOpen(true)
      return
    }

    void runAnalyze()
  }

  const handleConfirmReanalyze = async () => {
    setIsReanalyzeDialogOpen(false)
    await runAnalyze()
  }

  const handleGenerate = async () => {
    if (!guidedPlan) {
      setAnalysisStatus('error')
      setAnalysisError('Analyze the product first to create the shot plan.')
      return
    }

    const currentEstimate = getGenerationCostEstimate(
      createGuidedEstimateInput({
        activeTab,
        endFrameAsset: guidedInput.endFrameAsset,
        heroAsset: guidedInput.heroAsset,
        imageModel,
        outputQuality,
        shotCount: activeTab === 'video' ? 1 : guidedInput.shotCount,
        shots: guidedPlan.shots,
        videoDuration,
        videoModel,
      }),
      kiePricing?.matrix ?? null,
    )
    const currentCreditValidation = getGenerationCreditValidation({
      balanceCredits: kieStatus.credits,
      balanceError: kieStatus.error,
      estimate: currentEstimate,
      pricingError: kiePricingError,
    })

    if (!currentCreditValidation.canGenerate) {
      setGenerationError(
        currentCreditValidation.reason ?? 'Guided generation is blocked.',
      )
      return
    }

    try {
      const { formData } = buildGuidedGenerationFormData({
        analysisModel: guidedInput.analysisModel,
        cameraMovement,
        contentConcept: guidedInput.contentConcept,
        endFrameAsset: guidedInput.endFrameAsset,
        heroAsset: guidedInput.heroAsset,
        imageModel,
        outputQuality,
        plan: guidedPlan,
        productUrl: guidedInput.productUrl,
        videoDuration,
        videoModel,
        workspace: activeTab,
      })
      const response = await fetch('/api/generation/run', {
        body: formData,
        method: 'POST',
      })
      const payload = (await response.json()) as GenerationRun & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to start guided generation.')
      }

      hydrateGenerationRun(payload)
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Unable to start guided generation.',
      )
    }
  }

  const handleCancel = async () => {
    if (!generationRun.runId) {
      return
    }

    try {
      const response = await fetch(
        `/api/generation/runs/${encodeURIComponent(generationRun.runId)}/cancel`,
        {
          method: 'POST',
        },
      )
      const payload = (await response.json()) as
        | {
            error?: string
            run?: GenerationRun
          }
        | null

      if (!response.ok || !payload?.run) {
        throw new Error(payload?.error ?? 'Unable to cancel the guided run.')
      }

      hydrateGenerationRun(payload.run)
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Unable to cancel the guided run.',
      )
    }
  }

  return (
    <>
      <ConfirmDialog
        cancelLabel="Keep Current Plan"
        confirmLabel="Re-analyze"
        confirmVariant="destructive"
        description="Re-analyzing will replace the current guided prompts and discard any manual edits made to them. Existing rendered outputs stay in the results grid and are not deleted automatically."
        isBusy={analysisStatus === 'analyzing'}
        onConfirm={handleConfirmReanalyze}
        onOpenChange={setIsReanalyzeDialogOpen}
        open={isReanalyzeDialogOpen}
        title="Replace Guided Prompt Set?"
      />

      <div className={cn('grid gap-4', className)}>
        <GuidedOutputModeSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)] xl:items-start">
          <div className="grid gap-4">
            <GuidedAnalyzePanel
              activeTab={activeTab}
              analysisError={analysisError}
              analysisHelperText={analysisHelperText}
              analysisStatus={analysisStatus}
              cameraMovement={cameraMovement}
              canAnalyze={canAnalyze}
              guidedInput={guidedInput}
              onAnalyze={handleAnalyze}
              onReset={resetGuidedState}
              setCameraMovement={setCameraMovement}
              setGuidedAnalysisModel={setGuidedAnalysisModel}
              setGuidedContentConcept={setGuidedContentConcept}
              setGuidedProductUrl={setGuidedProductUrl}
              setGuidedShotCount={setGuidedShotCount}
            />

            <GuidedPlanEditor
              plan={guidedPlan}
              updateGuidedShotPrompt={updateGuidedShotPrompt}
            />
          </div>

          <GuidedRunPanel
            activeTab={activeTab}
            activeRunInGuidedMode={activeRunInGuidedMode}
            analysisStatus={analysisStatus}
            canGenerate={canGenerate}
            endFrameAsset={guidedInput.endFrameAsset}
            estimate={estimate}
            generateHelperText={generateHelperText}
            generationRun={generationRun}
            imageModel={imageModel}
            isPricingLoading={isPricingLoading}
            onCancel={() => {
              void handleCancel()
            }}
            onGenerate={() => {
              void handleGenerate()
            }}
            outputQuality={outputQuality}
            plan={guidedPlan}
            setImageModel={setImageModel}
            setOutputQuality={setOutputQuality}
            setVideoDuration={setVideoDuration}
            setVideoModel={setVideoModel}
            videoDuration={videoDuration}
            videoModel={videoModel}
          />
        </div>

        <GuidedResultsSection generationRun={generationRun} />
      </div>
    </>
  )
}
