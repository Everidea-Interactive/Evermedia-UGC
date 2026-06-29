'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Forward,
  ImageIcon,
  LoaderCircle,
  ScanLine,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react'

import { PromptEnhancementControls } from '@/components/dashboard/prompt-enhancement-controls'
import { useLocale } from '@/components/i18n/locale-provider'
import { MediaPreviewDialog } from '@/components/media/media-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  getVideoQualityOptions,
  getVideoDurationHelperText,
} from '@/components/dashboard/manual-workspace-config'
import {
  buildGuidedAnalysisFormData,
  buildGuidedGenerationFormData,
  readJsonResponse,
} from '@/lib/generation/client'
import { guidedIdeationImageAccept } from '@/lib/generation/upload-support'
import {
  clampGuidedShotCount,
  getGuidedCreativeStyleForConcept,
  kieAnalysisModels,
} from '@/lib/generation/guided'
import {
  getVideoDurationLabel,
  getVideoDurationSpec,
  supportsVideoEndFrameGuidance,
} from '@/lib/generation/model-mapping'
import {
  getGenerationCostEstimate,
  getGenerationCreditValidation,
} from '@/lib/generation/pricing'
import {
  getCompletedVariantCount,
  getFailedVariantCount,
} from '@/lib/generation/run-copy'
import { fetchForwardedResultFile } from '@/lib/generation/forward-to-video'
import { isRunVisibleForExperience } from '@/lib/generation/run-visibility'
import { useUsdToIdrRate } from '@/lib/generation/use-usd-idr-rate'
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
  PromptEnhancement,
  VideoAudio,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import { isImageMimeType } from '@/lib/media/media-preview'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

import {
  insetPanelClassName,
  rowClassName,
  VideoThumbnailOverlay,
  workspaceFieldLabelClassName,
  workspacePreviewMinHeightClassName,
  workspaceSectionClassName,
} from '@/components/dashboard/manual-workspace-ui'

const imageQualities: OutputQuality[] = ['720p', '1080p', '4k']
const videoAudioOptions: VideoAudio[] = ['no-audio', 'with-audio']

function supportsVideoAudioSelection(model: VideoModelOption) {
  return (
    model === 'seedance-1.5-pro' ||
    model === 'seedance-2-mini' ||
    model === 'seedance-2'
  )
}

function getForcedVideoAudio(model: VideoModelOption): VideoAudio | null {
  return supportsVideoAudioSelection(model) ? null : 'with-audio'
}

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
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
} as const

const imageModelLabels = {
  'nano-banana': 'Nano Banana 2',
} as const

const videoModelLabels = {
  'grok-imagine-video-1.5': 'Grok Imagine Video 1.5',
  'seedance-2': 'Seedance 2.0',
  'seedance-2-mini': 'Seedance 2 Mini',
  'seedance-1.5-pro': 'Seedance 1.5 Pro',
  'kling-3.0': 'Kling 3.0',
  'veo-3.1': 'Veo 3.1',
} as const

const sortedAnalysisModelOptions = kieAnalysisModels
  .map((model) => ({
    label: analysisModelLabels[model],
    model,
  }))
  .sort((a, b) => a.label.localeCompare(b.label))
const sortedVideoModelOptions = Object.entries(videoModelLabels).sort(
  ([, labelA], [, labelB]) => labelA.localeCompare(labelB),
)

function getImageQualityOptions(
  imageModel: ImageModelOption,
  kiePricing: KiePricingResponse | null,
) {
  return kiePricing?.supportedImageQualities?.[imageModel] ?? imageQualities
}

function getImageQualityLabel(quality: OutputQuality) {
  if (quality === '720p') return '1K'
  if (quality === '1080p') return '2K'
  return '4K'
}

function getVideoQualityLabel(quality: OutputQuality) {
  if (quality === '4k') {
    return '4K'
  }

  return quality
}

const cameraMovementLabels: Record<CameraMovement, string> = {
  'crash-zoom': 'Crash Zoom',
  dolly: 'Dolly',
  drone: 'Drone',
  macro: 'Macro',
  orbit: 'Orbit',
}

function handleFileInput(
  event: ChangeEvent<HTMLInputElement>,
  onSelect: (file: File | null) => void,
) {
  const file = event.target.files?.[0] ?? null

  onSelect(file)
  event.target.value = ''
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

function formatEstimateUsd(usd: number | null, usdToIdrRate: number) {
  if (usd === null) {
    return 'Rp0'
  }

  const idr = usd * usdToIdrRate

  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(idr)
}


function getGuidedVideoAudioLabel(videoAudio: VideoAudio) {
  return videoAudio === 'with-audio' ? 'With audio' : 'No audio'
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

function getAnalyzeHelperText({
  hasHero,
  hasPlan,
  isVideoWorkspace,
  status,
}: {
  hasHero: boolean
  hasPlan: boolean
  isVideoWorkspace: boolean
  status: GuidedAnalysisStatus
}) {
  if (status === 'analyzing') {
    return 'Analyzing the hero image and rebuilding the guided shot list...'
  }

  if (!hasHero) {
    return isVideoWorkspace
      ? 'Upload or forward a start frame to unlock guided video analysis.'
      : 'Upload the hero product image to unlock guided analysis.'
  }

  if (hasPlan) {
    return isVideoWorkspace
      ? 'Start frame ready. Re-analyze when you want to rebuild the guided video prompt set.'
      : 'Hero image ready. Re-analyze when you want to replace the current prompt set.'
  }

  return isVideoWorkspace
    ? 'Start frame ready. Analyze to generate the guided video shot list.'
    : 'Hero image ready. Analyze to generate the guided shot list.'
}

function getGenerateHelperText({
  activeRun,
  creditReason,
  hasHero,
  hasPlan,
  isVideoWorkspace,
}: {
  activeRun: boolean
  creditReason: string | null
  hasHero: boolean
  hasPlan: boolean
  isVideoWorkspace: boolean
}) {
  if (activeRun) {
    return 'The current guided batch is still rendering. Cancel it first if you need to restart.'
  }

  if (!hasHero) {
    return isVideoWorkspace
      ? 'A start frame is still required before you can generate the guided video batch.'
      : 'The hero product image is still required before you can generate the batch.'
  }

  if (!hasPlan) {
    return isVideoWorkspace
      ? 'Analyze the start frame first to unlock guided video prompt editing and rendering.'
      : 'Analyze the hero product first to unlock prompt editing and rendering.'
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
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}) {
  return {
    activeTab: input.activeTab,
    assets: {
      brandLogo: {
        error: null,
        file: null,
        id: 'guided-brand-logo',
        label: 'Brand Logo',
        mimeType: null,
        previewUrl: null,
        size: null,
        uploadStatus: 'idle' as const,
      },
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
      firstFrame: {
        error: null,
        file: null,
        id: 'guided-first-frame',
        label: 'First Frame',
        mimeType: null,
        previewUrl: null,
        size: null,
        uploadStatus: 'idle' as const,
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
    videoReferences: input.activeTab === 'video' ? [input.heroAsset] : [],
    videoAudio: input.videoAudio,
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
        body: 'Completed results are ready below. Adjust any weak prompts as needed.',
      }
    case 'error':
      return {
        badgeVariant: 'secondary' as const,
        label: 'Failed',
        title: total > 0 ? 'No usable outputs in this batch' : 'Generation did not complete',
        body:
          run.error ??
          'The provider rejected the guided batch. Adjust the prompts or render settings.',
      }
    case 'cancelled':
      return {
        badgeVariant: 'secondary' as const,
        label: 'Cancelled',
        title: 'Guided batch cancelled',
        body: 'Any completed results remain available below. Update the prompts or settings as needed.',
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
          <label className={workspaceFieldLabelClassName} htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <p className={workspaceFieldLabelClassName}>{label}</p>
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

function GuidedHeroUploadCard({
  activeTab,
  slot,
}: {
  activeTab: WorkspaceTab
  slot: AssetSlot
}) {
  const clearGuidedHeroAsset = useGenerationStore((state) => state.clearGuidedHeroAsset)
  const setGuidedHeroFile = useGenerationStore((state) => state.setGuidedHeroFile)
  const previewUrl = slot.previewUrl
  const inputId = 'guided-hero-upload'

  return (
    <div className={cn(insetPanelClassName, 'grid gap-5 p-4 sm:p-5')}>
      <div className="grid gap-1">
        <p className={workspaceFieldLabelClassName}>Hero Product</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Upload the single product image that anchors the guided shot plan. Use PNG,
          JPG, JPEG, WEBP, or GIF.
        </p>
      </div>

        <input
          accept={guidedIdeationImageAccept}
          className="sr-only"
          id={inputId}
          onChange={(event) => handleFileInput(event, setGuidedHeroFile)}
          type="file"
        />

      {previewUrl ? (
        <>
          <div
            className={cn(
              workspacePreviewMinHeightClassName,
              'relative overflow-hidden rounded-2xl border bg-secondary/30',
              previewUrl ? 'border-border' : 'border-dashed border-border/70',
            )}
          >
            {slot.mimeType && isImageMimeType(slot.mimeType) ? (
              <MediaPreviewDialog
                alt="Guided hero product preview"
                label={slot.label}
                mimeType={slot.mimeType}
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
              </MediaPreviewDialog>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-secondary/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{slot.label}</p>
              <p className="text-xs text-muted-foreground">Ready for analysis</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                onClick={() => document.getElementById(inputId)?.click()}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Upload data-icon="inline-start" suppressHydrationWarning />
                Replace
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
        <div className={cn(workspacePreviewMinHeightClassName, 'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-8 text-center')}>
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground">
            <ImageIcon className="size-6" suppressHydrationWarning />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {activeTab === 'video'
                ? 'Upload or forward a start frame'
                : 'Upload the hero product image'}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {activeTab === 'video'
                ? 'Guided video mode uses one staged image as the start-frame anchor for analysis and final rendering.'
                : 'Guided mode uses one product image as the visual anchor for shot planning and final rendering.'}
            </p>
          </div>
          <Button
            onClick={() => document.getElementById(inputId)?.click()}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Upload data-icon="inline-start" suppressHydrationWarning />
            Upload Image
          </Button>
        </div>
      )}

      <p className="text-sm leading-6 text-muted-foreground">
        {previewUrl
          ? activeTab === 'video'
            ? 'You can replace the start frame before re-analyzing or rendering again.'
            : 'You can replace the hero image before re-analyzing or rendering again.'
          : activeTab === 'video'
            ? 'A start frame is required before guided video analysis can begin.'
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
        accept={guidedIdeationImageAccept}
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
          <p className={workspaceFieldLabelClassName}>Optional End Frame</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add a final frame for video models that support first-and-last-frame
            guidance.
          </p>
        </div>
      </div>

      {previewUrl && slot.mimeType && isImageMimeType(slot.mimeType) ? (
        <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
          <MediaPreviewDialog
            alt="Guided end frame preview"
            label={slot.label}
            mimeType={slot.mimeType}
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
          </MediaPreviewDialog>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => document.getElementById(inputId)?.click()}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Upload data-icon="inline-start" suppressHydrationWarning />
          {previewUrl ? 'Replace' : 'Upload End Frame'}
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
  forwardingVariantId,
  onForwardToVideo,
  variant,
}: {
  forwardingVariantId: string | null
  onForwardToVideo: (variant: GenerationRun['variants'][number]) => void
  variant: GenerationRun['variants'][number]
}) {
  const isForwarding = forwardingVariantId === variant.variantId
  const canForwardToVideo =
    variant.status === 'success' && variant.result?.type === 'image'
  const content = variant.result?.url ? (
    <MediaPreviewDialog
      alt={`${variant.profile} result`}
      label={variant.profile}
      mimeType={variant.result.type === 'video' ? 'video/mp4' : 'image/png'}
      src={variant.result.url}
    >
      <button
        aria-label={`Preview ${variant.profile}`}
        className="block h-full w-full text-left"
        type="button"
      >
        {variant.result.type === 'image' ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${variant.profile} result`}
              className="aspect-[3/4] w-full object-cover"
              src={variant.result.url}
            />
          </>
        ) : (
          <div className="relative">
            <video
              aria-hidden="true"
              className="pointer-events-none aspect-[3/4] w-full bg-black object-cover"
              muted
              playsInline
              preload="metadata"
              src={variant.result.url}
              tabIndex={-1}
            />
            <VideoThumbnailOverlay />
          </div>
        )}
      </button>
    </MediaPreviewDialog>
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
        {canForwardToVideo ? (
          <Button
            disabled={isForwarding}
            onClick={() => onForwardToVideo(variant)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {isForwarding ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" suppressHydrationWarning />
            ) : (
              <Forward data-icon="inline-start" suppressHydrationWarning />
            )}
            {isForwarding ? 'Forwarding...' : 'Forward to Video'}
          </Button>
        ) : null}
      </div>
    </article>
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
    <section className={workspaceSectionClassName}>
      <div className="grid gap-5">
        <div className="grid gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Step 1
              </p>
              <h2 className="font-display text-xl font-semibold">Analyze input</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {activeTab === 'video'
                  ? 'Upload or forward the start frame, add any page context, then generate the initial video shot list before editing the prompts.'
                  : 'Upload the hero product, add any page context, then generate the initial shot list before editing the prompts.'}
              </p>
            </div>

            <Button onClick={onReset} size="sm" variant="ghost">
              Reset Guided Mode
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(420px,1.14fr)_minmax(0,0.86fr)]">
          <GuidedHeroUploadCard activeTab={activeTab} slot={guidedInput.heroAsset} />

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
                        <label className={workspaceFieldLabelClassName} htmlFor="guided-shot-count">
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
                  <label className={workspaceFieldLabelClassName} htmlFor="guided-analysis-model">
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
                    {sortedAnalysisModelOptions.map(({ label, model }) => (
                      <option key={model} value={model}>
                        {label}
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
  activeTab,
  plan,
  promptEnhancement,
  setPromptEnhancement,
  updateGuidedShotPrompt,
}: {
  activeTab: WorkspaceTab
  plan: GuidedAnalysisPlan | null
  promptEnhancement: PromptEnhancement
  setPromptEnhancement: (patch: Partial<PromptEnhancement>) => void
  updateGuidedShotPrompt: (slug: string, prompt: string) => void
}) {
  return (
    <section className={workspaceSectionClassName}>
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
          <div className="grid gap-4">
            <PromptEnhancementControls
              enhancement={promptEnhancement}
              onChange={setPromptEnhancement}
              workspace={activeTab}
            />

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
        <label className={workspaceFieldLabelClassName} htmlFor={textareaId}>
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
  onGenerate,
  outputQuality,
  plan,
  setImageModel,
  setOutputQuality,
  setVideoDuration,
  setVideoAudio,
  setVideoModel,
  videoAudio,
  videoDuration,
  videoModel,
  kiePricing,
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
  onGenerate: () => void
  outputQuality: OutputQuality
  plan: GuidedAnalysisPlan | null
  setImageModel: (model: ImageModelOption) => void
  setOutputQuality: (quality: OutputQuality) => void
  setVideoDuration: (duration: VideoDuration) => void
  setVideoAudio: (videoAudio: VideoAudio) => void
  setVideoModel: (model: VideoModelOption) => void
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
  kiePricing: KiePricingResponse | null
}) {
  const runStatus = getGuidedRunStatusCopy(generationRun, Boolean(plan?.shots.length))
  const { rate: usdToIdrRate } = useUsdToIdrRate()
  const estimatePrimaryText = estimate.available
    ? `Estimated: ${formatEstimateCredits(estimate.credits)} credits`
    : isPricingLoading
      ? 'Checking estimate'
      : 'Estimate unavailable'
  const estimateSecondaryText = estimate.available
    ? `≈ ${formatEstimateUsd(estimate.usd, usdToIdrRate)}`
    : !isPricingLoading
      ? estimate.reason ?? 'Live pricing unavailable.'
      : null
  const imageQualityOptions = getImageQualityOptions(imageModel, kiePricing)
  const videoQualityOptions = getVideoQualityOptions(videoModel)

  return (
    <aside className="xl:sticky xl:top-6">
      <section className={workspaceSectionClassName}>
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
                <p className={workspaceFieldLabelClassName}>Plan Summary</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Keep the latest guided shot plan and render controls visible in
                  one place while refining the batch.
                </p>
              </div>
              <Badge variant="outline">{plan ? 'Prompt Ready' : 'Waiting'}</Badge>
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

                <div className="grid gap-2 sm:grid-cols-3">
                  <SummaryStat
                    label="Analysis"
                    value={getAnalysisStatusLabel(analysisStatus)}
                  />
                  <SummaryStat
                    label="Prompt Set"
                    value={`${plan.shots.length} ready`}
                  />
                  <SummaryStat
                    label="Shot Plan"
                    value={plan.shots.length ? 'Ready' : 'Not ready'}
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
                  onChange={(event) => {
                    const nextModel = event.target.value as typeof imageModel
                    setImageModel(nextModel)
                    const supportedQualities = getImageQualityOptions(
                      nextModel,
                      kiePricing,
                    )
                    if (!supportedQualities.includes(outputQuality)) {
                      setOutputQuality(supportedQualities[0] ?? '1080p')
                    }
                  }}
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
                    {sortedVideoModelOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldBlock>

                <FieldBlock
                  description="Audio behavior depends on the selected video model."
                  htmlFor="guided-video-audio"
                  label="Audio"
                >
                  {supportsVideoAudioSelection(videoModel) ? (
                    <Select
                      aria-label="Video audio"
                      id="guided-video-audio"
                      onChange={(event) =>
                        setVideoAudio(event.target.value as VideoAudio)
                      }
                      value={videoAudio}
                    >
                      {videoAudioOptions.map((audioOption) => (
                        <option key={audioOption} value={audioOption}>
                          {getGuidedVideoAudioLabel(audioOption)}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      aria-label="Video audio"
                      disabled
                      id="guided-video-audio"
                      value="with-audio"
                    >
                      <option value="with-audio">Included by model</option>
                    </Select>
                  )}
                </FieldBlock>

                <FieldBlock
                  description="Clip length passed to models that expose duration controls."
                  htmlFor="guided-video-duration"
                  label="Video Duration"
                >
                  {(() => {
                    const durationSpec = getVideoDurationSpec(videoModel)

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-foreground">
                          <span>{getVideoDurationLabel(videoDuration)}</span>
                          <span className="text-xs text-muted-foreground">
                            {getVideoDurationHelperText(videoModel)}
                          </span>
                        </div>
                        <input
                          aria-label="Video duration"
                          className="h-2 w-full cursor-pointer accent-foreground"
                          list={`guided-video-duration-marks-${videoModel}`}
                          id="guided-video-duration"
                          max={durationSpec.max}
                          min={durationSpec.min}
                          onChange={(event) =>
                            setVideoDuration(
                              Number.parseInt(event.target.value, 10) as typeof videoDuration,
                            )
                          }
                          step={durationSpec.step}
                          type="range"
                          value={videoDuration}
                        />
                        <datalist id={`guided-video-duration-marks-${videoModel}`}>
                          {durationSpec.marks?.map((duration) => (
                            <option key={duration} value={duration} label={String(duration)} />
                          ))}
                        </datalist>
                      </div>
                    )
                  })()}
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
                {(activeTab === 'image' ? imageQualityOptions : videoQualityOptions).map((quality) => (
                  <option key={quality} value={quality}>
                    {activeTab === 'image'
                      ? getImageQualityLabel(quality)
                      : getVideoQualityLabel(quality)}
                  </option>
                ))}
              </Select>
            </FieldBlock>

            {activeTab === 'video' &&
            supportsVideoEndFrameGuidance(videoModel) ? (
              <GuidedEndFrameUploadCard slot={endFrameAsset} />
            ) : null}
          </div>

          <div
            aria-live="polite"
            className={cn(insetPanelClassName, 'grid gap-3 p-4')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={workspaceFieldLabelClassName}>Run Status</p>
                <p className="mt-1 font-medium text-foreground">{runStatus.title}</p>
              </div>
              <Badge variant={runStatus.badgeVariant}>{runStatus.label}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {runStatus.body}
            </p>
          </div>

          <div className="rounded-md border border-border bg-secondary/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Estimated Cost
            </p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-medium tracking-tight text-foreground">
                {estimatePrimaryText}
              </p>
              {estimateSecondaryText ? (
                <p className="text-xs text-muted-foreground">{estimateSecondaryText}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
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

function GuidedResultsSection({
  activeTab,
  forwardGuidedImageResultToVideo,
  generationRun,
}: {
  activeTab: WorkspaceTab
  forwardGuidedImageResultToVideo: (file: File) => void
  generationRun: GenerationRun
}) {
  const [forwardingVariantId, setForwardingVariantId] = useState<string | null>(null)
  const visibleRun = isRunVisibleForExperience(generationRun, 'guided', activeTab)
    ? generationRun
    : null
  const hasVariants = Boolean(visibleRun?.variants.length)
  const resultsDescription =
    visibleRun?.status === 'rendering'
      ? 'Guided runs populate one result tile per planned shot as each task completes.'
      : 'Guided runs render one tile per planned shot and keep the prompts attached to each result.'

  const handleForwardToVideo = async (variant: GenerationRun['variants'][number]) => {
    if (!variant.result?.url || variant.result.type !== 'image') {
      return
    }

    try {
      setForwardingVariantId(variant.variantId)
      const file = await fetchForwardedResultFile(variant.result.url)

      startTransition(() => {
        forwardGuidedImageResultToVideo(file)
      })
    } finally {
      setForwardingVariantId(null)
    }
  }

  return (
    <section className={workspaceSectionClassName}>
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
              {visibleRun?.variants.length} variation
              {visibleRun?.variants.length === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>

        {hasVariants ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleRun?.variants.map((variant) => (
              <GuidedResultTile
                forwardingVariantId={forwardingVariantId}
                key={variant.variantId}
                onForwardToVideo={handleForwardToVideo}
                variant={variant}
              />
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
  const { locale } = useLocale()
  const [isReanalyzeDialogOpen, setIsReanalyzeDialogOpen] = useState(false)
  const [guidedSection, setGuidedSection] = useState<
    'analyze' | 'plan' | 'results'
  >('analyze')
  const activeTab = useGenerationStore((state) => state.activeTab)
  const analysisError = useGenerationStore((state) => state.analysisError)
  const analysisStatus = useGenerationStore((state) => state.analysisStatus)
  const creativeBrief = useGenerationStore((state) => state.creativeBrief)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const experience = useGenerationStore((state) => state.experience)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const guidedVideoStageEventId = useGenerationStore(
    (state) => state.guidedVideoStageEventId,
  )
  const guidedInput = useGenerationStore((state) => state.guidedInput)
  const guidedPlan = useGenerationStore((state) => state.guidedPlan)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const orientationPreference = useGenerationStore(
    (state) => state.orientationPreference,
  )
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const promptEnhancement = useGenerationStore(
    (state) => state.promptEnhancement,
  )
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const videoAudio = useGenerationStore((state) => state.videoAudio)
  const videoModel = useGenerationStore((state) => state.videoModel)
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
  const forwardGuidedImageResultToVideo = useGenerationStore(
    (state) => state.forwardGuidedImageResultToVideo,
  )
  const setGuidedShotCount = useGenerationStore((state) => state.setGuidedShotCount)
  const setImageModel = useGenerationStore((state) => state.setImageModel)
  const setOutputQuality = useGenerationStore((state) => state.setOutputQuality)
  const setPromptEnhancement = useGenerationStore(
    (state) => state.setPromptEnhancement,
  )
  const setVideoDuration = useGenerationStore((state) => state.setVideoDuration)
  const setVideoAudio = useGenerationStore((state) => state.setVideoAudio)
  const setVideoModel = useGenerationStore((state) => state.setVideoModel)
  const updateGuidedShotPrompt = useGenerationStore(
    (state) => state.updateGuidedShotPrompt,
  )
  const hydrateGenerationRun = useGenerationStore(
    (state) => state.hydrateGenerationRun,
  )
  const setGenerationError = useGenerationStore((state) => state.setGenerationError)
  const resetGenerationRun = useGenerationStore((state) => state.resetGenerationRun)
  const resetGuidedState = useGenerationStore((state) => state.resetGuidedState)
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false)

  const hasHero = isSlotLoaded(guidedInput.heroAsset)
  const hasPlan = Boolean(guidedPlan?.shots.length)
  const activeRunInGuidedMode =
    isSubmittingGeneration || hasActiveGeneration(generationRun)
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
          videoAudio,
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
      videoAudio,
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
    hasPlan &&
    hasHero &&
    analysisStatus !== 'analyzing' &&
    !activeRunInGuidedMode &&
    creditValidation.canGenerate

  const analysisHelperText = getAnalyzeHelperText({
    hasHero,
    hasPlan,
    isVideoWorkspace: activeTab === 'video',
    status: analysisStatus,
  })
  const generateHelperText = getGenerateHelperText({
    activeRun: activeRunInGuidedMode,
    creditReason: creditValidation.reason,
    hasHero,
    hasPlan,
    isVideoWorkspace: activeTab === 'video',
  })
  useEffect(() => {
    if (
      experience !== 'guided' ||
      activeTab !== 'video' ||
      guidedVideoStageEventId === 0
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setGuidedSection('analyze')
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeTab, experience, guidedVideoStageEventId])

  useEffect(() => {
    if (activeTab !== 'video') {
      return
    }

    const forcedAudio = getForcedVideoAudio(videoModel)

    if (forcedAudio && videoAudio !== forcedAudio) {
      setVideoAudio(forcedAudio)
    }
  }, [activeTab, setVideoAudio, videoAudio, videoModel])

  useEffect(() => {
    if (activeTab !== 'video' || !guidedPlan || promptEnhancement.voiceoverScript) {
      return
    }

    const firstSentence =
      guidedPlan.summary
        .split(/[.!?]/)
        .map((sentence) => sentence.trim())
        .find((sentence) => sentence.length > 0) ?? guidedPlan.shots[0]?.title ?? ''

    if (firstSentence) {
      setPromptEnhancement({ voiceoverScript: firstSentence })
    }
  }, [activeTab, guidedPlan, promptEnhancement.voiceoverScript, setPromptEnhancement])

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
      return false
    }

    try {
      setAnalysisStatus('analyzing')
      setAnalysisError(null)

      const { formData } = buildGuidedAnalysisFormData({
        analysisModel: guidedInput.analysisModel,
        cameraMovement,
        contentConcept: guidedInput.contentConcept,
        heroAsset: guidedInput.heroAsset,
        orientationPreference,
        productUrl: guidedInput.productUrl,
        shotCount: activeTab === 'video' ? 1 : guidedInput.shotCount,
        videoDuration,
        videoAudio,
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
      setAnalysisStatus('ready')
      setAnalysisError(payload.warning ?? null)
      return true
    } catch (error) {
      setAnalysisStatus('error')
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Unable to analyze the guided product input.',
      )
      return false
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

    void runAnalyze().then((didSucceed) => {
      if (didSucceed) {
        setGuidedSection('plan')
      }
    })
  }

  const handleConfirmReanalyze = async () => {
    setIsReanalyzeDialogOpen(false)
    const didSucceed = await runAnalyze()

    if (didSucceed) {
      setGuidedSection('plan')
    }
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
        videoAudio,
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
        creativeBrief,
        creativePlan: null,
        cameraMovement,
        contentConcept: guidedInput.contentConcept,
        endFrameAsset: guidedInput.endFrameAsset,
        heroAsset: guidedInput.heroAsset,
        imageModel,
        locale,
        orientationPreference,
        outputQuality,
        plan: guidedPlan,
        promptEnhancement,
        productUrl: guidedInput.productUrl,
        videoDuration,
        videoAudio,
        videoModel,
        workspace: activeTab,
      })
      resetGenerationRun()
      setIsSubmittingGeneration(true)

      const response = await fetch('/api/generation/run', {
        body: formData,
        method: 'POST',
      })
      const payload = await readJsonResponse<
        GenerationRun & {
          error?: string
        }
      >(response, 'Unable to start guided generation.')

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to start guided generation.')
      }

      hydrateGenerationRun(payload)
      setGuidedSection('results')
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Unable to start guided generation.',
      )
    } finally {
      setIsSubmittingGeneration(false)
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
        <Tabs
          className="flex flex-col gap-3"
          onValueChange={(value) =>
            setGuidedSection(value as 'analyze' | 'plan' | 'results')
          }
          value={guidedSection}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.95fr)] lg:items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]">
            <div className="flex min-w-0 flex-col gap-3 lg:col-start-1">
              <TabsList aria-label="Guided Sections" className="w-full grid-cols-3 p-1.5">
                <TabsTrigger className="min-h-[3.15rem] px-3 py-2" value="analyze">
                  Analyze
                </TabsTrigger>
                <TabsTrigger className="min-h-[3.15rem] px-3 py-2" value="plan">
                  Plan
                </TabsTrigger>
                <TabsTrigger className="min-h-[3.15rem] px-3 py-2" value="results">
                  Results
                </TabsTrigger>
              </TabsList>

              <TabsContent className="mt-0" value="analyze">
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
              </TabsContent>

              <TabsContent className="mt-0" value="plan">
                <div className="grid gap-4">
                  <GuidedPlanEditor
                    activeTab={activeTab}
                    plan={guidedPlan}
                    promptEnhancement={promptEnhancement}
                    setPromptEnhancement={setPromptEnhancement}
                    updateGuidedShotPrompt={updateGuidedShotPrompt}
                  />
                </div>
              </TabsContent>

              <TabsContent className="mt-0" value="results">
                <GuidedResultsSection
                  activeTab={activeTab}
                  forwardGuidedImageResultToVideo={forwardGuidedImageResultToVideo}
                  generationRun={generationRun}
                />
              </TabsContent>
            </div>

            <div className="min-w-0 lg:col-start-2">
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
                onGenerate={() => {
                  void handleGenerate()
                }}
                outputQuality={outputQuality}
                plan={guidedPlan}
                setImageModel={setImageModel}
                setOutputQuality={setOutputQuality}
                setVideoDuration={setVideoDuration}
                setVideoAudio={setVideoAudio}
                setVideoModel={setVideoModel}
                videoAudio={videoAudio}
                videoDuration={videoDuration}
                videoModel={videoModel}
                kiePricing={kiePricing}
              />
            </div>
          </div>
        </Tabs>
      </div>
    </>
  )
}
