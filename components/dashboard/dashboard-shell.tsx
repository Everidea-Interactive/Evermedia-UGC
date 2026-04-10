'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
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
  Upload,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'

import { GuidedWorkspace } from '@/components/dashboard/guided-workspace'
import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  getGenerateButtonLabel,
  getGenerationHelperMessage,
  getRunHeadline,
} from '@/lib/generation/run-copy'
import { useKiePricing } from '@/lib/generation/use-kie-pricing'
import { useKieStatus } from '@/lib/generation/use-kie-status'
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
  GenerationVariant,
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
    helper: 'Google image generation with direct reference input',
    label: 'Nano Banana 2',
    value: 'nano-banana',
  },
  {
    helper: 'Text and image-led still renders',
    label: 'Grok Imagine',
    value: 'grok-imagine',
  },
]

const videoModels: Array<{
  helper: string
  label: string
  value: VideoModelOption
}> = [
  {
    helper: 'Reference and end-frame video renders',
    label: 'Veo 3.1',
    value: 'veo-3.1',
  },
  {
    helper: 'Market-model text or image video',
    label: 'Kling',
    value: 'kling',
  },
  {
    helper: 'Prompt-led short motion clips',
    label: 'Grok Imagine',
    value: 'grok-imagine',
  },
]

const qualities: OutputQuality[] = ['720p', '1080p', '4k']
const durations: VideoDuration[] = ['base', 'extended']

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
  const kiePricingState = useKiePricing()
  const kieStatusState = useKieStatus(generationRun)
  const controller = useGenerationController({
    enabled: experience === 'manual',
    kiePricing: kiePricingState.pricing,
    kieStatus: kieStatusState.status,
    pricingError: kiePricingState.error,
  })
  const [previewVariantId, setPreviewVariantId] = useState<string | null>(null)
  const resolvedPreviewVariantId = generationRun.variants.some(
    (variant) => variant.variantId === previewVariantId,
  )
    ? previewVariantId
    : null

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
        className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6"
        id="dashboard-main"
      >
        <TopBar
          isKieStatusLoading={kieStatusState.isLoading}
          kieStatus={kieStatusState.status}
        />

        <section className={cn(panelClassName, 'p-3 sm:p-4')}>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Studio experience
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose between the existing manual studio and the new analyze-first guided planner.
              </p>
            </div>

            <Tabs
              onValueChange={(value) => setExperience(value as GenerationExperience)}
              value={experience}
            >
              <TabsList aria-label="Studio Experience" className="w-full grid-cols-2">
                {experienceTabs.map((tab) => (
                  <TabsTrigger
                    className="min-h-[5rem] px-5 py-4 sm:min-h-[5.5rem]"
                    key={tab.value}
                    value={tab.value}
                  >
                    <span className="mx-auto flex w-full max-w-[14rem] flex-col text-left">
                      <span className="text-base font-semibold">{tab.label}</span>
                      <span className="mt-1 text-xs font-normal text-current/72">
                        {tab.helper}
                      </span>
                    </span>
                  </TabsTrigger>
                ))}
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
          <Tabs
            className="flex flex-1 flex-col gap-4"
            onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
            value={activeTab}
          >
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
                        className="min-h-[5rem] px-5 py-4 sm:min-h-[5.5rem]"
                        key={tab.value}
                        value={tab.value}
                      >
                        <span className="mx-auto flex w-full max-w-[12rem] items-center justify-center gap-3 text-left">
                          <Icon className="size-5 shrink-0" suppressHydrationWarning />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-base font-semibold">{tab.label}</span>
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
                className="xl:col-start-2 xl:row-start-1 xl:row-span-4 xl:sticky xl:top-6 xl:self-start"
                disabledReason={controller.disabledReason}
                generationCostEstimate={controller.generationCostEstimate}
                generationCostReason={controller.generationCostReason}
                isBusy={controller.isBusy}
                isPricingLoading={kiePricingState.isLoading}
                onCancelRun={controller.handleCancel}
                onGenerate={async () => {
                  setPreviewVariantId(null)
                  await controller.handleGenerate()
                }}
                previewVariantId={resolvedPreviewVariantId}
                setPreviewVariantId={setPreviewVariantId}
              />
              <RefineRenderSection className="xl:col-start-1 xl:row-start-2" />
              {activeTab === 'video' ? (
                <MotionControlsSection className="xl:col-start-1 xl:row-start-3" />
              ) : null}
            </div>
          </Tabs>
        )}
      </main>
    </div>
  )
}

function TopBar({
  isKieStatusLoading,
  kieStatus,
}: {
  isKieStatusLoading: boolean
  kieStatus: KieStatusResponse
}) {
  return (
    <header className={cn(panelClassName, 'px-4 py-4 sm:px-5')}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
            <Clapperboard className="size-5" suppressHydrationWarning />
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
      <p className="mt-1 truncate text-xs text-muted-foreground" title={helper}>
        {helper}
      </p>
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
            description="Maps into the selected provider&apos;s supported duration range."
            title="Clip length"
          >
            <ToggleGroup
              aria-label="Video Duration"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              onValueChange={(value) => {
                if (value) {
                  setVideoDuration(value as VideoDuration)
                }
              }}
              type="single"
              value={videoDuration}
            >
              {durations.map((duration) => (
                <ToggleGroupItem
                  className={tileClassName}
                  key={duration}
                  value={duration}
                >
                  {duration === 'base' ? 'Base (~5-8s)' : 'Extended (+7s)'}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            description="Resolution preferences are passed through when the model supports them directly."
            title="Output resolution"
          >
            <ToggleGroup
              aria-label="Output Quality"
              className="grid grid-cols-3 gap-2"
              onValueChange={(value) => {
                if (value) {
                  setOutputQuality(value as OutputQuality)
                }
              }}
              type="single"
              value={outputQuality}
            >
              {qualities.map((quality) => (
                <ToggleGroupItem
                  className={tileClassName}
                  key={quality}
                  value={quality}
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
            description="Only Veo uses end-frame guidance in Phase 2. Other models ignore this slot."
            title="End frame reference"
          >
            <ReferenceCard
              className="w-full self-start sm:max-w-[15rem]"
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

function PreviewCanvas({
  canGenerate,
  className,
  disabledReason,
  generationCostEstimate,
  generationCostReason,
  isBusy,
  isPricingLoading,
  onCancelRun,
  onGenerate,
  previewVariantId,
  setPreviewVariantId,
}: {
  canGenerate: boolean
  className?: string
  disabledReason: string | null
  generationCostEstimate: GenerationCostEstimate
  generationCostReason: string
  isBusy: boolean
  isPricingLoading: boolean
  onCancelRun: () => Promise<void>
  onGenerate: () => Promise<void>
  previewVariantId: string | null
  setPreviewVariantId: (variantId: string | null) => void
}) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const batchSize = useGenerationStore((state) => state.batchSize)
  const setBatchSize = useGenerationStore((state) => state.setBatchSize)
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
  const runMatchesWorkspace = generationRun.workspace === activeTab
  const activeRunInWorkspace = runMatchesWorkspace && hasActiveGeneration(generationRun)
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
                previewVariantId={previewVariantId}
                runMatchesWorkspace={runMatchesWorkspace}
                runState={generationRun}
                setPreviewVariantId={setPreviewVariantId}
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

                <div
                  className={cn(generationFooterMessage ? 'mt-4' : 'mt-2', 'grid gap-2.5')}
                >
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
                      onChange={(event) =>
                        setImageModel(event.target.value as ImageModelOption)
                      }
                      value={imageModel}
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
                  )}

                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'image'
                      ? selectedImageModel?.helper
                      : selectedVideoModel?.helper}
                  </p>
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
      </div>
    </section>
  )
}

function PreviewStage({
  activeTab,
  loadedAssets,
  previewVariantId,
  runMatchesWorkspace,
  runState,
  setPreviewVariantId,
}: {
  activeTab: WorkspaceTab
  loadedAssets: number
  previewVariantId: string | null
  runMatchesWorkspace: boolean
  runState: ReturnType<typeof useGenerationStore.getState>['generationRun']
  setPreviewVariantId: (variantId: string | null) => void
}) {
  const selectGenerationVariant = useGenerationStore(
    (state) => state.selectGenerationVariant,
  )
  const selectedVariant = runMatchesWorkspace
    ? getSelectedRunVariant(runState, previewVariantId)
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

  if (runMatchesWorkspace && totalVariants > 0) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">
                {getRunHeadline(runState)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {runSummaryItems.join(' · ')}
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/library">Open Library</Link>
            </Button>
          </div>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(240px,0.82fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            {selectedVariant?.result ? (
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {selectedVariant.result.type === 'image' ? (
                  <ImagePreviewTrigger
                    alt={`Generated result for variation ${selectedVariant.index}`}
                    className="block w-full"
                    label={`Variation ${selectedVariant.index}`}
                    src={selectedVariant.result.url}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`Generated result for variation ${selectedVariant.index}`}
                      className="aspect-[4/3] w-full object-cover"
                      src={selectedVariant.result.url}
                    />
                  </ImagePreviewTrigger>
                ) : (
                  <video
                    className="aspect-[4/3] w-full bg-black object-cover"
                    controls
                    playsInline
                    preload="metadata"
                    src={selectedVariant.result.url}
                  />
                )}
              </div>
            ) : selectedVariant ? (
              <PreviewStateCallout
                body={
                  selectedVariant.error ??
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
                title={`Variation ${selectedVariant.index}`}
                tone={runState.status === 'error' ? 'destructive' : 'default'}
              />
            ) : null}

            {selectedVariant ? (
              <div className={cn(insetPanelClassName, 'p-3.5')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      Variation {selectedVariant.index}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedVariant.result?.taskId ??
                        selectedVariant.taskId ??
                        'Awaiting provider task'}
                    </p>
                  </div>
                  <Badge variant={getVariantBadgeVariant(selectedVariant.status)}>
                    {humanize(selectedVariant.status)}
                  </Badge>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {selectedVariant.profile}
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <StatusPill
                    label="Model"
                    value={
                      selectedVariant.result?.model ??
                      runState.model ??
                      (activeTab === 'image' ? 'Image run' : 'Video run')
                    }
                  />
                  <StatusPill
                    label="Status"
                    value={humanize(selectedVariant.status)}
                  />
                </div>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {selectedVariant.prompt}
                </p>

                {selectedVariant.error ? (
                  <p className="mt-3 text-sm text-destructive">
                    {selectedVariant.error}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            {runState.variants.map((variant) => (
              <button
                className={cn(
                  rowClassName,
                  'p-3 text-left transition-colors',
                  selectedVariant?.variantId === variant.variantId
                    ? 'border-foreground/30 bg-secondary'
                    : 'hover:border-foreground/20',
                )}
                key={variant.variantId}
                onClick={() => {
                  setPreviewVariantId(variant.variantId)
                  selectGenerationVariant(variant.variantId)
                }}
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    Variation {variant.index}
                  </span>
                  <Badge variant={getVariantBadgeVariant(variant.status)}>
                    {humanize(variant.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {variant.profile}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {variant.result?.taskId ??
                    variant.taskId ??
                    variant.error ??
                    'Awaiting provider task'}
                </p>
              </button>
            ))}
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
  const primaryText = estimate.available
    ? `Estimated: ${formatEstimatedCreditsValue(estimate)} credits`
    : isLoading
      ? 'Checking estimate'
      : 'Estimate unavailable'
  const secondaryText = estimate.available
    ? `≈ $${formatEstimatedUsdValue(estimate)} USD`
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
  const setGenerationError = useGenerationStore(
    (state) => state.setGenerationError,
  )
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const videoModel = useGenerationStore((state) => state.videoModel)

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

  const isBusy = hasActiveGeneration(generationRun)
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
      enabled ? validation.canGenerate && creditValidation.canGenerate : false,
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

function getKieCreditsValue(kieStatus: KieStatusResponse, isLoading: boolean) {
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

function getKieCreditsHelper(kieStatus: KieStatusResponse, isLoading: boolean) {
  if (isLoading && kieStatus.fetchedAt === null) {
    return 'Checking KIE account'
  }

  if (kieStatus.connected) {
    return 'Live from KIE'
  }

  return kieStatus.error ?? 'KIE account unavailable'
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

function formatEstimatedUsdValue(estimate: GenerationCostEstimate) {
  if (estimate.usd === null) {
    return '0.00'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
    minimumFractionDigits: estimate.usd < 1 ? 2 : 2,
  }).format(estimate.usd)
}

function hasActiveGeneration(run: GenerationRun) {
  return run.status === 'rendering'
}

function getSelectedRunVariant(
  run: GenerationRun,
  previewVariantId: string | null,
) {
  return (
    run.variants.find((variant) => variant.variantId === previewVariantId) ??
    run.variants.find((variant) => variant.variantId === run.selectedVariantId) ??
    run.variants.find((variant) => variant.status === 'success' && Boolean(variant.result)) ??
    run.variants[0] ??
    null
  )
}

function getVariantBadgeVariant(status: GenerationVariant['status']) {
  switch (status) {
    case 'success':
      return 'default' as const
    case 'rendering':
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
