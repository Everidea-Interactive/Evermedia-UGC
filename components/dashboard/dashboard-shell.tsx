'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Brush,
  CircleSlash,
  CupSoda,
  Film,
  Gem,
  House,
  ImageIcon,
  Laptop,
  Leaf,
  LoaderCircle,
  MapPin,
  Package2,
  ScanLine,
  Shirt,
  Sparkles,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'

import { GuidedWorkspace } from '@/components/dashboard/guided-workspace'
import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorNoticeDialog } from '@/components/ui/error-notice-dialog'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  buildGenerationFormData,
  getAssetPreviewUrl,
  getGenerationValidation,
} from '@/lib/generation/client'
import {
  getGenerationCostEstimate,
  getGenerationCreditValidation,
} from '@/lib/generation/pricing'
import {
  getActiveTaskCount,
  getCompletedVariantCount,
  getFailedVariantCount,
  getGenerationFailureNotice,
  getGenerateButtonLabel,
} from '@/lib/generation/run-copy'
import { getOutputGalleryItems } from '@/lib/generation/output-gallery'
import { isRunVisibleForExperience } from '@/lib/generation/run-visibility'
import { useKiePricing } from '@/lib/generation/use-kie-pricing'
import { useKieStatus } from '@/lib/generation/use-kie-status'
import { useUsdToIdrRate } from '@/lib/generation/use-usd-idr-rate'
import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  GenerationExperience,
  GenerationCostEstimate,
  GenerationRun,
  ImageModelOption,
  KiePricingResponse,
  KieStatusResponse,
  NamedAssetKey,
  NamedAssetSlots,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import { isImageMimeType } from '@/lib/media/image-preview'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const workspaceTabs: Array<{
  helper: string
  icon: LucideIcon
  label: string
  value: WorkspaceTab
}> = [
  {
    helper: 'Still renders',
    icon: ImageIcon,
    label: 'Image',
    value: 'image',
  },
  {
    helper: 'Motion renders',
    icon: Film,
    label: 'Video',
    value: 'video',
  },
]

const experienceTabs: Array<{
  helper: string
  label: string
  value: GenerationExperience
}> = [
  {
    helper: 'Reference board, presets, and manual batch generation',
    label: 'Manual',
    value: 'manual',
  },
  {
    helper: 'Analyze one product image, edit the shot list, then render it',
    label: 'Guided',
    value: 'guided',
  },
]

const productCategories: Array<{
  icon: LucideIcon
  label: string
  value: ProductCategory
}> = [
  { icon: CupSoda, label: 'Food & Drink', value: 'food-drink' },
  { icon: Gem, label: 'Jewelry', value: 'jewelry' },
  { icon: Sparkles, label: 'Cosmetics & Beauty', value: 'cosmetics' },
  { icon: Laptop, label: 'Electronics & Tech', value: 'electronics' },
  { icon: Shirt, label: 'Clothing & Fashion', value: 'clothing' },
  { icon: Package2, label: 'Miscellaneous', value: 'miscellaneous' },
]

const creativeStyles: Array<{
  label: string
  value: CreativeStyle
}> = [
  { label: 'UGC / Lifestyle', value: 'ugc-lifestyle' },
  { label: 'Hollywood Cinematic', value: 'cinematic' },
  { label: 'TV Commercial', value: 'tv-commercial' },
  {
    label: 'Elite Product Commercial',
    value: 'elite-product-commercial',
  },
]

const subjectModes: Array<{
  description: string
  label: string
  value: SubjectMode
}> = [
  {
    description:
      'Lifestyle image with a person naturally interacting with the product.',
    label: 'Lifestyle',
    value: 'lifestyle',
  },
  {
    description: 'Keep the product as the sole hero subject with no visible person.',
    label: 'Product Only',
    value: 'product-only',
  },
]

const shotEnvironments: Array<{
  description: string
  icon: LucideIcon
  label: string
  value: ShotEnvironment
}> = [
  {
    description: 'Studio, interior, curated indoor environment.',
    icon: House,
    label: 'Indoor',
    value: 'indoor',
  },
  {
    description: 'Exterior location with natural environmental context.',
    icon: Leaf,
    label: 'Outdoor',
    value: 'outdoor',
  },
]

const characterGenders: Array<{
  label: string
  value: CharacterGender
}> = [
  { label: 'Any', value: 'any' },
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-Binary', value: 'non-binary' },
]

const characterAgeGroups: Array<{
  label: string
  value: CharacterAgeGroup
}> = [
  { label: 'Any', value: 'any' },
  { label: 'Young Adult', value: 'young-adult' },
  { label: 'Adult', value: 'adult' },
  { label: 'Middle Aged', value: 'middle-aged' },
  { label: 'Senior', value: 'senior' },
]

const figureArtDirections: Array<{
  description: string
  label: string
  value: FigureArtDirection
}> = [
  {
    description: 'Default',
    label: 'None',
    value: 'none',
  },
  {
    description: 'Full figure, dramatic curves, fashion-forward.',
    label: 'Curvaceous',
    value: 'curvaceous-editorial',
  },
]

const batchSizes: BatchSize[] = [1, 2, 3, 4]

const cameraMovements: Array<{
  label: string
  value: CameraMovement
}> = [
  { label: 'Orbit', value: 'orbit' },
  { label: 'Dolly', value: 'dolly' },
  { label: 'Drone', value: 'drone' },
  { label: 'Crash Zoom', value: 'crash-zoom' },
  { label: 'Macro', value: 'macro' },
]

const imageModels: Array<{
  helper: string
  label: string
  value: ImageModelOption
}> = [
  {
    helper: 'OpenAI GPT Image 2 with 1K / 2K / 4K tiers',
    label: 'GPT Image 2',
    value: 'gpt-image-2',
  },
  {
    helper: 'Text and image-led still renders',
    label: 'Grok Imagine',
    value: 'grok-imagine',
  },
  {
    helper: 'Google image generation with direct reference input',
    label: 'Nano Banana 2',
    value: 'nano-banana',
  },
]

const videoModels: Array<{
  helper: string
  label: string
  value: VideoModelOption
}> = [
  {
    helper: 'Prompt-led short motion clips',
    label: 'Grok Imagine',
    value: 'grok-imagine',
  },
  {
    helper: 'Market-model text or image video',
    label: 'Kling',
    value: 'kling',
  },
  {
    helper: 'ByteDance 8s or 12s pro video generation',
    label: 'Seedance 1.5 Pro',
    value: 'seedance-1.5-pro',
  },
  {
    helper: 'Reference and end-frame video renders',
    label: 'Veo 3.1',
    value: 'veo-3.1',
  },
]

const imageQualities: OutputQuality[] = ['720p', '1080p', '4k']
const videoQualities: OutputQuality[] = ['720p', '1080p']
const durations: VideoDuration[] = ['base', 'extended']

function getVideoDurationLabel(model: VideoModelOption, duration: VideoDuration) {
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

function getImageQualityOptions(
  imageModel: ImageModelOption,
  kiePricing: KiePricingResponse | null,
) {
  return (
    kiePricing?.supportedImageQualities?.[imageModel] ??
    (imageModel === 'grok-imagine' ? (['1080p'] as OutputQuality[]) : imageQualities)
  )
}

function getImageQualityLabel(quality: OutputQuality) {
  if (quality === '720p') return '1K'
  if (quality === '1080p') return '2K'
  return '4K'
}

const peopleReferenceCards: Array<{
  icon: LucideIcon
  key: Extract<NamedAssetKey, 'face1' | 'face2'>
  label: string
}> = [
  {
    icon: UserRound,
    key: 'face1',
    label: 'Face 1',
  },
  {
    icon: UserRound,
    key: 'face2',
    label: 'Face 2',
  },
]

const styleReferenceCards: Array<{
  icon: LucideIcon
  key: Extract<NamedAssetKey, 'clothing' | 'location'>
  label: string
}> = [
  {
    icon: Brush,
    key: 'clothing',
    label: 'Clothing',
  },
  {
    icon: MapPin,
    key: 'location',
    label: 'Location',
  },
]

const panelClassName = 'rounded-2xl border border-border bg-card'
const insetPanelClassName = 'rounded-xl border border-border bg-background'
const rowClassName = 'rounded-lg border border-border bg-background'
const tileClassName =
  'min-h-10 w-full items-center justify-center whitespace-normal px-3 py-2.5 text-center leading-tight'
const presetTileClassName =
  'preset-chip min-h-[2.9rem] w-full items-center justify-center whitespace-normal rounded-lg border px-3.5 py-2 text-center text-sm font-semibold leading-tight'
const presetCompactTileClassName =
  'preset-chip preset-chip-compact w-full items-center justify-center whitespace-normal rounded-lg border text-sm font-semibold leading-tight'
const presetGroupClassName =
  'rounded-xl border border-border/80 bg-background/70 p-3.5 sm:p-4'
const presetSubgroupClassName =
  'rounded-lg border border-border/70 bg-secondary/35 p-3'
const assetAccept = 'image/*,video/*'
const runPollIntervalMs = 2_500

function ImagePreviewTrigger({
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
        aria-label={`Preview ${label}`}
        className={cn(
          'block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
        type="button"
      >
        {children}
      </button>
    </ImagePreviewDialog>
  )
}

export function DashboardShell() {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const experience = useGenerationStore((state) => state.experience)
  const setActiveTab = useGenerationStore((state) => state.setActiveTab)
  const setExperience = useGenerationStore((state) => state.setExperience)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const generationErrorEventId = useGenerationStore(
    (state) => state.generationErrorEventId,
  )
  const kiePricingState = useKiePricing()
  const kieStatusState = useKieStatus(generationRun)
  const controller = useGenerationController({
    enabled: experience === 'manual',
    kiePricing: kiePricingState.pricing,
    kieStatus: kieStatusState.status,
    pricingError: kiePricingState.error,
  })
  const [manualSection, setManualSection] = useState<
    'references' | 'preset' | 'motion' | 'outputs'
  >('references')
  const [isErrorNoticeOpen, setIsErrorNoticeOpen] = useState(false)
  const [errorNotice, setErrorNotice] = useState(() =>
    getGenerationFailureNotice(null),
  )
  const lastManualTerminalRunKeyRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      useGenerationStore.getState().disposeGenerationState()
    }
  }, [])

  useEffect(() => {
    const isTerminalStatus =
      generationRun.experience === 'manual' &&
      (generationRun.status === 'success' ||
        generationRun.status === 'partial-success' ||
        generationRun.status === 'error' ||
        generationRun.status === 'cancelled')
    const terminalRunKey =
      generationRun.runId && isTerminalStatus
        ? `${generationRun.runId}:${generationRun.status}`
        : null

    if (!terminalRunKey || lastManualTerminalRunKeyRef.current === terminalRunKey) {
      return
    }

    lastManualTerminalRunKeyRef.current = terminalRunKey
    const timeoutId = window.setTimeout(() => {
      setManualSection('outputs')
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [generationRun.experience, generationRun.runId, generationRun.status])

  useEffect(() => {
    if (
      generationErrorEventId === 0 ||
      generationRun.status !== 'error' ||
      !generationRun.error
    ) {
      return
    }
    setErrorNotice(getGenerationFailureNotice(generationRun.error))
    setIsErrorNoticeOpen(true)
  }, [
    generationErrorEventId,
    generationRun.error,
    generationRun.status,
  ])

  return (
    <div className="min-h-screen overflow-x-hidden">
      <ErrorNoticeDialog
        description={errorNotice.message}
        detail={errorNotice.detail}
        onOpenChange={setIsErrorNoticeOpen}
        open={isErrorNoticeOpen}
        title={errorNotice.title}
      />
      <a
        href="#dashboard-main"
        className="sr-only left-4 top-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed"
      >
        Skip to Main Content
      </a>

      <main
        className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5"
        id="dashboard-main"
      >
        <section className={cn(panelClassName, 'p-2.5 sm:p-3')}>
          <div className="grid gap-3">
            <Tabs
              onValueChange={(value) => setExperience(value as GenerationExperience)}
              value={experience}
            >
              <TabsList aria-label="Studio Experience" className="w-full grid-cols-2 p-1.5">
                {experienceTabs.map((tab) => (
                  <TabsTrigger
                    className="min-h-[3.15rem] px-3 py-2"
                    key={tab.value}
                    value={tab.value}
                  >
                    <span className="mx-auto text-sm font-semibold sm:text-base">
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Tabs
              onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
              value={activeTab}
            >
              <TabsList aria-label="Workspace Tabs" className="w-full grid-cols-2 p-1.5">
                {workspaceTabs.map((tab) => {
                  const Icon = tab.icon

                  return (
                    <TabsTrigger
                      className="min-h-[3.15rem] px-3 py-2"
                      key={tab.value}
                      value={tab.value}
                    >
                      <span className="mx-auto flex items-center justify-center gap-2">
                        <Icon className="size-4.5 shrink-0" suppressHydrationWarning />
                        <span className="text-sm font-semibold sm:text-base">{tab.label}</span>
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>
        </section>

        {experience === 'guided' ? (
          <GuidedWorkspace
            isPricingLoading={kiePricingState.isLoading}
            kiePricing={kiePricingState.pricing}
            kiePricingError={kiePricingState.error}
            kieStatus={kieStatusState.status}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.92fr)] xl:items-start">
              <div className="xl:col-start-1">
                <Tabs
                  className="flex flex-col gap-3"
                  onValueChange={(value) =>
                    setManualSection(value as 'references' | 'preset' | 'motion' | 'outputs')
                  }
                  value={manualSection}
                >
                  <TabsList
                    aria-label="Workspace Sections"
                    className={cn(
                      'w-full',
                      activeTab === 'video' ? 'grid-cols-4' : 'grid-cols-3',
                    )}
                  >
                    <TabsTrigger value="references">References</TabsTrigger>
                    <TabsTrigger value="preset">Preset</TabsTrigger>
                    {activeTab === 'video' ? (
                      <TabsTrigger value="motion">Motion</TabsTrigger>
                    ) : null}
                    <TabsTrigger value="outputs">Outputs</TabsTrigger>
                  </TabsList>

                  <TabsContent className="mt-0" value="references">
                    <ReferenceWorkspaceSection />
                  </TabsContent>
                  <TabsContent className="mt-0" value="preset">
                    <RefineRenderSection />
                  </TabsContent>
                  {activeTab === 'video' ? (
                    <TabsContent className="mt-0" value="motion">
                      <MotionControlsSection />
                    </TabsContent>
                  ) : null}
                  <TabsContent className="mt-0" value="outputs">
                    <OutputPanel />
                  </TabsContent>
                </Tabs>
              </div>

              <RunControlPanel
                canGenerate={controller.canGenerate}
                className="xl:col-start-2 xl:sticky xl:top-6 xl:self-start"
                disabledReason={controller.disabledReason}
                generationCostEstimate={controller.generationCostEstimate}
                generationCostReason={controller.generationCostReason}
                isBusy={controller.isBusy}
                isPricingLoading={kiePricingState.isLoading}
                kiePricing={kiePricingState.pricing}
                onCancelRun={controller.handleCancel}
                onGenerate={controller.handleGenerate}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function ReferenceWorkspaceSection({ className }: { className?: string }) {
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const clearNamedAsset = useGenerationStore((state) => state.clearNamedAsset)
  const clearProductSlot = useGenerationStore((state) => state.clearProductSlot)
  const resetGenerationState = useGenerationStore(
    (state) => state.resetGenerationState,
  )
  const setNamedAssetFile = useGenerationStore((state) => state.setNamedAssetFile)
  const setProductSlotFile = useGenerationStore(
    (state) => state.setProductSlotFile,
  )
  const productSlots = products.slice(0, 2)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            description="Stage every visual input here first. Keep the board fixed so people, styling, environment, and products remain easy to scan."
            eyebrow="Reference board"
            title="Build the input set"
          />
          <Button
            onClick={() => resetGenerationState()}
            size="sm"
            variant="ghost"
          >
            Reset
          </Button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-x-6">
          <div className="grid gap-5">
            <ReferenceCardGroup title="People">
              {peopleReferenceCards.map((asset) => (
                <ReferenceCard
                  icon={asset.icon}
                  inputId={`asset-${asset.key}`}
                  key={asset.key}
                  onClear={() => clearNamedAsset(asset.key)}
                  onSelect={(file) => setNamedAssetFile(asset.key, file)}
                  slot={assets[asset.key]}
                />
              ))}
            </ReferenceCardGroup>

            <ReferenceCardGroup title="Style & Environment">
              {styleReferenceCards.map((asset) => (
                <ReferenceCard
                  icon={asset.icon}
                  inputId={`asset-${asset.key}`}
                  key={asset.key}
                  onClear={() => clearNamedAsset(asset.key)}
                  onSelect={(file) => setNamedAssetFile(asset.key, file)}
                  slot={assets[asset.key]}
                />
              ))}
            </ReferenceCardGroup>
          </div>

          <ReferenceCardGroup className="xl:self-start" title="Products">
            {productSlots.map((product) => (
              <ReferenceCard
                icon={Package2}
                inputId={`product-${product.id}`}
                key={product.id}
                onClear={() => clearProductSlot(product.id)}
                onSelect={(file) => setProductSlotFile(product.id, file)}
                slot={product}
              />
            ))}
          </ReferenceCardGroup>
        </div>
      </div>
    </section>
  )
}

function RefineRenderSection({ className }: { className?: string }) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const setCreativeStyle = useGenerationStore((state) => state.setCreativeStyle)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const setProductCategory = useGenerationStore(
    (state) => state.setProductCategory,
  )
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const setSubjectMode = useGenerationStore((state) => state.setSubjectMode)
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const setShotEnvironment = useGenerationStore(
    (state) => state.setShotEnvironment,
  )
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const setTextPrompt = useGenerationStore((state) => state.setTextPrompt)
  const characterGender = useGenerationStore((state) => state.characterGender)
  const setCharacterGender = useGenerationStore(
    (state) => state.setCharacterGender,
  )
  const characterAgeGroup = useGenerationStore(
    (state) => state.characterAgeGroup,
  )
  const setCharacterAgeGroup = useGenerationStore(
    (state) => state.setCharacterAgeGroup,
  )
  const figureArtDirection = useGenerationStore(
    (state) => state.figureArtDirection,
  )
  const setFigureArtDirection = useGenerationStore(
    (state) => state.setFigureArtDirection,
  )
  const isLifestyle = subjectMode === 'lifestyle'

  return (
    <section className={cn(panelClassName, 'preset-surface p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-3">
        <SectionHeader
          description="Set the structured preset first, then add any optional free-form direction."
          eyebrow="Preset"
          title="Build the generation preset"
        />

        <div className="grid gap-4 xl:grid-cols-12 xl:gap-x-4">
          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="Person present or product-only."
            title="Subject Configuration"
          >
            <ToggleGroup
              aria-label="Subject Configuration"
              className="grid w-full grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setSubjectMode(value as SubjectMode)
                }
              }}
              type="single"
              value={subjectMode}
            >
              {subjectModes.map((mode) => (
                <ToggleGroupItem
                  className={presetCompactTileClassName}
                  key={mode.value}
                  value={mode.value}
                >
                  {mode.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {subjectModes.find((mode) => mode.value === subjectMode)?.description ??
                'Choose the subject setup for this preset.'}
            </p>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="High-level visual language."
            title="Photography Style"
          >
            <ToggleGroup
              aria-label="Creative Style"
              className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setCreativeStyle(value as CreativeStyle)
                }
              }}
              type="single"
              value={creativeStyle}
            >
              {creativeStyles.map((style) => (
                <ToggleGroupItem
                  className={presetCompactTileClassName}
                  key={style.value}
                  value={style.value}
                >
                  {style.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="Indoor or outdoor context."
            title="Shot Environment"
          >
            <ToggleGroup
              aria-label="Shot Environment"
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setShotEnvironment(value as ShotEnvironment)
                }
              }}
              type="single"
              value={shotEnvironment}
            >
              {shotEnvironments.map((environment) => {
                const Icon = environment.icon

                return (
                  <ToggleGroupItem
                    className={cn(presetCompactTileClassName, 'gap-2')}
                    key={environment.value}
                    value={environment.value}
                  >
                    <Icon className="size-4" suppressHydrationWarning />
                    <span>{environment.label}</span>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {shotEnvironments.find((environment) => environment.value === shotEnvironment)
                ?.description ?? 'Set the scene before generation.'}
            </p>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-8')}
            description="Campaign context for the generated prompt."
            title="Product Category"
          >
            <ToggleGroup
              aria-label="Product Category"
              className="grid grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setProductCategory(value as ProductCategory)
                }
              }}
              type="single"
              value={productCategory}
            >
              {productCategories.map((category) => {
                const Icon = category.icon

                return (
                  <ToggleGroupItem
                    className={cn(
                      presetTileClassName,
                      'justify-start gap-2 text-left',
                    )}
                    key={category.value}
                    value={category.value}
                  >
                    <Icon className="size-4" suppressHydrationWarning />
                    {category.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            description="Editorial direction when a person is present."
            title="Figure Art Direction"
          >
            <ToggleGroup
              aria-label="Figure Art Direction"
              className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setFigureArtDirection(value as FigureArtDirection)
                }
              }}
              type="single"
              value={figureArtDirection}
            >
              {figureArtDirections.map((option) => (
                <ToggleGroupItem
                  className={presetCompactTileClassName}
                  disabled={!isLifestyle}
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {figureArtDirections.find((option) => option.value === figureArtDirection)
                ?.description ?? 'Choose the figure styling direction.'}
            </p>
            {!isLifestyle ? (
              <p className="text-xs text-muted-foreground">
                Figure art direction is available only for lifestyle presets.
              </p>
            ) : null}
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-12')}
            description="Lifestyle presets can bias cast attributes without changing the reference board."
            title="Character Demographics (Auto-Prompt)"
          >
            <div
              className={cn(
                'grid gap-3 lg:grid-cols-2 lg:gap-x-3',
                !isLifestyle && 'opacity-60',
              )}
            >
              <div className={cn(presetSubgroupClassName, 'grid gap-1.5 self-start')}>
                <PresetGroupLabel>Gender</PresetGroupLabel>
                <ToggleGroup
                  aria-label="Character Gender"
                  className="grid grid-cols-[repeat(auto-fit,minmax(6.75rem,1fr))] gap-2"
                  onValueChange={(value) => {
                    if (value) {
                      setCharacterGender(value as CharacterGender)
                    }
                  }}
                  type="single"
                  value={characterGender}
                >
                  {characterGenders.map((option) => (
                    <ToggleGroupItem
                      className={presetCompactTileClassName}
                      disabled={!isLifestyle}
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className={cn(presetSubgroupClassName, 'grid gap-1.5 self-start')}>
                <PresetGroupLabel>Age Group</PresetGroupLabel>
                <ToggleGroup
                  aria-label="Character Age Group"
                  className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2"
                  onValueChange={(value) => {
                    if (value) {
                      setCharacterAgeGroup(value as CharacterAgeGroup)
                    }
                  }}
                  type="single"
                  value={characterAgeGroup}
                >
                  {characterAgeGroups.map((option) => (
                    <ToggleGroupItem
                      className={presetCompactTileClassName}
                      disabled={!isLifestyle}
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
            {!isLifestyle ? (
              <p className="text-xs text-muted-foreground">
                Demographics only apply to lifestyle presets and reset when the subject is product-only.
              </p>
            ) : null}
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-12')}
            description="Optional free-form direction appended after the structured preset."
            title="Additional Instructions"
          >
            <Textarea
              aria-label={
                activeTab === 'image'
                  ? 'Image generation additional instructions'
                  : 'Video generation additional instructions'
              }
              autoComplete="off"
              className="preset-textarea"
              onChange={(event) => setTextPrompt(event.target.value)}
              placeholder="Add any extra creative direction, for example: dramatic backlight, golden hour, neon rim light…"
              value={textPrompt}
            />
            <p className="text-xs text-muted-foreground">
              Use this only for direction that does not fit the preset controls.
            </p>
          </ControlGroup>
        </div>
      </div>
    </section>
  )
}

function PresetGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  )
}

function MotionControlsSection({ className }: { className?: string }) {
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const setCameraMovement = useGenerationStore(
    (state) => state.setCameraMovement,
  )
  const endFrame = useGenerationStore((state) => state.assets.endFrame)
  const clearNamedAsset = useGenerationStore((state) => state.clearNamedAsset)
  const setNamedAssetFile = useGenerationStore((state) => state.setNamedAssetFile)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          description="These settings stay after the reference board because they only matter once the input set and brief are established."
          eyebrow="Motion controls"
          title="Tune video behavior"
        />

        <div className="grid gap-5">
          <ControlGroup
            description="Camera movement is treated as a structured prompt modifier."
            title="Movement language"
          >
            <ToggleGroup
              aria-label="Camera Movement"
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) =>
                setCameraMovement(value ? (value as CameraMovement) : null)
              }
              type="single"
              value={cameraMovement ?? ''}
            >
              {cameraMovements.map((movement) => (
                <ToggleGroupItem
                  className={tileClassName}
                  key={movement.value}
                  value={movement.value}
                >
                  {movement.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            description="Only Veo uses end-frame guidance. Other models ignore this slot."
            title="End frame reference"
          >
            <ReferenceCard
              className="w-full self-start sm:max-w-[20rem]"
              icon={ScanLine}
              inputId="asset-end-frame"
              onClear={() => clearNamedAsset('endFrame')}
              onSelect={(file) => setNamedAssetFile('endFrame', file)}
              slot={endFrame}
            />
          </ControlGroup>
        </div>
      </div>
    </section>
  )
}

function ReferenceCardGroup({
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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">{children}</div>
    </div>
  )
}

function ReferenceCard({
  className,
  icon: Icon,
  inputId,
  onClear,
  onSelect,
  slot,
}: {
  className?: string
  icon: LucideIcon
  inputId: string
  onClear: () => void
  onSelect: (file: File | null) => void
  slot: AssetSlot
}) {
  const previewSrc = getAssetPreviewUrl(slot)
  const hasMedia = Boolean(previewSrc)
  const errorLabel = getReferenceCardErrorLabel(slot)

  return (
    <div
      className={cn(
        'reference-card group relative aspect-square overflow-hidden rounded-[1rem] border bg-background transition-colors',
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
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${slot.label} reference preview`}
                className="h-full w-full object-contain p-2.5"
                loading="lazy"
                src={previewSrc}
              />
            </div>
          </ImagePreviewTrigger>
        ) : (
          <div className="absolute inset-0">
            <video
              className="h-full w-full object-contain p-2.5"
              controls
              playsInline
              preload="metadata"
              src={previewSrc}
            />
          </div>
        )
      ) : (
        <div className="absolute inset-0">
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/80 text-muted-foreground">
              <Icon className="size-4.5" suppressHydrationWarning />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/88">
              {slot.label}
            </p>
          </div>
        </div>
      )}

      {hasMedia ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
          <span className="inline-flex rounded-md bg-background/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm backdrop-blur">
            {slot.label}
          </span>
        </div>
      ) : null}

      {hasMedia ? (
        <Button
          aria-label={`Clear ${slot.label}`}
          className="absolute right-2.5 top-2.5 z-10 size-7 rounded-full border border-border/80 bg-background/92 shadow-sm backdrop-blur hover:bg-background"
          onClick={onClear}
          size="icon"
          type="button"
          variant="secondary"
        >
          <X className="size-3.5" suppressHydrationWarning />
        </Button>
      ) : (
        <div className="absolute inset-x-2.5 bottom-2.5 flex justify-center">
          <Button
            asChild
            className="reference-upload-chip h-8 rounded-full border border-border/80 bg-background/92 px-3.5 text-xs shadow-sm backdrop-blur"
            size="sm"
            variant="secondary"
          >
            <label
              htmlFor={inputId}
              onKeyDown={(event) => handleFileTriggerKeyDown(event, inputId)}
              role="button"
              tabIndex={0}
            >
              <Upload data-icon="inline-start" suppressHydrationWarning />
              Upload
            </label>
          </Button>
        </div>
      )}

      {errorLabel ? (
        <div className="absolute left-2.5 top-2.5 z-[1]">
          <Badge
            className="border-destructive/50 bg-destructive/12 text-destructive"
            variant="secondary"
          >
            {errorLabel}
          </Badge>
        </div>
      ) : null}
    </div>
  )
}

function RunControlPanel({
  canGenerate,
  className,
  disabledReason,
  generationCostEstimate,
  generationCostReason,
  isBusy,
  isPricingLoading,
  kiePricing,
  onCancelRun,
  onGenerate,
}: {
  canGenerate: boolean
  className?: string
  disabledReason: string | null
  generationCostEstimate: GenerationCostEstimate
  generationCostReason: string
  isBusy: boolean
  isPricingLoading: boolean
  kiePricing: KiePricingResponse | null
  onCancelRun: () => Promise<void>
  onGenerate: () => Promise<void>
}) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const batchSize = useGenerationStore((state) => state.batchSize)
  const setBatchSize = useGenerationStore((state) => state.setBatchSize)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const setImageModel = useGenerationStore((state) => state.setImageModel)
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const setOutputQuality = useGenerationStore((state) => state.setOutputQuality)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const setVideoModel = useGenerationStore((state) => state.setVideoModel)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const setVideoDuration = useGenerationStore((state) => state.setVideoDuration)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const characterGender = useGenerationStore((state) => state.characterGender)
  const characterAgeGroup = useGenerationStore(
    (state) => state.characterAgeGroup,
  )
  const figureArtDirection = useGenerationStore(
    (state) => state.figureArtDirection,
  )
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const generationRun = useGenerationStore((state) => state.generationRun)

  const loadedAssets = useMemo(
    () =>
      [...Object.values(assets), ...products].filter((slot) => isSlotLoaded(slot)),
    [assets, products],
  )
  const selectedImageModel = imageModels.find((model) => model.value === imageModel)
  const selectedVideoModel = videoModels.find((model) => model.value === videoModel)
  const imageQualityOptions = getImageQualityOptions(imageModel, kiePricing)
  const activeModelLabel =
    activeTab === 'image'
      ? getImageModelLabel(imageModel)
      : getVideoModelLabel(videoModel)
  const primaryInputLabel = getPrimaryInputSummary({
    assets,
    products,
    subjectMode,
    textPrompt,
  })
  const characterPresetLabel = getCharacterPresetSummary({
    characterAgeGroup,
    characterGender,
    figureArtDirection,
    subjectMode,
  })
  const runMatchesWorkspace = isRunVisibleForExperience(
    generationRun,
    'manual',
    activeTab,
  )
  const activeRunInWorkspace = runMatchesWorkspace && hasActiveGeneration(generationRun)

  useEffect(() => {
    if (activeTab === 'video' && batchSize !== 1) {
      setBatchSize(1)
    }
  }, [activeTab, batchSize, setBatchSize])

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Review panel
            </p>
            <h2 className="mt-2 text-balance font-display text-xl font-semibold sm:text-2xl">
              Review and run generation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the setup, choose model/batch settings, then run generation.
            </p>
          </div>
          <Badge className="self-start whitespace-nowrap" variant="outline">
            {activeTab === 'video' ? 'Video workspace' : 'Image workspace'}
          </Badge>
        </div>

        <div className={cn(insetPanelClassName, 'overflow-hidden')}>
          <div className="px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Setup summary
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                  <PreviewSnapshotItem
                    label="Primary input"
                    value={primaryInputLabel}
                  />
                  <PreviewSnapshotItem
                    label="Staged assets"
                    value={getLoadedAssetLabel(loadedAssets.length)}
                  />
                </div>
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                  <StatusPill label="Model" value={activeModelLabel} />
                  <StatusPill
                    label="Category"
                    value={getProductCategoryLabel(productCategory)}
                  />
                  <StatusPill
                    label="Style"
                    value={getCreativeStyleLabel(creativeStyle)}
                  />
                  <StatusPill
                    label="Subject"
                    value={getSubjectModeLabel(subjectMode)}
                  />
                  <StatusPill
                    label="Environment"
                    value={getShotEnvironmentLabel(shotEnvironment)}
                  />
                  {characterPresetLabel ? (
                    <StatusPill label="Casting" value={characterPresetLabel} />
                  ) : null}
                  {activeTab === 'video' && cameraMovement ? (
                    <StatusPill
                      label="Camera"
                      value={getCameraMovementLabel(cameraMovement)}
                    />
                  ) : null}
                </div>
              </div>

              <div className="h-px bg-border/70" />

              {activeTab === 'image' ? (
                <>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Batch size
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Image batches render 2x2 grids, then split each grid into four
                      outputs.
                    </p>
                    <ToggleGroup
                      aria-label="Batch Size"
                      className="mt-3 grid w-full grid-cols-2 gap-2 min-[460px]:grid-cols-4"
                      onValueChange={(value) => {
                        if (value) {
                          setBatchSize(Number(value) as BatchSize)
                        }
                      }}
                      type="single"
                      value={String(batchSize)}
                    >
                      {batchSizes.map((size) => (
                        <ToggleGroupItem
                          className="min-h-14 w-full justify-center px-2.5"
                          key={size}
                          value={String(size)}
                        >
                          <span className="flex flex-col items-center gap-0.5">
                            <span className="text-sm font-semibold">{size}x</span>
                            <span className="text-[10px] font-normal uppercase tracking-[0.12em] text-current/70">
                              {`${size * 4} images`}
                            </span>
                          </span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </>
              ) : null}

              <div className={cn('mt-2 grid gap-2.5')}>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {activeTab === 'image' ? 'Image model' : 'Video model'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Curated provider options for the active workspace.
                    </p>
                  </div>

                  {activeTab === 'image' ? (
                    <Select
                      aria-label="Image Model"
                      onChange={(event) => {
                        const nextModel = event.target.value as ImageModelOption
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
                      {imageModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <>
                      <Select
                        aria-label="Video Model"
                        onChange={(event) =>
                          setVideoModel(event.target.value as VideoModelOption)
                        }
                        value={videoModel}
                      >
                        {videoModels.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </Select>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Clip length
                      </p>
                      <Select
                        aria-label="Video Duration"
                        onChange={(event) =>
                          setVideoDuration(event.target.value as VideoDuration)
                        }
                        value={videoDuration}
                      >
                        {durations.map((duration) => (
                          <option key={duration} value={duration}>
                            {getVideoDurationLabel(videoModel, duration)}
                          </option>
                        ))}
                      </Select>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Video resolution
                      </p>
                      <Select
                        aria-label="Video Resolution"
                        onChange={(event) =>
                          setOutputQuality(event.target.value as OutputQuality)
                        }
                        value={outputQuality}
                      >
                        {videoQualities.map((quality) => (
                          <option key={quality} value={quality}>
                            {quality}
                          </option>
                        ))}
                      </Select>
                    </>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'image'
                      ? selectedImageModel?.helper
                      : selectedVideoModel?.helper}
                  </p>

                  {activeTab === 'image' ? (
                    <>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Image resolution
                      </p>
                      <Select
                        aria-label="Image Resolution"
                        onChange={(event) =>
                          setOutputQuality(event.target.value as OutputQuality)
                        }
                        value={outputQuality}
                      >
                        {imageQualityOptions.map((quality) => (
                          <option key={quality} value={quality}>
                            {getImageQualityLabel(quality)}
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : null}

              </div>

                <div className="mt-2.5 flex w-full flex-col gap-2">
                  <GenerationEstimateStrip
                    estimate={generationCostEstimate}
                    isLoading={isPricingLoading}
                    reason={generationCostReason}
                  />

                  {activeRunInWorkspace ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        void onCancelRun()
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <CircleSlash data-icon="inline-start" suppressHydrationWarning />
                      Cancel Run
                    </Button>
                  ) : null}

                  <Button
                    className="min-h-12 w-full text-base font-medium"
                    disabled={isBusy || !canGenerate}
                    onClick={() => {
                      void onGenerate()
                    }}
                  >
                    {isBusy ? (
                      <LoaderCircle
                        className="animate-spin"
                        data-icon="inline-start"
                        suppressHydrationWarning
                      />
                    ) : (
                      <WandSparkles data-icon="inline-start" suppressHydrationWarning />
                    )}
                    {getGenerateButtonLabel(generationRun, batchSize)}
                  </Button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function OutputPanel({
  className,
}: {
  className?: string
}) {
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
  const displayVariant = runMatchesWorkspace
    ? getSelectedRunVariant(runState)
    : null
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

function PreviewSnapshotItem({
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

function StatusPill({ label, value }: { label: string; value: string }) {
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

function GenerationEstimateStrip({
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

function ControlGroup({
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

function SectionHeader({
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

function createGenerationSnapshot(input: {
  activeTab: WorkspaceTab
  assets: NamedAssetSlots
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  figureArtDirection: FigureArtDirection
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  products: AssetSlot[]
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}) {
  return input
}

function useGenerationController(input: {
  enabled: boolean
  kiePricing: KiePricingResponse | null
  kieStatus: KieStatusResponse
  pricingError: string | null
}) {
  const { enabled, kiePricing, kieStatus, pricingError } = input
  const activeTab = useGenerationStore((state) => state.activeTab)
  const assets = useGenerationStore((state) => state.assets)
  const batchSize = useGenerationStore((state) => state.batchSize)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const characterAgeGroup = useGenerationStore(
    (state) => state.characterAgeGroup,
  )
  const characterGender = useGenerationStore((state) => state.characterGender)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const figureArtDirection = useGenerationStore(
    (state) => state.figureArtDirection,
  )
  const generationRun = useGenerationStore((state) => state.generationRun)
  const hydrateGenerationRun = useGenerationStore(
    (state) => state.hydrateGenerationRun,
  )
  const imageModel = useGenerationStore((state) => state.imageModel)
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const products = useGenerationStore((state) => state.products)
  const resetGenerationRun = useGenerationStore((state) => state.resetGenerationRun)
  const setGenerationError = useGenerationStore(
    (state) => state.setGenerationError,
  )
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false)

  const generationSnapshot = useMemo(
    () =>
      createGenerationSnapshot({
        activeTab,
        assets,
        batchSize,
        cameraMovement,
        characterAgeGroup,
        characterGender,
        creativeStyle,
        figureArtDirection,
        imageModel,
        outputQuality,
        productCategory,
        products,
        shotEnvironment,
        subjectMode,
        textPrompt,
        videoDuration,
        videoModel,
      }),
    [
      activeTab,
      assets,
      batchSize,
      cameraMovement,
      characterAgeGroup,
      characterGender,
      creativeStyle,
      figureArtDirection,
      imageModel,
      outputQuality,
      productCategory,
      products,
      shotEnvironment,
      subjectMode,
      textPrompt,
      videoDuration,
      videoModel,
    ],
  )
  const validation = useMemo(
    () => getGenerationValidation(generationSnapshot),
    [generationSnapshot],
  )
  const generationCostEstimate = useMemo(
    () =>
      getGenerationCostEstimate(
        generationSnapshot,
        kiePricing?.matrix ?? null,
      ),
    [generationSnapshot, kiePricing?.matrix],
  )
  const creditValidation = useMemo(
    () =>
      getGenerationCreditValidation({
        balanceCredits: kieStatus.credits,
        balanceError: kieStatus.error,
        estimate: generationCostEstimate,
        pricingError,
      }),
    [
      generationCostEstimate,
      kieStatus.credits,
      kieStatus.error,
      pricingError,
    ],
  )

  const isBusy = isSubmittingGeneration || hasActiveGeneration(generationRun)
  const disabledReason = isBusy
    ? 'A batched render is already in progress. Wait for the current run to finish before starting another batch.'
    : enabled
      ? validation.reason ?? creditValidation.reason
      : 'Manual generation is disabled while guided mode is active.'

  useEffect(() => {
    if (!enabled) {
      return
    }

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
            throw new Error(payload?.error ?? 'Unable to refresh run status.')
          }

          return
        }

        hydrateGenerationRun(payload.run)
      } catch (error) {
        if (!isCancelled) {
          setGenerationError(
            error instanceof Error
              ? error.message
              : 'Unable to refresh run status.',
          )
        }
      }
    }

    void pollRunState()

    const interval = window.setInterval(() => {
      void pollRunState()
    }, runPollIntervalMs)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [
    enabled,
    generationRun.runId,
    generationRun.status,
    hydrateGenerationRun,
    setGenerationError,
  ])

  const handleGenerate = async () => {
    if (!enabled) {
      return
    }

    const state = useGenerationStore.getState()
    const currentSnapshot = createGenerationSnapshot({
      activeTab: state.activeTab,
      assets: state.assets,
      batchSize: state.batchSize,
      cameraMovement: state.cameraMovement,
      characterAgeGroup: state.characterAgeGroup,
      characterGender: state.characterGender,
      creativeStyle: state.creativeStyle,
      figureArtDirection: state.figureArtDirection,
      imageModel: state.imageModel,
      outputQuality: state.outputQuality,
      productCategory: state.productCategory,
      products: state.products,
      shotEnvironment: state.shotEnvironment,
      subjectMode: state.subjectMode,
      textPrompt: state.textPrompt,
      videoDuration: state.videoDuration,
      videoModel: state.videoModel,
    })
    const currentValidation = getGenerationValidation(currentSnapshot)

    if (!currentValidation.canGenerate) {
      setGenerationError(currentValidation.reason ?? 'Generation is blocked.')
      return
    }

    const currentEstimate = getGenerationCostEstimate(
      currentSnapshot,
      kiePricing?.matrix ?? null,
    )
    const currentCreditValidation = getGenerationCreditValidation({
      balanceCredits: kieStatus.credits,
      balanceError: kieStatus.error,
      estimate: currentEstimate,
      pricingError,
    })

    if (!currentCreditValidation.canGenerate) {
      setGenerationError(
        currentCreditValidation.reason ?? 'Generation is blocked.',
      )
      return
    }

    try {
      const { formData } = buildGenerationFormData(currentSnapshot)

      resetGenerationRun()
      setIsSubmittingGeneration(true)

      const response = await fetch('/api/generation/run', {
        body: formData,
        method: 'POST',
      })
      const payload = (await response.json()) as GenerationRun & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to start generation.')
      }

      hydrateGenerationRun(payload)
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Unable to start generation.',
      )
    } finally {
      setIsSubmittingGeneration(false)
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
        throw new Error(payload?.error ?? 'Unable to cancel the active run.')
      }

      hydrateGenerationRun(payload.run)
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Unable to cancel the active run.',
      )
    }
  }

  return {
    canGenerate:
      enabled && !isSubmittingGeneration
        ? validation.canGenerate && creditValidation.canGenerate
        : false,
    disabledReason,
    generationCostEstimate,
    generationCostReason:
      pricingError ?? generationCostEstimate.reason ?? 'Live pricing unavailable.',
    handleCancel,
    handleGenerate,
    isBusy,
  }
}

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

function getReferenceCardErrorLabel(slot: AssetSlot) {
  if (!slot.error) {
    return null
  }

  return 'Error'
}

function isSlotLoaded(slot: AssetSlot) {
  return Boolean(slot.file || slot.previewUrl)
}

function getPrimaryInputSummary({
  assets,
  products,
  subjectMode,
  textPrompt,
}: {
  assets: NamedAssetSlots
  products: AssetSlot[]
  subjectMode: SubjectMode
  textPrompt: string
}) {
  const face1 = assets.face1
  const primaryProduct = products[0] ?? null

  if (subjectMode === 'lifestyle' && face1 && isSlotLoaded(face1)) {
    return face1.label
  }

  if (primaryProduct && isSlotLoaded(primaryProduct)) {
    return primaryProduct.label
  }

  if (face1 && isSlotLoaded(face1)) {
    return face1.label
  }

  if (textPrompt.trim().length > 0) {
    return 'Prompt Only'
  }

  return 'None Selected'
}

function getLoadedAssetLabel(count: number) {
  return `${count} Loaded`
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

function hasActiveGeneration(run: GenerationRun) {
  return run.status === 'rendering'
}

function getSelectedRunVariant(run: GenerationRun) {
  return (
    run.variants.find((variant) => variant.variantId === run.selectedVariantId) ??
    run.variants.find((variant) => variant.status === 'success' && Boolean(variant.result)) ??
    run.variants[0] ??
    null
  )
}

function getImageModelLabel(model: ImageModelOption) {
  return imageModels.find((option) => option.value === model)?.label ?? model
}

function getVideoModelLabel(model: VideoModelOption) {
  return videoModels.find((option) => option.value === model)?.label ?? model
}

function getProductCategoryLabel(category: ProductCategory) {
  return (
    productCategories.find((option) => option.value === category)?.label ??
    humanize(category)
  )
}

function getCreativeStyleLabel(style: CreativeStyle) {
  return creativeStyles.find((option) => option.value === style)?.label ?? humanize(style)
}

function getSubjectModeLabel(mode: SubjectMode) {
  return mode === 'lifestyle' ? 'Lifestyle' : 'Product Only'
}

function getShotEnvironmentLabel(environment: ShotEnvironment) {
  return (
    shotEnvironments.find((option) => option.value === environment)?.label ??
    humanize(environment)
  )
}

function getFigureArtDirectionLabel(direction: FigureArtDirection) {
  return (
    figureArtDirections.find((option) => option.value === direction)?.label ??
    humanize(direction)
  )
}

function getCharacterPresetSummary(input: {
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  figureArtDirection: FigureArtDirection
  subjectMode: SubjectMode
}) {
  if (input.subjectMode !== 'lifestyle') {
    return null
  }

  const selections = [input.characterGender, input.characterAgeGroup]
    .filter((value) => value !== 'any')
    .map((value) => humanize(value))

  if (input.figureArtDirection !== 'none') {
    selections.push(getFigureArtDirectionLabel(input.figureArtDirection))
  }

  return selections.length > 0 ? selections.join(', ') : 'Any Cast'
}

function getCameraMovementLabel(movement: CameraMovement) {
  return (
    cameraMovements.find((option) => option.value === movement)?.label ??
    humanize(movement)
  )
}

function humanize(value: string) {
  return value
    .split('-')
    .map((segment) => {
      const normalized = segment.toLowerCase()

      if (normalized === 'ugc') {
        return 'UGC'
      }

      if (normalized === 'tv') {
        return 'TV'
      }

      if (normalized === 'kie') {
        return 'KIE'
      }

      return normalized.charAt(0).toUpperCase() + normalized.slice(1)
    })
    .join(' ')
}
