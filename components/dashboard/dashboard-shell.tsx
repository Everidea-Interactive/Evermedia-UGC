'use client'

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
  Check,
  CircleSlash,
  Brush,
  Clapperboard,
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
  Star,
  Truck,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'

import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOptionalStudioProjectContext } from '@/components/dashboard/studio-project-context'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  buildGenerationFormData,
  getAssetPreviewUrl,
  getGenerationValidation,
} from '@/lib/generation/client'
import { isImageMimeType } from '@/lib/media/image-preview'
import {
  getActiveTaskCount,
  getCompletedVariantCount,
  getFailedVariantCount,
  getGenerateButtonLabel,
  getGenerationHelperMessage,
  getRunBodyCopy,
  getRunHeadline,
} from '@/lib/generation/run-copy'
import { useKieStatus } from '@/lib/generation/use-kie-status'
import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterEthnicity,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  GenerationRun,
  GenerationRunStatus,
  KieStatusResponse,
  GenerationVariant,
  GenerationReviewStatus,
  ImageModelOption,
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
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const workspaceTabs: Array<{
  value: WorkspaceTab
  label: string
  helper: string
  icon: LucideIcon
}> = [
  {
    value: 'image',
    label: 'Image',
    helper: 'Still renders',
    icon: ImageIcon,
  },
  {
    value: 'video',
    label: 'Video',
    helper: 'Motion renders',
    icon: Film,
  },
]

const productCategories: Array<{
  value: ProductCategory
  label: string
  icon: LucideIcon
}> = [
  { value: 'food-drink', label: 'Food & Drink', icon: CupSoda },
  { value: 'jewelry', label: 'Jewelry', icon: Gem },
  { value: 'cosmetics', label: 'Cosmetics & Beauty', icon: Sparkles },
  { value: 'electronics', label: 'Electronics & Tech', icon: Laptop },
  { value: 'clothing', label: 'Clothing & Fashion', icon: Shirt },
  { value: 'miscellaneous', label: 'Miscellaneous', icon: Package2 },
]

const creativeStyles: Array<{
  value: CreativeStyle
  label: string
}> = [
  { value: 'ugc-lifestyle', label: 'UGC / Lifestyle' },
  { value: 'cinematic', label: 'Hollywood Cinematic' },
  { value: 'tv-commercial', label: 'TV Commercial' },
  {
    value: 'elite-product-commercial',
    label: 'Elite Product Commercial',
  },
]

const subjectModes: Array<{
  value: SubjectMode
  label: string
  description: string
}> = [
  {
    value: 'lifestyle',
    label: 'Lifestyle',
    description:
      'Lifestyle image with a person naturally interacting with the product.',
  },
  {
    value: 'product-only',
    label: 'Product Only',
    description: 'Keep the product as the sole hero subject with no visible person.',
  },
]

const shotEnvironments: Array<{
  value: ShotEnvironment
  label: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'indoor',
    label: 'Indoor',
    description: 'Studio, interior, curated indoor environment.',
    icon: House,
  },
  {
    value: 'outdoor',
    label: 'Outdoor',
    description: 'Exterior location with natural environmental context.',
    icon: Leaf,
  },
]

const characterGenders: Array<{
  value: CharacterGender
  label: string
}> = [
  { value: 'any', label: 'Any' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-Binary' },
]

const characterAgeGroups: Array<{
  value: CharacterAgeGroup
  label: string
}> = [
  { value: 'any', label: 'Any' },
  { value: 'young-adult', label: 'Young Adult' },
  { value: 'adult', label: 'Adult' },
  { value: 'middle-aged', label: 'Middle Aged' },
  { value: 'senior', label: 'Senior' },
]

const characterEthnicities: Array<{
  value: CharacterEthnicity
  label: string
}> = [
  { value: 'any', label: 'Any' },
  { value: 'south-asian', label: 'South Asian' },
  { value: 'east-asian', label: 'East Asian' },
  { value: 'black', label: 'Black' },
  { value: 'caucasian', label: 'Caucasian' },
  { value: 'hispanic', label: 'Hispanic' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'mixed', label: 'Mixed' },
]

const figureArtDirections: Array<{
  value: FigureArtDirection
  label: string
  description: string
}> = [
  {
    value: 'none',
    label: 'None',
    description: 'Default',
  },
  {
    value: 'curvaceous-editorial',
    label: 'Curvaceous',
    description: 'Full figure, dramatic curves, fashion-forward.',
  },
]

const batchSizes: BatchSize[] = [1, 2, 3, 4]

const cameraMovements: Array<{
  value: CameraMovement
  label: string
}> = [
  { value: 'orbit', label: 'Orbit' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'drone', label: 'Drone' },
  { value: 'crash-zoom', label: 'Crash Zoom' },
  { value: 'macro', label: 'Macro' },
]

const imageModels: Array<{
  value: ImageModelOption
  label: string
  helper: string
}> = [
  {
    value: 'nano-banana',
    label: 'Nano Banana 2',
    helper: 'Google image generation with direct reference input',
  },
  {
    value: 'grok-imagine',
    label: 'Grok Imagine',
    helper: 'Text and image-led still renders',
  },
]

const videoModels: Array<{
  value: VideoModelOption
  label: string
  helper: string
}> = [
  {
    value: 'veo-3.1',
    label: 'Veo 3.1',
    helper: 'Reference and end-frame video renders',
  },
  {
    value: 'kling',
    label: 'Kling',
    helper: 'Market-model text or image video',
  },
  {
    value: 'grok-imagine',
    label: 'Grok Imagine',
    helper: 'Prompt-led short motion clips',
  },
]

const qualities: OutputQuality[] = ['720p', '1080p', '4k']
const durations: VideoDuration[] = ['base', 'extended']

const peopleReferenceCards: Array<{
  key: Extract<NamedAssetKey, 'face1' | 'face2'>
  label: string
  icon: LucideIcon
}> = [
  {
    key: 'face1',
    label: 'Face 1',
    icon: UserRound,
  },
  {
    key: 'face2',
    label: 'Face 2',
    icon: UserRound,
  },
]

const styleReferenceCards: Array<{
  key: Extract<NamedAssetKey, 'clothing' | 'location'>
  label: string
  icon: LucideIcon
}> = [
  {
    key: 'clothing',
    label: 'Clothing',
    icon: Brush,
  },
  {
    key: 'location',
    label: 'Location',
    icon: MapPin,
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
const imageAccept = 'image/png,image/jpeg,image/webp,image/jpg'
const projectRunPollIntervalMs = 2_500

function getMediaAssetUrl(assetId: string) {
  return `/api/media/${assetId}`
}

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

function StudioDeliverableMedia({
  alt,
  label,
  mimeType,
  src,
}: {
  alt: string
  label: string
  mimeType: string
  src: string
}) {
  if (isImageMimeType(mimeType)) {
    return (
      <ImagePreviewTrigger
        alt={alt}
        className="block w-full overflow-hidden bg-black/20"
        label={label}
        src={src}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt}
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
          src={src}
        />
      </ImagePreviewTrigger>
    )
  }

  return (
    <video
      className="aspect-[4/3] w-full bg-black object-cover"
      controls
      playsInline
      preload="metadata"
      src={src}
    />
  )
}

export function DashboardShell() {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const setActiveTab = useGenerationStore((state) => state.setActiveTab)
  const controller = useGenerationController()

  useEffect(() => {
    return () => {
      useGenerationStore.getState().disposeGenerationState()
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden">
      <a
        href="#dashboard-main"
        className="sr-only left-4 top-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed"
      >
        Skip to Main Content
      </a>

      <main
        id="dashboard-main"
        className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6"
      >
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
          className="flex flex-1 flex-col gap-4"
        >
          <TopBar />

          <section className={cn(panelClassName, 'p-3 sm:p-4')}>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Output mode
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose whether the workspace builds a still render or a motion
                  render before staging references.
                </p>
              </div>

              <TabsList aria-label="Workspace Tabs" className="w-full grid-cols-2">
                {workspaceTabs.map((tab) => {
                  const Icon = tab.icon

                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="min-h-[5rem] px-5 py-4 sm:min-h-[5.5rem]"
                    >
                      <span className="mx-auto flex w-full max-w-[12rem] items-center justify-center gap-3 text-left">
                        <Icon
                          suppressHydrationWarning
                          className="size-5 shrink-0"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-base font-semibold">
                            {tab.label}
                          </span>
                          <span className="text-xs font-normal text-current/72">
                            {tab.helper}
                          </span>
                        </span>
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.92fr)] xl:items-start">
            <ReferenceWorkspaceSection className="xl:col-start-1 xl:row-start-1" />
            <PreviewCanvas
              canGenerate={controller.canGenerate}
              disabledReason={controller.disabledReason}
              isBusy={controller.isBusy}
              onCancelRun={controller.handleCancel}
              onGenerate={controller.handleGenerate}
              onReviewUpdate={controller.handleReviewUpdate}
              className="xl:col-start-2 xl:row-start-1 xl:row-span-4 xl:sticky xl:top-6 xl:self-start"
            />
            <RefineRenderSection className="xl:col-start-1 xl:row-start-2" />
            {activeTab === 'video' ? (
              <MotionControlsSection className="xl:col-start-1 xl:row-start-3" />
            ) : null}
          </div>
        </Tabs>
      </main>
    </div>
  )
}

function TopBar() {
  const generationRun = useGenerationStore((state) => state.generationRun)
  const { isLoading: isKieStatusLoading, status: kieStatus } =
    useKieStatus(generationRun)

  return (
    <header className={cn(panelClassName, 'px-4 py-4 sm:px-5')}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
            <Clapperboard suppressHydrationWarning className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">Evermedia UGC</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build the reference board first, then run generation from the
              output panel.
            </p>
          </div>
        </div>

        <div className="w-full xl:max-w-[16rem]">
          <HeaderMetricCard
            helper={getKieCreditsHelper(kieStatus, isKieStatusLoading)}
            label="KIE Credits"
            value={getKieCreditsValue(kieStatus, isKieStatusLoading)}
          />
        </div>
      </div>
    </header>
  )
}

function HeaderMetricCard({
  helper,
  label,
  value,
}: {
  helper: string
  label: string
  value: string
}) {
  return (
    <div className={cn(insetPanelClassName, 'px-3 py-3')}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p
        className="mt-1 truncate text-xs text-muted-foreground"
        title={helper}
      >
        {helper}
      </p>
    </div>
  )
}

function ReferenceWorkspaceSection({ className }: { className?: string }) {
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const setNamedAssetFile = useGenerationStore((state) => state.setNamedAssetFile)
  const clearNamedAsset = useGenerationStore((state) => state.clearNamedAsset)
  const resetGenerationState = useGenerationStore(
    (state) => state.resetGenerationState,
  )
  const setProductSlotFile = useGenerationStore(
    (state) => state.setProductSlotFile,
  )
  const clearProductSlot = useGenerationStore((state) => state.clearProductSlot)
  const projectContext = useOptionalStudioProjectContext()
  const productSlots = products.slice(0, 2)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            eyebrow="Reference board"
            title="Build the input set"
            description="Stage every visual input here first. Keep the board fixed so people, styling, environment, and products remain easy to scan."
          />
          <Button
            onClick={() => {
              if (projectContext) {
                void projectContext.resetProjectBoard()
                return
              }

              resetGenerationState()
            }}
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
                  key={asset.key}
                  icon={asset.icon}
                  inputId={`asset-${asset.key}`}
                  slot={assets[asset.key]}
                  onClear={() => {
                    if (projectContext) {
                      void projectContext.clearNamedAsset(asset.key)
                      return
                    }

                    clearNamedAsset(asset.key)
                  }}
                  onSelect={(file) => {
                    if (projectContext) {
                      void projectContext.stageNamedAsset(asset.key, file)
                      return
                    }

                    setNamedAssetFile(asset.key, file)
                  }}
                />
              ))}
            </ReferenceCardGroup>

            <ReferenceCardGroup title="Style & Environment">
              {styleReferenceCards.map((asset) => (
                <ReferenceCard
                  key={asset.key}
                  icon={asset.icon}
                  inputId={`asset-${asset.key}`}
                  slot={assets[asset.key]}
                  onClear={() => {
                    if (projectContext) {
                      void projectContext.clearNamedAsset(asset.key)
                      return
                    }

                    clearNamedAsset(asset.key)
                  }}
                  onSelect={(file) => {
                    if (projectContext) {
                      void projectContext.stageNamedAsset(asset.key, file)
                      return
                    }

                    setNamedAssetFile(asset.key, file)
                  }}
                />
              ))}
            </ReferenceCardGroup>
          </div>

          <ReferenceCardGroup title="Products" className="xl:self-start">
            {productSlots.map((product) => (
              <ReferenceCard
                key={product.id}
                icon={Package2}
                inputId={`product-${product.id}`}
                slot={product}
                onClear={() => {
                  if (projectContext) {
                    void projectContext.clearProductAsset(product.id)
                    return
                  }

                  clearProductSlot(product.id)
                }}
                onSelect={(file) => {
                  if (projectContext) {
                    void projectContext.stageProductAsset(product.id, file)
                    return
                  }

                  setProductSlotFile(product.id, file)
                }}
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
  const productCategory = useGenerationStore((state) => state.productCategory)
  const setProductCategory = useGenerationStore(
    (state) => state.setProductCategory,
  )
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const setCreativeStyle = useGenerationStore((state) => state.setCreativeStyle)
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
  const characterEthnicity = useGenerationStore(
    (state) => state.characterEthnicity,
  )
  const setCharacterEthnicity = useGenerationStore(
    (state) => state.setCharacterEthnicity,
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
          eyebrow="Preset"
          title="Build the generation preset"
          description="Set the structured preset first, then add any optional free-form direction."
        />

        <div className="grid gap-4 xl:grid-cols-12 xl:gap-x-4">
          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            title="Subject Configuration"
            description="Person present or product-only."
          >
            <ToggleGroup
              aria-label="Subject Configuration"
              type="single"
              value={subjectMode}
              className="grid w-full grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setSubjectMode(value as SubjectMode)
                }
              }}
            >
              {subjectModes.map((mode) => (
                <ToggleGroupItem
                  key={mode.value}
                  value={mode.value}
                  className={presetCompactTileClassName}
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
            title="Photography Style"
            description="High-level visual language."
          >
            <ToggleGroup
              aria-label="Creative Style"
              type="single"
              value={creativeStyle}
              className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setCreativeStyle(value as CreativeStyle)
                }
              }}
            >
              {creativeStyles.map((style) => (
                <ToggleGroupItem
                  key={style.value}
                  value={style.value}
                  className={presetCompactTileClassName}
                >
                  {style.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            title="Shot Environment"
            description="Indoor or outdoor context."
          >
            <ToggleGroup
              aria-label="Shot Environment"
              type="single"
              value={shotEnvironment}
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setShotEnvironment(value as ShotEnvironment)
                }
              }}
            >
              {shotEnvironments.map((environment) => {
                const Icon = environment.icon

                return (
                  <ToggleGroupItem
                    key={environment.value}
                    value={environment.value}
                    className={cn(presetCompactTileClassName, 'gap-2')}
                  >
                    <Icon suppressHydrationWarning className="size-4" />
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
            title="Product Category"
            description="Campaign context for the generated prompt."
          >
            <ToggleGroup
              aria-label="Product Category"
              type="single"
              value={productCategory}
              className="grid grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setProductCategory(value as ProductCategory)
                }
              }}
            >
              {productCategories.map((category) => {
                const Icon = category.icon

                return (
                  <ToggleGroupItem
                    key={category.value}
                    value={category.value}
                    className={cn(presetTileClassName, 'justify-start gap-2 text-left')}
                  >
                    <Icon suppressHydrationWarning className="size-4" />
                    {category.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-4')}
            title="Figure Art Direction"
            description="Editorial direction when a person is present."
          >
            <ToggleGroup
              aria-label="Figure Art Direction"
              type="single"
              value={figureArtDirection}
              className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2"
              onValueChange={(value) => {
                if (value) {
                  setFigureArtDirection(value as FigureArtDirection)
                }
              }}
            >
              {figureArtDirections.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  disabled={!isLifestyle}
                  className={presetCompactTileClassName}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {figureArtDirections.find(
                (option) => option.value === figureArtDirection,
              )?.description ?? 'Choose the figure styling direction.'}
            </p>
            {!isLifestyle ? (
              <p className="text-xs text-muted-foreground">
                Figure art direction is available only for lifestyle presets.
              </p>
            ) : null}
          </ControlGroup>

          <ControlGroup
            className={cn(presetGroupClassName, 'xl:col-span-12')}
            title="Character Demographics (Auto-Prompt)"
            description="Lifestyle presets can bias cast attributes without changing the reference board."
          >
            <div
              className={cn(
                'grid gap-3 lg:grid-cols-2 lg:gap-x-3 xl:grid-cols-3',
                !isLifestyle && 'opacity-60',
              )}
            >
              <div className={cn(presetSubgroupClassName, 'grid gap-1.5 self-start')}>
                <PresetGroupLabel>Gender</PresetGroupLabel>
                <ToggleGroup
                  aria-label="Character Gender"
                  type="single"
                  value={characterGender}
                  className="grid grid-cols-[repeat(auto-fit,minmax(6.75rem,1fr))] gap-2"
                  onValueChange={(value) => {
                    if (value) {
                      setCharacterGender(value as CharacterGender)
                    }
                  }}
                >
                  {characterGenders.map((option) => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      disabled={!isLifestyle}
                      className={presetCompactTileClassName}
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
                  type="single"
                  value={characterAgeGroup}
                  className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2"
                  onValueChange={(value) => {
                    if (value) {
                      setCharacterAgeGroup(value as CharacterAgeGroup)
                    }
                  }}
                >
                  {characterAgeGroups.map((option) => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      disabled={!isLifestyle}
                      className={presetCompactTileClassName}
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div
                className={cn(
                  presetSubgroupClassName,
                  'grid gap-1.5 lg:col-span-2 xl:col-span-1 self-start',
                )}
              >
                <PresetGroupLabel>Ethnicity</PresetGroupLabel>
                <ToggleGroup
                  aria-label="Character Ethnicity"
                  type="single"
                  value={characterEthnicity}
                  className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2"
                  onValueChange={(value) => {
                    if (value) {
                      setCharacterEthnicity(value as CharacterEthnicity)
                    }
                  }}
                >
                  {characterEthnicities.map((option) => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      disabled={!isLifestyle}
                      className={presetCompactTileClassName}
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
            title="Additional Instructions"
            description="Optional free-form direction appended after the structured preset."
          >
            <Textarea
              aria-label={
                activeTab === 'image'
                  ? 'Image generation additional instructions'
                  : 'Video generation additional instructions'
              }
              autoComplete="off"
              className="preset-textarea"
              placeholder="Add any extra creative direction, for example: dramatic backlight, golden hour, neon rim light…"
              value={textPrompt}
              onChange={(event) => setTextPrompt(event.target.value)}
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
  const videoModel = useGenerationStore((state) => state.videoModel)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const setVideoDuration = useGenerationStore((state) => state.setVideoDuration)
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const setOutputQuality = useGenerationStore((state) => state.setOutputQuality)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const setCameraMovement = useGenerationStore(
    (state) => state.setCameraMovement,
  )
  const endFrame = useGenerationStore((state) => state.assets.endFrame)
  const setNamedAssetFile = useGenerationStore((state) => state.setNamedAssetFile)
  const clearNamedAsset = useGenerationStore((state) => state.clearNamedAsset)
  const projectContext = useOptionalStudioProjectContext()

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          eyebrow="Motion controls"
          title="Tune video behavior"
          description="These settings stay after the reference board because they only matter once the input set and brief are established."
        />

        <div className="grid gap-5">
          <ControlGroup
            title="Clip length"
            description="Maps into the selected provider&apos;s supported duration range."
          >
            <ToggleGroup
              aria-label="Video Duration"
              type="single"
              value={videoDuration}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              onValueChange={(value) => {
                if (value) {
                  setVideoDuration(value as VideoDuration)
                }
              }}
            >
              {durations.map((duration) => (
                <ToggleGroupItem
                  key={duration}
                  value={duration}
                  className={tileClassName}
                >
                  {duration === 'base' ? 'Base (~5-8s)' : 'Extended (+7s)'}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            title="Output resolution"
            description="Resolution preferences are passed through when the model supports them directly."
          >
            <ToggleGroup
              aria-label="Output Quality"
              type="single"
              value={outputQuality}
              className="grid grid-cols-3 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setOutputQuality(value as OutputQuality)
                }
              }}
            >
              {qualities.map((quality) => (
                <ToggleGroupItem
                  key={quality}
                  value={quality}
                  className={tileClassName}
                >
                  {quality}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {videoModel === 'veo-3.1' && outputQuality === '4k' ? (
              <p className="text-xs text-muted-foreground">
                4K Veo upgrades are reserved for a later phase, so generation
                stays disabled until you switch back to 720p or 1080p.
              </p>
            ) : null}
          </ControlGroup>

          <ControlGroup
            title="Movement language"
            description="Camera movement is treated as a structured prompt modifier."
          >
            <ToggleGroup
              aria-label="Camera Movement"
              type="single"
              value={cameraMovement ?? ''}
              className="grid grid-cols-2 gap-2"
              onValueChange={(value) =>
                setCameraMovement(value ? (value as CameraMovement) : null)
              }
            >
              {cameraMovements.map((movement) => (
                <ToggleGroupItem
                  key={movement.value}
                  value={movement.value}
                  className={tileClassName}
                >
                  {movement.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            title="End frame reference"
            description="Only Veo uses end-frame guidance in Phase 2. Other models ignore this slot."
          >
            <ReferenceCard
              className="self-start w-full max-w-[13rem] sm:max-w-[15rem]"
              icon={ScanLine}
              inputId="asset-end-frame"
              slot={endFrame}
              onClear={() => {
                if (projectContext) {
                  void projectContext.clearNamedAsset('endFrame')
                  return
                }

                clearNamedAsset('endFrame')
              }}
              onSelect={(file) => {
                if (projectContext) {
                  void projectContext.stageNamedAsset('endFrame', file)
                  return
                }

                setNamedAssetFile('endFrame', file)
              }}
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
  slot,
  onClear,
  onSelect,
}: {
  className?: string
  icon: LucideIcon
  inputId: string
  slot: AssetSlot
  onClear: () => void
  onSelect: (file: File | null) => void
}) {
  const previewSrc = getAssetPreviewUrl(slot)
  const hasMedia = Boolean(previewSrc)
  const isUploading = slot.uploadStatus === 'uploading'
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
        id={inputId}
        type="file"
        accept={imageAccept}
        className="sr-only"
        onChange={(event) => handleFileInput(event, onSelect)}
      />

      {previewSrc ? (
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
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/80 text-muted-foreground">
              <Icon suppressHydrationWarning className="size-4.5" />
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
          onClick={onClear}
          size="icon"
          type="button"
          variant="secondary"
          className="absolute right-2.5 top-2.5 z-10 size-7 rounded-full border border-border/80 bg-background/92 shadow-sm backdrop-blur hover:bg-background"
        >
          <X suppressHydrationWarning className="size-3.5" />
        </Button>
      ) : (
        <div className="absolute inset-x-2.5 bottom-2.5 flex justify-center">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="reference-upload-chip h-8 rounded-full border border-border/80 bg-background/92 px-3.5 text-xs shadow-sm backdrop-blur"
          >
            <label
              htmlFor={inputId}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => handleFileTriggerKeyDown(event, inputId)}
            >
              <Upload suppressHydrationWarning data-icon="inline-start" />
              Upload
            </label>
          </Button>
        </div>
      )}

      {isUploading ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-background/78 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm">
            <LoaderCircle
              suppressHydrationWarning
              className="size-3.5 animate-spin"
            />
            Uploading
          </div>
        </div>
      ) : null}

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

function PreviewCanvas({
  canGenerate,
  disabledReason,
  isBusy,
  onCancelRun,
  onGenerate,
  onReviewUpdate,
  className,
}: {
  canGenerate: boolean
  disabledReason: string | null
  isBusy: boolean
  onCancelRun: () => Promise<void>
  onGenerate: () => Promise<void>
  onReviewUpdate: (input: {
    reviewNotes?: string | null
    reviewStatus?: GenerationReviewStatus
    selectedForDelivery?: boolean
    setHero?: boolean
    variantId: string
  }) => Promise<void>
  className?: string
}) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const setImageModel = useGenerationStore((state) => state.setImageModel)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const setVideoModel = useGenerationStore((state) => state.setVideoModel)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const characterGender = useGenerationStore((state) => state.characterGender)
  const characterAgeGroup = useGenerationStore(
    (state) => state.characterAgeGroup,
  )
  const characterEthnicity = useGenerationStore(
    (state) => state.characterEthnicity,
  )
  const figureArtDirection = useGenerationStore(
    (state) => state.figureArtDirection,
  )
  const batchSize = useGenerationStore((state) => state.batchSize)
  const setBatchSize = useGenerationStore((state) => state.setBatchSize)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const generationRun = useGenerationStore((state) => state.generationRun)

  const loadedAssets = useMemo(
    () =>
      [...Object.values(assets), ...products].filter((slot) => isSlotLoaded(slot)),
    [assets, products],
  )
  const selectedImageModel = imageModels.find((model) => model.value === imageModel)
  const selectedVideoModel = videoModels.find((model) => model.value === videoModel)
  const activeModelLabel =
    activeTab === 'image'
      ? getImageModelLabel(imageModel)
      : getVideoModelLabel(videoModel)
  const primaryInputLabel = getPrimaryInputSummary({
    subjectMode,
    assets,
    products,
    textPrompt,
  })
  const characterPresetLabel = getCharacterPresetSummary({
    characterAgeGroup,
    characterEthnicity,
    characterGender,
    figureArtDirection,
    subjectMode,
  })
  const runMatchesWorkspace = generationRun.workspace === activeTab
  const activeRunInWorkspace =
    runMatchesWorkspace && hasActiveGeneration(generationRun)
  const generationFooterMessage =
    !runMatchesWorkspace || generationRun.status === 'idle'
      ? getGenerationHelperMessage(disabledReason, generationRun)
      : null

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Output panel
            </p>
            <h2 className="mt-2 text-balance font-display text-xl font-semibold sm:text-2xl">
              Review and run generation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the output visible while you build the reference board, then
              run generation from the footer below.
            </p>
          </div>
          <Badge className="self-start whitespace-nowrap" variant="outline">
            {activeTab === 'video' ? 'Video workspace' : 'Image workspace'}
          </Badge>
        </div>

        <div className={cn(insetPanelClassName, 'overflow-hidden')}>
          <div className="border-b border-border px-3 py-3.5 sm:px-5 sm:py-4">
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
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

          <div className="p-4 sm:p-5">
            <div className="flex min-h-[240px] flex-col sm:min-h-[320px]">
              <PreviewStage
                activeTab={activeTab}
                loadedAssets={loadedAssets.length}
                onReviewUpdate={onReviewUpdate}
                runMatchesWorkspace={runMatchesWorkspace}
                runState={generationRun}
              />
            </div>
          </div>

          <div className="border-t border-border px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Batch size
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Parallel variants reuse the same staged references and split
                  into separate KIE tasks.
                </p>
                <ToggleGroup
                  aria-label="Batch Size"
                  type="single"
                  value={String(batchSize)}
                  className="mt-3 grid w-full grid-cols-2 gap-2 min-[460px]:grid-cols-4"
                  onValueChange={(value) => {
                    if (value) {
                      setBatchSize(Number(value) as BatchSize)
                    }
                  }}
                >
                  {batchSizes.map((size) => (
                    <ToggleGroupItem
                      key={size}
                      value={String(size)}
                      className="min-h-14 w-full justify-center px-2.5"
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-semibold">{size}x</span>
                        <span className="text-[10px] font-normal uppercase tracking-[0.12em] text-current/70">
                          {size === 1 ? 'Single' : `${size} tasks`}
                        </span>
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="h-px bg-border/70" />

              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Generation
                </p>
                {generationFooterMessage ? (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {generationFooterMessage}
                  </p>
                ) : null}

                <div className={cn(generationFooterMessage ? 'mt-4' : 'mt-2', 'grid gap-2.5')}>
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
                      value={imageModel}
                      onChange={(event) =>
                        setImageModel(event.target.value as ImageModelOption)
                      }
                    >
                      {imageModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      aria-label="Video Model"
                      value={videoModel}
                      onChange={(event) =>
                        setVideoModel(event.target.value as VideoModelOption)
                      }
                    >
                      {videoModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </Select>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'image'
                      ? selectedImageModel?.helper
                      : selectedVideoModel?.helper}
                  </p>
                </div>

                <div className="mt-2.5 flex w-full flex-col gap-2">
                  {activeRunInWorkspace ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        void onCancelRun()
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <CircleSlash
                        suppressHydrationWarning
                        data-icon="inline-start"
                      />
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
                        suppressHydrationWarning
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <WandSparkles
                        suppressHydrationWarning
                        data-icon="inline-start"
                      />
                    )}
                    {getGenerateButtonLabel(generationRun, batchSize)}
                  </Button>
                </div>
              </div>
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
  onReviewUpdate,
  runMatchesWorkspace,
  runState,
}: {
  activeTab: WorkspaceTab
  loadedAssets: number
  onReviewUpdate: (input: {
    reviewNotes?: string | null
    reviewStatus?: GenerationReviewStatus
    selectedForDelivery?: boolean
    setHero?: boolean
    variantId: string
  }) => Promise<void>
  runMatchesWorkspace: boolean
  runState: ReturnType<typeof useGenerationStore.getState>['generationRun']
}) {
  const projectContext = useOptionalStudioProjectContext()
  const selectGenerationVariant = useGenerationStore(
    (state) => state.selectGenerationVariant,
  )
  const [reviewFilter, setReviewFilter] = useState<'all' | GenerationReviewStatus>(
    'all',
  )
  const [detailPanel, setDetailPanel] = useState<'prompt' | 'notes'>('prompt')
  const [noteEditor, setNoteEditor] = useState<{
    text: string
    variantId: string | null
  }>({
    text: '',
    variantId: null,
  })
  const selectedVariant = runMatchesWorkspace
    ? getSelectedRunVariant(runState)
    : null
  const totalVariants = runState.variants.length
  const completedVariants = getCompletedVariantCount(runState)
  const failedVariants = getFailedVariantCount(runState)
  const activeTaskCount = getActiveTaskCount(runState)
  const runSummaryItems = [`${completedVariants}/${totalVariants} complete`]
  if (failedVariants > 0) {
    runSummaryItems.push(`${failedVariants} failed`)
  }
  if (activeTaskCount > 0) {
    runSummaryItems.push(`${activeTaskCount} active`)
  }
  const filteredVariants = runState.variants.filter((variant) => {
    if (reviewFilter === 'all') {
      return true
    }

    if (reviewFilter === 'rejected') {
      return (
        variant.reviewStatus === 'rejected' ||
        variant.status === 'error' ||
        variant.status === 'cancelled'
      )
    }

    return variant.status === 'success' && variant.reviewStatus === reviewFilter
  })
  const deliverables = useMemo(() => {
    const currentProject = projectContext?.currentProject

    if (!currentProject) {
      return []
    }

    const outputMap = new Map(
      currentProject.outputAssets.map((asset) => [asset.id, asset] as const),
    )

    return currentProject.runs.flatMap((run) =>
      run.variants
        .filter(
          (variant) =>
            Boolean(variant.resultAssetId) &&
            (variant.selectedForDelivery || variant.isHero || variant.reviewStatus === 'approved'),
        )
        .map((variant) => {
          const asset = variant.resultAssetId
            ? outputMap.get(variant.resultAssetId)
            : null

          if (!asset) {
            return null
          }

          return {
            assetId: asset.id,
            isHero: variant.isHero,
            label: asset.label,
            mimeType: asset.mimeType,
            reviewStatus: variant.reviewStatus,
            variantIndex: variant.variantIndex,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    )
  }, [projectContext?.currentProject])
  const noteDraft =
    noteEditor.variantId === selectedVariant?.variantId
      ? noteEditor.text
      : (selectedVariant?.reviewNotes ?? '')

  if (
    runMatchesWorkspace &&
    (runState.status === 'queued' ||
      runState.status === 'uploading' ||
      runState.status === 'submitting') &&
    totalVariants === 0
  ) {
    return (
      <PreviewStateCallout
        body={getRunBodyCopy(runState)}
        icon={
          <LoaderCircle
            suppressHydrationWarning
            className="size-8 animate-spin"
          />
        }
        title={getRunHeadline(runState)}
      />
    )
  }

  if (runMatchesWorkspace && totalVariants > 0) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">
                {getRunHeadline(runState)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {runSummaryItems.join(' · ')}
              </p>
            </div>

            <div>
              <ToggleGroup
                aria-label="Review Filter"
                type="single"
                value={reviewFilter}
                onValueChange={(value) => {
                  if (
                    value === 'all' ||
                    value === 'pending' ||
                    value === 'approved' ||
                    value === 'rejected'
                  ) {
                    setReviewFilter(value)
                  }
                }}
              >
                {(['all', 'pending', 'approved', 'rejected'] as const).map(
                  (value) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      className="min-h-9 px-3"
                    >
                      {value === 'all' ? 'All' : getRunStatusLabel(value)}
                    </ToggleGroupItem>
                  ),
                )}
              </ToggleGroup>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {selectedVariant?.result ? (
            <div className="flex flex-col">
              <div className="relative aspect-[4/5] min-h-[280px] bg-black/20 sm:aspect-video">
                {selectedVariant.result.type === 'video' ? (
                  <video
                    autoPlay
                    className="h-full w-full object-cover"
                    controls
                    loop
                    playsInline
                    poster={selectedVariant.result.thumbnailUrl}
                    src={selectedVariant.result.url}
                  />
                ) : (
                  <ImagePreviewTrigger
                    alt={`Generated result for variation ${selectedVariant.index}`}
                    className="h-full w-full overflow-hidden"
                    label={`Variation ${selectedVariant.index}`}
                    src={selectedVariant.result.url}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`Generated result for variation ${selectedVariant.index}`}
                      className="h-full w-full object-cover"
                      src={selectedVariant.result.url}
                    />
                  </ImagePreviewTrigger>
                )}
              </div>

              <div className="border-t border-border bg-background/95 px-4 py-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Selected output
                      </p>
                      <p className="mt-1 text-base font-semibold">
                        Variation {selectedVariant.index}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedVariant.profile}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {getRunStatusLabel(selectedVariant.reviewStatus)}
                      </Badge>
                      <Badge variant="outline">
                        {selectedVariant.result.model}
                      </Badge>
                      <Badge variant="outline">
                        Task {selectedVariant.result.taskId.slice(0, 18)}
                      </Badge>
                      {selectedVariant.isHero ? (
                        <Badge variant="secondary">Hero</Badge>
                      ) : null}
                      {selectedVariant.selectedForDelivery ? (
                        <Badge variant="secondary">Deliverable</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        void onReviewUpdate({
                          reviewStatus: 'approved',
                          variantId: selectedVariant.variantId,
                        })
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      <Check suppressHydrationWarning data-icon="inline-start" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        void onReviewUpdate({
                          reviewStatus: 'rejected',
                          variantId: selectedVariant.variantId,
                        })
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <X suppressHydrationWarning data-icon="inline-start" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        void onReviewUpdate({
                          setHero: !selectedVariant.isHero,
                          variantId: selectedVariant.variantId,
                        })
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Star suppressHydrationWarning data-icon="inline-start" />
                      {selectedVariant.isHero ? 'Hero Pick' : 'Mark Hero'}
                    </Button>
                    <Button
                      onClick={() => {
                        void onReviewUpdate({
                          selectedForDelivery: !selectedVariant.selectedForDelivery,
                          variantId: selectedVariant.variantId,
                        })
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Truck suppressHydrationWarning data-icon="inline-start" />
                      {selectedVariant.selectedForDelivery
                        ? 'In Deliverables'
                        : 'Add Deliverable'}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/50 p-3">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Variation details
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Keep the prompt and review notes attached to the selected
                          output.
                        </p>
                      </div>

                      <ToggleGroup
                        aria-label="Detail View"
                        type="single"
                        value={detailPanel}
                        onValueChange={(value) => {
                          if (value === 'prompt' || value === 'notes') {
                            setDetailPanel(value)
                          }
                        }}
                      >
                        <ToggleGroupItem value="prompt" className="min-h-9 px-3">
                          Prompt
                        </ToggleGroupItem>
                        <ToggleGroupItem value="notes" className="min-h-9 px-3">
                          Notes
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {detailPanel === 'prompt' ? (
                      <p className="mt-3 max-h-28 overflow-auto pr-1 text-sm leading-6 text-foreground/88">
                        {selectedVariant.prompt}
                      </p>
                    ) : (
                      <div className="mt-3">
                        <Textarea
                          className="min-h-24"
                          value={noteDraft}
                          onChange={(event) =>
                            setNoteEditor({
                              text: event.target.value,
                              variantId: selectedVariant.variantId,
                            })
                          }
                        />
                        <div className="mt-3 flex justify-end">
                          <Button
                            onClick={() => {
                              void onReviewUpdate({
                                reviewNotes: noteDraft,
                                variantId: selectedVariant.variantId,
                              })
                              setNoteEditor({
                                text: noteDraft,
                                variantId: selectedVariant.variantId,
                              })
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <PreviewStateCallout
              body={getRunBodyCopy(runState)}
              icon={
                runState.status === 'error' ? (
                  <AlertTriangle
                    suppressHydrationWarning
                    className="size-8"
                  />
                ) : runState.status === 'cancelled' ? (
                  <CircleSlash
                    suppressHydrationWarning
                    className="size-8"
                  />
                ) : (
                  <LoaderCircle
                    suppressHydrationWarning
                    className="size-8 animate-spin"
                  />
                )
              }
              tone={
                runState.status === 'error' || runState.status === 'cancelled'
                  ? 'destructive'
                  : 'default'
              }
              title={getRunHeadline(runState)}
            />
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {filteredVariants.map((variant) => {
            const isSelected = selectedVariant?.variantId === variant.variantId
            const isInteractive =
              variant.status === 'success' && Boolean(variant.result)

            return (
              <button
                key={variant.variantId}
                className={cn(
                  'flex min-h-28 w-full flex-col items-start rounded-lg border bg-background p-3 text-left transition-colors',
                  isSelected
                    ? 'border-foreground/45 bg-secondary'
                    : 'border-border hover:border-foreground/25',
                  !isInteractive ? 'cursor-default' : 'cursor-pointer',
                )}
                disabled={!isInteractive}
                onClick={() => {
                  selectGenerationVariant(variant.variantId)
                }}
                type="button"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Variation {variant.index}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {variant.profile}
                    </p>
                  </div>
                  <Badge variant={getVariantBadgeVariant(variant.status)}>
                    {getRunStatusLabel(variant.status)}
                  </Badge>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {variant.taskId
                    ? `Task ${variant.taskId.slice(0, 18)}`
                    : variant.error ?? 'Task creation did not complete.'}
                </p>

                <p className="mt-2 text-sm leading-6 text-foreground/86">
                  {variant.status === 'success' && variant.result
                    ? 'Ready to review in the spotlight.'
                    : variant.status === 'queued'
                      ? 'Queued for the background worker to claim.'
                    : variant.status === 'error'
                      ? variant.error ?? 'This variation failed upstream.'
                      : variant.status === 'cancelled'
                        ? 'This variation was cancelled before completion.'
                        : 'Provider task is still rendering.'}
                </p>
                {variant.status === 'success' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {getRunStatusLabel(variant.reviewStatus)}
                    </Badge>
                    {variant.isHero ? <Badge variant="secondary">Hero</Badge> : null}
                    {variant.selectedForDelivery ? (
                      <Badge variant="secondary">Deliverable</Badge>
                    ) : null}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>

        {deliverables.length > 0 ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Deliverables
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Approved outputs promoted from this project’s persisted run history.
                </p>
              </div>
              <Badge variant="outline">{deliverables.length} selected</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {deliverables.map((deliverable) => (
                <article
                  key={deliverable.assetId}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <StudioDeliverableMedia
                    alt={deliverable.label}
                    label={deliverable.label}
                    mimeType={deliverable.mimeType}
                    src={getMediaAssetUrl(deliverable.assetId)}
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3 p-3">
                    <div>
                      <p className="font-medium text-foreground">{deliverable.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Variation {deliverable.variantIndex} · {getRunStatusLabel(deliverable.reviewStatus)}
                      </p>
                    </div>
                    {deliverable.isHero ? <Badge variant="secondary">Hero</Badge> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  if (runMatchesWorkspace && runState.status === 'error') {
    return (
      <PreviewStateCallout
        body={runState.error ?? 'The provider rejected this request.'}
        icon={<AlertTriangle suppressHydrationWarning className="size-8" />}
        tone="destructive"
        title="Generation stopped before completion"
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
        {activeTab === 'video' ? (
          <Film suppressHydrationWarning className="size-8" />
        ) : (
          <ImageIcon suppressHydrationWarning className="size-8" />
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
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {body}
        </p>
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
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
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

function useGenerationController() {
  const projectContext = useOptionalStudioProjectContext()
  const activeTab = useGenerationStore((state) => state.activeTab)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const characterGender = useGenerationStore((state) => state.characterGender)
  const characterAgeGroup = useGenerationStore(
    (state) => state.characterAgeGroup,
  )
  const characterEthnicity = useGenerationStore(
    (state) => state.characterEthnicity,
  )
  const figureArtDirection = useGenerationStore(
    (state) => state.figureArtDirection,
  )
  const batchSize = useGenerationStore((state) => state.batchSize)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const hydrateGenerationRun = useGenerationStore(
    (state) => state.hydrateGenerationRun,
  )
  const lastTerminalRefreshRef = useRef<string | null>(null)

  const validation = useMemo(
    () =>
      getGenerationValidation({
        activeTab,
        assets,
        batchSize,
        cameraMovement,
        characterAgeGroup,
        characterEthnicity,
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
      characterEthnicity,
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

  const isBusy = hasActiveGeneration(generationRun)
  const disabledReason = isBusy
    ? 'A batched render is already in progress. Wait for the current run to finish before starting another batch.'
    : validation.reason

  useEffect(() => {
    if (
      !generationRun.projectId ||
      !generationRun.runId ||
      !hasPollingRunStatus(generationRun.status)
    ) {
      return
    }

    let isCancelled = false
    const projectId = generationRun.projectId
    const runId = generationRun.runId

    const pollRunState = async () => {
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}`,
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

        if (!response.ok || !payload?.run) {
          throw new Error(payload?.error ?? 'Unable to refresh run status.')
        }

        if (isCancelled) {
          return
        }

        if (payload.run.uploadedAssets.length > 0) {
          applyUploadedAssetState(payload.run.uploadedAssets)
        }

        hydrateGenerationRun(payload.run)

        if (
          projectContext &&
          payload.run.projectId &&
          isTerminalGenerationStatus(payload.run.status)
        ) {
          const terminalKey = `${payload.run.runId}:${payload.run.status}:${payload.run.completedAt ?? ''}`

          if (lastTerminalRefreshRef.current !== terminalKey) {
            lastTerminalRefreshRef.current = terminalKey
            await projectContext.refreshProject(payload.run.projectId).catch(
              () => undefined,
            )
          }
        }
      } catch (error) {
        useGenerationStore.getState().setGenerationError(
          error instanceof Error
            ? error.message
            : 'Unable to refresh run status.',
        )
      }
    }

    void pollRunState()

    const interval = window.setInterval(() => {
      void pollRunState()
    }, projectRunPollIntervalMs)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [
    generationRun.projectId,
    generationRun.runId,
    generationRun.status,
    hydrateGenerationRun,
    projectContext,
  ])

  const handleGenerate = async () => {
    const state = useGenerationStore.getState()
    const currentValidation = getGenerationValidation(state)

    if (!currentValidation.canGenerate) {
      state.setGenerationError(
        currentValidation.reason ?? 'Generation is blocked.',
      )
      return
    }

    const { assetManifest, formData } = buildGenerationFormData(state)
    let projectId: string | null = null

    if (projectContext) {
      try {
        projectId = await projectContext.ensureProjectId()
      } catch (error) {
        state.setGenerationError(
          error instanceof Error
            ? error.message
            : 'Unable to create or load the active project.',
        )
        return
      }

      if (!projectId) {
        state.setGenerationError('Unable to create or load the active project.')
        return
      }
    }

    if (projectId) {
      formData.append('projectId', projectId)
    }

    state.clearUploadMetadata()
    markManifestState(assetManifest, 'uploading', null)

    try {
      const response = await fetch('/api/generation/run', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as GenerationRun & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to start generation.')
      }

      hydrateGenerationRun(payload)
      if (projectContext && projectId) {
        await projectContext.refreshProject(projectId).catch(() => undefined)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start generation.'

      markManifestState(assetManifest, 'error', message)
      state.setGenerationError(message)
    }
  }

  const handleCancel = async () => {
    if (!generationRun.projectId || !generationRun.runId) {
      return
    }
    const projectId = generationRun.projectId
    const runId = generationRun.runId

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/cancel`,
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
      await projectContext?.refreshProject(projectId).catch(() => undefined)
    } catch (error) {
      useGenerationStore.getState().setGenerationError(
        error instanceof Error ? error.message : 'Unable to cancel the active run.',
      )
    }
  }

  const handleReviewUpdate = async (input: {
    reviewNotes?: string | null
    reviewStatus?: GenerationReviewStatus
    selectedForDelivery?: boolean
    setHero?: boolean
    variantId: string
  }) => {
    if (!generationRun.projectId || !generationRun.runId) {
      return
    }
    const projectId = generationRun.projectId
    const runId = generationRun.runId

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/variants/${encodeURIComponent(input.variantId)}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      )
      const payload = (await response.json()) as
        | {
            error?: string
            run?: GenerationRun
          }
        | null

      if (!response.ok || !payload?.run) {
        throw new Error(payload?.error ?? 'Unable to update review state.')
      }

      hydrateGenerationRun(payload.run)
      await projectContext?.refreshProject(projectId).catch(() => undefined)
    } catch (error) {
      useGenerationStore.getState().setGenerationError(
        error instanceof Error ? error.message : 'Unable to update review state.',
      )
    }
  }

  return {
    canGenerate: validation.canGenerate,
    disabledReason,
    handleCancel,
    handleGenerate,
    handleReviewUpdate,
    isBusy,
  }
}

function markManifestState(
  assetManifest: Array<{
    kind: 'named' | 'product'
    key?: NamedAssetKey
    productId?: string
  }>,
  uploadStatus: AssetSlot['uploadStatus'],
  error: string | null,
) {
  const state = useGenerationStore.getState()

  for (const asset of assetManifest) {
    if (asset.kind === 'named' && asset.key) {
      state.setNamedAssetRemoteState(asset.key, {
        error,
        remoteUrl: null,
        uploadStatus,
      })
    }

    if (asset.kind === 'product' && asset.productId) {
      state.setProductSlotRemoteState(asset.productId, {
        error,
        remoteUrl: null,
        uploadStatus,
      })
    }
  }
}

function applyUploadedAssetState(
  uploadedAssets: GenerationRun['uploadedAssets'],
) {
  const state = useGenerationStore.getState()

  for (const asset of uploadedAssets) {
    if (asset.kind === 'named' && asset.key) {
      state.setNamedAssetRemoteState(asset.key, {
        error: null,
        remoteUrl: asset.remoteUrl,
        uploadStatus: 'uploaded',
      })
    }

    if (asset.kind === 'product' && asset.productId) {
      state.setProductSlotRemoteState(asset.productId, {
        error: null,
        remoteUrl: asset.remoteUrl,
        uploadStatus: 'uploaded',
      })
    }
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

  return slot.uploadStatus === 'error' ? 'Upload Failed' : 'Error'
}

function isSlotLoaded(slot: AssetSlot) {
  return Boolean(slot.file || slot.previewUrl || slot.remoteUrl)
}

function getPrimaryInputSummary({
  subjectMode,
  assets,
  products,
  textPrompt,
}: {
  subjectMode: SubjectMode
  assets: NamedAssetSlots
  products: AssetSlot[]
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

function getKieCreditsValue(
  kieStatus: KieStatusResponse,
  isLoading: boolean,
) {
  if (isLoading && kieStatus.fetchedAt === null) {
    return 'Loading'
  }

  if (kieStatus.connected && kieStatus.credits !== null) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(kieStatus.credits)
  }

  return 'Unavailable'
}

function getKieCreditsHelper(
  kieStatus: KieStatusResponse,
  isLoading: boolean,
) {
  if (isLoading && kieStatus.fetchedAt === null) {
    return 'Checking KIE account'
  }

  if (kieStatus.connected) {
    return 'Live from KIE'
  }

  return kieStatus.error ?? 'KIE account unavailable'
}

function hasActiveGeneration(run: GenerationRun) {
  return (
    run.status === 'queued' ||
    run.status === 'uploading' ||
    run.status === 'submitting' ||
    run.status === 'rendering'
  )
}

function hasPollingRunStatus(status: GenerationRun['status']) {
  return (
    status === 'queued' ||
    status === 'uploading' ||
    status === 'submitting' ||
    status === 'rendering'
  )
}

function isTerminalGenerationStatus(status: GenerationRun['status']) {
  return (
    status === 'success' ||
    status === 'partial-success' ||
    status === 'error' ||
    status === 'cancelled'
  )
}

function getSelectedRunVariant(run: GenerationRun) {
  const selectedVariant = run.variants.find(
    (variant) => variant.variantId === run.selectedVariantId,
  )

  if (selectedVariant?.status === 'success' && selectedVariant.result) {
    return selectedVariant
  }

  return (
    run.variants.find(
      (variant) => variant.status === 'success' && Boolean(variant.result),
    ) ?? null
  )
}

function getVariantBadgeVariant(status: GenerationVariant['status']) {
  switch (status) {
    case 'success':
      return 'default' as const
    case 'queued':
    case 'rendering':
    case 'submitting':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
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
  return (
    creativeStyles.find((option) => option.value === style)?.label ??
    humanize(style)
  )
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
  characterEthnicity: CharacterEthnicity
  characterGender: CharacterGender
  figureArtDirection: FigureArtDirection
  subjectMode: SubjectMode
}) {
  if (input.subjectMode !== 'lifestyle') {
    return null
  }

  const selections = [
    input.characterGender,
    input.characterAgeGroup,
    input.characterEthnicity,
  ]
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

function getRunStatusLabel(
  status:
    | GenerationRunStatus
    | GenerationVariant['status']
    | GenerationReviewStatus,
) {
  return humanize(status)
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
