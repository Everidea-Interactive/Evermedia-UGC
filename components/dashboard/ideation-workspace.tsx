'use client'

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  ImageIcon,
  LoaderCircle,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

import { useLocale } from '@/components/i18n/locale-provider'
import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  buildIdeationAnalysisFormData,
} from '@/lib/generation/client'
import {
  formatIdeationConceptCardText,
  formatIdeationResultText,
} from '@/lib/generation/ideation'
import { kieAnalysisModels } from '@/lib/generation/guided'
import type {
  AssetSlot,
  ContentConcept,
  ContentFormat,
  GuidedAnalysisStatus,
  IdeationResult,
  KieAnalysisModel,
} from '@/lib/generation/types'
import type { Locale } from '@/lib/i18n'
import { isImageMimeType } from '@/lib/media/image-preview'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const panelClassName = 'rounded-2xl border border-border bg-card'
const insetPanelClassName = 'rounded-xl border border-border bg-background'
const rowClassName = 'rounded-lg border border-border bg-background'
const fieldLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'

const conceptCopy = {
  affiliate: {
    description:
      'Natural creator-style concepts optimized for trust, relatability, and product persuasion.',
    label: 'Affiliate',
  },
  'driven-ads': {
    description:
      'Sharper direct-response concepts with stronger commercial framing and offer clarity.',
    label: 'Driven Ads',
  },
} as const

const analysisModelLabels = {
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
} as const

const sortedAnalysisModelOptions = kieAnalysisModels
  .map((model) => ({
    label: analysisModelLabels[model],
    model,
  }))
  .sort((a, b) => a.label.localeCompare(b.label))

const ideationOutputLanguageOptions: Array<{
  label: string
  value: Locale
}> = [
  { label: 'English', value: 'en' },
  { label: 'Bahasa Indonesia', value: 'id' },
]

const ideationContentFormatOptions: Array<{
  label: string
  value: ContentFormat
}> = [
  { label: 'Video', value: 'video' },
  { label: 'Photos', value: 'photos' },
]

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

function getAnalyzeBlockedReason(input: {
  hasHero: boolean
  productUrl: string
}) {
  if (!input.hasHero && input.productUrl.trim().length === 0) {
    return 'Add a hero product image or a product URL first.'
  }

  return null
}

function getIdeationStatusCopy(input: {
  hasError: boolean
  hasHero: boolean
  hasResult: boolean
  productUrl: string
  status: GuidedAnalysisStatus
}) {
  if (input.status === 'analyzing') {
    return {
      badgeVariant: 'secondary' as const,
      body: 'The available hero image, product page context, and written brief are being converted into a fresh three-concept ideation brief.',
      label: 'Analyzing',
      title: 'Building a new ideation brief',
    }
  }

  if (input.hasError) {
    return {
      badgeVariant: 'secondary' as const,
      body: 'Review the missing requirement or provider error, then re-run the ideation pass from this control panel.',
      label: 'Needs Attention',
      title: 'Ideation analysis needs another pass',
    }
  }

  if (!input.hasHero && input.productUrl.trim().length === 0) {
    return {
      badgeVariant: 'outline' as const,
      body: 'Add at least one source input. Ideation can run from a hero image, a product URL, or both together.',
      label: 'Waiting for Input',
      title: 'Source input required',
    }
  }

  if (input.hasResult) {
    return {
      badgeVariant: 'outline' as const,
      body: 'The latest three-concept brief is saved in Results. Re-run analysis whenever you want to replace it.',
      label: 'Ready',
      title: 'Ideation brief is ready',
    }
  }

  return {
    badgeVariant: 'outline' as const,
    body: 'The required inputs are ready. Run ideation to generate the first saved three-concept brief.',
    label: 'Ready to Analyze',
    title: 'Inputs are ready',
  }
}

function IdeationHeroUploadCard({
  onClear,
  onSelect,
  slot,
}: {
  onClear: () => void
  onSelect: (file: File | null) => void
  slot: AssetSlot
}) {
  const inputId = 'ideation-hero-input'

  return (
    <div className={cn(insetPanelClassName, 'flex h-full flex-col gap-5 p-4 sm:p-5')}>
      <div className="grid gap-1">
        <p className={fieldLabelClassName}>Hero Product</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Optional. Upload a single product image to give ideation direct visual context.
          Use PNG, JPG, JPEG, WEBP, or GIF.
        </p>
      </div>

      <input
        accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        id={inputId}
        onChange={(event) => handleFileInput(event, onSelect)}
        type="file"
      />

      {slot.previewUrl ? (
        <>
          <div className="relative min-h-[24rem] flex-1 overflow-hidden rounded-2xl border border-border bg-secondary/30 sm:min-h-[30rem] lg:min-h-[34rem]">
            {slot.mimeType && isImageMimeType(slot.mimeType) ? (
              <ImagePreviewDialog alt={slot.label} label={slot.label} src={slot.previewUrl}>
                <button
                  aria-label={`Preview ${slot.label}`}
                  className="absolute inset-0 block w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)] text-left"
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={slot.label}
                    className="h-full w-full object-contain p-6 sm:p-8"
                    src={slot.previewUrl}
                  />
                </button>
              </ImagePreviewDialog>
            ) : null}

            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10">
              <div className="pointer-events-auto flex flex-col gap-3 rounded-xl border border-border/70 bg-background/90 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">Ready for ideation</p>
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
                    aria-label="Clear ideation hero image"
                    onClick={onClear}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <X data-icon="inline-start" suppressHydrationWarning />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex min-h-[24rem] flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-8 text-center sm:min-h-[30rem] lg:min-h-[34rem]">
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground">
            <ImageIcon className="size-6" suppressHydrationWarning />
          </div>
          <div>
            <p className="font-medium text-foreground">Upload the hero product image</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use an optional hero image when you want ideation grounded in the product&apos;s
              visible packaging, texture, or styling.
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
        {slot.previewUrl
          ? 'You can replace the hero image before analyzing again.'
          : 'You can analyze with a hero image, a product URL, or both together.'}
      </p>
    </div>
  )
}

function IdeationResultCard({
  concept,
  copied,
  index,
  onCopy,
}: {
  concept: IdeationResult['concepts'][number]
  copied: boolean
  index: number
  onCopy: () => void
}) {
  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Concept {index + 1}
          </p>
          <p className="mt-2 font-medium text-foreground">{concept.title}</p>
        </div>
        <Button onClick={onCopy} size="sm" variant="secondary">
          <Copy data-icon="inline-start" suppressHydrationWarning />
          {copied ? 'Copied' : 'Copy card'}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
        <p><span className="font-medium text-foreground">Audience:</span> {concept.audience}</p>
        <p><span className="font-medium text-foreground">Angle:</span> {concept.angle}</p>
        <p><span className="font-medium text-foreground">Hook:</span> {concept.hook}</p>
        <p><span className="font-medium text-foreground">Key message:</span> {concept.keyMessage}</p>
        <p><span className="font-medium text-foreground">Visual direction:</span> {concept.visualDirection}</p>
        <p><span className="font-medium text-foreground">CTA:</span> {concept.cta}</p>
      </div>
    </article>
  )
}

function IdeationAnalyzePanel({
  analysisWarning,
  clearIdeationHeroAsset,
  ideationInput,
  onReset,
  setIdeationBriefText,
  setIdeationContentConcept,
  setIdeationHeroFile,
  setIdeationProductUrl,
}: {
  analysisWarning: string | null
  clearIdeationHeroAsset: () => void
  ideationInput: {
    briefText: string
    contentConcept: ContentConcept
    contentFormat: ContentFormat
    heroAsset: AssetSlot
    productUrl: string
  }
  onReset: () => void
  setIdeationBriefText: (briefText: string) => void
  setIdeationContentConcept: (contentConcept: ContentConcept) => void
  setIdeationHeroFile: (file: File | null) => void
  setIdeationProductUrl: (productUrl: string) => void
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
                Upload a hero product image, add the product page, and describe the campaign direction before ideation builds the three saved concepts. At least one source input is required.
              </p>
            </div>

            <Button onClick={onReset} size="sm" variant="ghost">
              Reset Ideation
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(420px,1.14fr)_minmax(0,0.86fr)]">
          <IdeationHeroUploadCard
            onClear={clearIdeationHeroAsset}
            onSelect={setIdeationHeroFile}
            slot={ideationInput.heroAsset}
          />

          <div className="grid gap-4">
            <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
              <div className="grid gap-1">
                <label className={fieldLabelClassName} htmlFor="ideation-product-url">
                  Product URL
                </label>
                <p className="text-sm leading-6 text-muted-foreground">
                  Optional. When present, ideation enriches the brief with page metadata and schema from the live product page.
                </p>
              </div>
              <Input
                aria-label="Product URL"
                autoComplete="url"
                id="ideation-product-url"
                onChange={(event) => setIdeationProductUrl(event.target.value)}
                placeholder="https://example.com/products/hero-item"
                type="url"
                value={ideationInput.productUrl}
              />

              {ideationInput.productUrl ? (
                <a
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  href={ideationInput.productUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="size-4" suppressHydrationWarning />
                  Open product page
                </a>
              ) : null}
            </div>

            <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
              <div className="grid gap-1">
                <label className={fieldLabelClassName} htmlFor="ideation-brief-text">
                  Written Brief
                </label>
                <p className="text-sm leading-6 text-muted-foreground">
                  Optional. Describe the offer, target buyer, campaign goal, and anything the concepts must emphasize. If left empty, ideation will infer strategy from the available image and page context.
                </p>
              </div>
              <Textarea
                aria-label="Written brief"
                id="ideation-brief-text"
                onChange={(event) => setIdeationBriefText(event.target.value)}
                placeholder="Optional example: Premium acne serum for humid climates. Push a trust-building creator angle for first-time buyers, focus on fast-absorbing texture and visible confidence."
                rows={4}
                value={ideationInput.briefText}
              />
            </div>

            <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
              <div className="grid gap-1">
                <p className={fieldLabelClassName}>Content Concept</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Pick the strategic bias before ideation runs.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(conceptCopy).map(([value, copy]) => (
                  <button
                    aria-pressed={ideationInput.contentConcept === value}
                    className={cn(
                      rowClassName,
                      'h-full px-3 py-3 text-left transition-colors',
                      ideationInput.contentConcept === value
                        ? 'border-foreground/35 bg-secondary'
                        : 'hover:border-foreground/20',
                    )}
                    key={value}
                    onClick={() =>
                      setIdeationContentConcept(value as ContentConcept)
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
            </div>
          </div>
        </div>

        {analysisWarning ? (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {analysisWarning}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function IdeationResultsSection({
  copiedCardIndex,
  copiedFullBrief,
  ideationResult,
  onCopyCard,
  onCopyFullBrief,
}: {
  copiedCardIndex: number | null
  copiedFullBrief: boolean
  ideationResult: IdeationResult | null
  onCopyCard: (index: number) => void
  onCopyFullBrief: () => void
}) {
  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5')}>
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Results
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Saved concept set
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Review the three concepts, then copy a single card or the full ideation brief.
            </p>
          </div>

          {ideationResult ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onCopyFullBrief} size="sm" variant="secondary">
                <Copy data-icon="inline-start" suppressHydrationWarning />
                {copiedFullBrief ? 'Copied' : 'Copy full brief'}
              </Button>
            </div>
          ) : null}
        </div>

        {ideationResult ? (
          <>
            <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
              <p className={fieldLabelClassName}>Summary</p>
              <p className="mt-3 max-w-[70ch] text-[15px] leading-7 text-foreground/90">
                {ideationResult.summary}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ideationResult.concepts.map((concept, index) => (
                <IdeationResultCard
                  concept={concept}
                  copied={copiedCardIndex === index}
                  index={index}
                  key={`${concept.title}-${index}`}
                  onCopy={() => onCopyCard(index)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/70 px-6 text-center">
            <BadgeCheck className="size-8 text-muted-foreground" suppressHydrationWarning />
            <div>
              <p className="font-medium text-foreground">No ideation brief yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Add at least one source input, run analysis, and the saved three-card brief will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function IdeationControlPanel({
  canAnalyze,
  hasError,
  hasHero,
  hasResult,
  ideationInput,
  ideationStatus,
  onAnalyze,
  setIdeationAnalysisModel,
  setIdeationContentFormat,
  setIdeationOutputLanguage,
}: {
  canAnalyze: boolean
  hasError: boolean
  hasHero: boolean
  hasResult: boolean
  ideationInput: {
    analysisModel: KieAnalysisModel
    contentFormat: ContentFormat
    outputLanguage: Locale
    productUrl: string
  }
  ideationStatus: GuidedAnalysisStatus
  onAnalyze: () => void
  setIdeationAnalysisModel: (model: KieAnalysisModel) => void
  setIdeationContentFormat: (contentFormat: ContentFormat) => void
  setIdeationOutputLanguage: (outputLanguage: Locale) => void
}) {
  const statusCopy = getIdeationStatusCopy({
    hasError,
    hasHero,
    hasResult,
    productUrl: ideationInput.productUrl,
    status: ideationStatus,
  })

  return (
    <aside className="xl:sticky xl:top-6">
      <section className={cn(panelClassName, 'p-4 sm:p-5')}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Step 2
            </p>
            <h2 className="font-display text-xl font-semibold">
              Generate the ideation brief
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep the model selection, analysis status, and rerun controls visible while you refine the inputs.
            </p>
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
            <div className="grid gap-1">
              <label className={fieldLabelClassName} htmlFor="ideation-content-format">
                Content Format
              </label>
              <p className="text-sm leading-6 text-muted-foreground">
                Choose whether ideation should target motion-first video deliverables or still-photo deliverables.
              </p>
            </div>
            <Select
              aria-label="Content Format"
              id="ideation-content-format"
              onChange={(event) =>
                setIdeationContentFormat(event.target.value as ContentFormat)
              }
              value={ideationInput.contentFormat}
            >
              {ideationContentFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div className="grid gap-1">
              <label className={fieldLabelClassName} htmlFor="ideation-output-language">
                Output Language
              </label>
              <p className="text-sm leading-6 text-muted-foreground">
                Controls the language used in the generated ideation brief.
              </p>
            </div>
            <Select
              aria-label="Output Language"
              id="ideation-output-language"
              onChange={(event) =>
                setIdeationOutputLanguage(event.target.value as Locale)
              }
              value={ideationInput.outputLanguage}
            >
              {ideationOutputLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div className="grid gap-1">
              <label className={fieldLabelClassName} htmlFor="ideation-analysis-model">
                KIE Analysis Model
              </label>
              <p className="text-sm leading-6 text-muted-foreground">
                Cost-aware LLM selection for the ideation step.
              </p>
            </div>
            <Select
              aria-label="KIE analysis model"
              id="ideation-analysis-model"
              onChange={(event) =>
                setIdeationAnalysisModel(event.target.value as KieAnalysisModel)
              }
              value={ideationInput.analysisModel}
            >
              {sortedAnalysisModelOptions.map((option) => (
                <option key={option.model} value={option.model}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div
            aria-live="polite"
            className={cn(insetPanelClassName, 'grid gap-3 p-4')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={fieldLabelClassName}>Run Status</p>
                <p className="mt-1 font-medium text-foreground">{statusCopy.title}</p>
              </div>
              <Badge variant={statusCopy.badgeVariant}>{statusCopy.label}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {statusCopy.body}
            </p>
          </div>

          <div className="grid gap-2">
            <Button
              className="min-h-12 text-base"
              disabled={!canAnalyze}
              onClick={onAnalyze}
            >
              {ideationStatus === 'analyzing' ? (
                <LoaderCircle className="animate-spin" suppressHydrationWarning />
              ) : (
                <Sparkles suppressHydrationWarning />
              )}
              {ideationStatus === 'analyzing'
                ? 'Analyzing Ideation Brief...'
                : 'Analyze Content Ideation'}
            </Button>
          </div>
        </div>
      </section>
    </aside>
  )
}

export function IdeationWorkspace() {
  const { locale } = useLocale()
  const hasInitializedOutputLanguage = useRef(false)
  const ideationInput = useGenerationStore((state) => state.ideationInput)
  const ideationStatus = useGenerationStore((state) => state.ideationStatus)
  const ideationError = useGenerationStore((state) => state.ideationError)
  const ideationResult = useGenerationStore((state) => state.ideationResult)
  const setIdeationAnalysisModel = useGenerationStore(
    (state) => state.setIdeationAnalysisModel,
  )
  const setIdeationBriefText = useGenerationStore(
    (state) => state.setIdeationBriefText,
  )
  const setIdeationContentConcept = useGenerationStore(
    (state) => state.setIdeationContentConcept,
  )
  const setIdeationContentFormat = useGenerationStore(
    (state) => state.setIdeationContentFormat,
  )
  const setIdeationHeroFile = useGenerationStore((state) => state.setIdeationHeroFile)
  const setIdeationOutputLanguage = useGenerationStore(
    (state) => state.setIdeationOutputLanguage,
  )
  const clearIdeationHeroAsset = useGenerationStore(
    (state) => state.clearIdeationHeroAsset,
  )
  const setIdeationProductUrl = useGenerationStore(
    (state) => state.setIdeationProductUrl,
  )
  const setIdeationError = useGenerationStore((state) => state.setIdeationError)
  const setIdeationFailure = useGenerationStore((state) => state.setIdeationFailure)
  const setIdeationResult = useGenerationStore((state) => state.setIdeationResult)
  const setIdeationStatus = useGenerationStore((state) => state.setIdeationStatus)
  const resetIdeationState = useGenerationStore((state) => state.resetIdeationState)
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null)
  const [copiedCardIndex, setCopiedCardIndex] = useState<number | null>(null)
  const [copiedFullBrief, setCopiedFullBrief] = useState(false)
  const [ideationSection, setIdeationSection] = useState<'analyze' | 'results'>(
    'analyze',
  )

  useEffect(() => {
    if (hasInitializedOutputLanguage.current) {
      return
    }

    hasInitializedOutputLanguage.current = true

    if (ideationInput.outputLanguage === 'en' && locale !== 'en') {
      setIdeationOutputLanguage(locale)
    }
  }, [ideationInput.outputLanguage, locale, setIdeationOutputLanguage])

  const hasHero = isSlotLoaded(ideationInput.heroAsset)
  const hasResult = Boolean(ideationResult)
  const analyzeBlockedReason = getAnalyzeBlockedReason({
    hasHero,
    productUrl: ideationInput.productUrl,
  })
  const canAnalyze =
    ideationStatus !== 'analyzing' && analyzeBlockedReason === null

  async function copyText(value: string, type: 'card' | 'full', index?: number) {
    await navigator.clipboard.writeText(value)

    if (type === 'card' && typeof index === 'number') {
      setCopiedCardIndex(index)
      window.setTimeout(() => setCopiedCardIndex((current) => (current === index ? null : current)), 1500)
      return
    }

    setCopiedFullBrief(true)
    window.setTimeout(() => setCopiedFullBrief(false), 1500)
  }

  async function handleAnalyze() {
    try {
      setAnalysisWarning(null)
      setCopiedCardIndex(null)
      setCopiedFullBrief(false)
      setIdeationError(null)
      setIdeationStatus('analyzing')

      const { formData } = buildIdeationAnalysisFormData({
        analysisModel: ideationInput.analysisModel,
        briefText: ideationInput.briefText,
        contentConcept: ideationInput.contentConcept,
        contentFormat: ideationInput.contentFormat,
        heroAsset: ideationInput.heroAsset,
        outputLanguage: ideationInput.outputLanguage,
        productUrl: ideationInput.productUrl,
      })
      const response = await fetch('/api/ideation/analyze', {
        body: formData,
        method: 'POST',
      })
      const payload = (await response.json()) as {
        error?: string
        result?: IdeationResult
        warning?: string | null
      }

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? 'Unable to generate the ideation brief.')
      }

      setIdeationResult(payload.result)
      setIdeationStatus('ready')
      setAnalysisWarning(payload.warning ?? null)
      setIdeationSection('results')
    } catch (error) {
      setIdeationResult(null)
      setIdeationFailure(
        error instanceof Error ? error.message : 'Unable to generate the ideation brief.',
      )
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.95fr)] lg:items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-3 lg:col-start-1">
        <Tabs
          className="flex flex-col gap-3"
          onValueChange={(value) => setIdeationSection(value as 'analyze' | 'results')}
          value={ideationSection}
        >
          <TabsList aria-label="Ideation Sections" className="w-full grid-cols-2 p-1.5">
            <TabsTrigger className="min-h-[3.15rem] px-3 py-2" value="analyze">
              Analyze
            </TabsTrigger>
            <TabsTrigger className="min-h-[3.15rem] px-3 py-2" value="results">
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0" value="analyze">
            <IdeationAnalyzePanel
              analysisWarning={analysisWarning}
              clearIdeationHeroAsset={clearIdeationHeroAsset}
              ideationInput={ideationInput}
              onReset={resetIdeationState}
              setIdeationBriefText={setIdeationBriefText}
              setIdeationContentConcept={setIdeationContentConcept}
              setIdeationHeroFile={setIdeationHeroFile}
              setIdeationProductUrl={setIdeationProductUrl}
            />
          </TabsContent>

          <TabsContent className="mt-0" value="results">
            <IdeationResultsSection
              copiedCardIndex={copiedCardIndex}
              copiedFullBrief={copiedFullBrief}
              ideationResult={ideationResult}
              onCopyCard={(index) =>
                void copyText(formatIdeationConceptCardText(ideationResult!.concepts[index], index), 'card', index)
              }
              onCopyFullBrief={() =>
                void copyText(formatIdeationResultText(ideationResult!), 'full')
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="min-w-0 lg:col-start-2">
        <IdeationControlPanel
          canAnalyze={canAnalyze}
          hasError={Boolean(ideationError)}
          hasHero={hasHero}
          hasResult={hasResult}
          ideationInput={ideationInput}
          ideationStatus={ideationStatus}
          onAnalyze={() => {
            void handleAnalyze()
          }}
          setIdeationAnalysisModel={setIdeationAnalysisModel}
          setIdeationContentFormat={setIdeationContentFormat}
          setIdeationOutputLanguage={setIdeationOutputLanguage}
        />
      </div>
    </div>
  )
}
