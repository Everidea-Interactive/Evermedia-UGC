'use client'

import {
  useEffect,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Brush,
  Clapperboard,
  CupSoda,
  Film,
  Gem,
  ImageIcon,
  Laptop,
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
import { useKieStatus } from '@/lib/generation/use-kie-status'
import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CreativeStyle,
  GenerationRun,
  GenerationRunStatus,
  KieStatusResponse,
  GenerationVariant,
  ImageModelOption,
  NamedAssetKey,
  NamedAssetSlots,
  OutputQuality,
  ProductCategory,
  RunSubmissionResponse,
  SubjectMode,
  TaskPollResponse,
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
  { value: 'cosmetics', label: 'Cosmetics', icon: Sparkles },
  { value: 'electronics', label: 'Electronics', icon: Laptop },
  { value: 'clothing', label: 'Clothing', icon: Shirt },
]

const creativeStyles: Array<{
  value: CreativeStyle
  label: string
}> = [
  { value: 'ugc-lifestyle', label: 'UGC / Lifestyle' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'tv-commercial', label: 'TV Commercial' },
]

const subjectModes: Array<{
  value: SubjectMode
  label: string
}> = [
  { value: 'product-only', label: 'Product Only' },
  { value: 'lifestyle', label: 'Lifestyle' },
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
    label: 'Nano Banana',
    helper: 'Google image generation / edit',
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
const imageAccept = 'image/png,image/jpeg,image/webp,image/jpg'
const taskPollIntervalMs = 3_000
const taskPollTimeoutMs = 10 * 60 * 1_000

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
          <TopBar disabledReason={controller.disabledReason} />

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
                        <Icon className="size-5 shrink-0" />
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
            <PromptSection className="xl:col-start-1 xl:row-start-2" />
            <PreviewCanvas
              canGenerate={controller.canGenerate}
              disabledReason={controller.disabledReason}
              isBusy={controller.isBusy}
              onGenerate={controller.handleGenerate}
              className="xl:col-start-2 xl:row-start-1 xl:row-span-4 xl:sticky xl:top-6 xl:self-start"
            />
            <RefineRenderSection className="xl:col-start-1 xl:row-start-3" />
            {activeTab === 'video' ? (
              <MotionControlsSection className="xl:col-start-1 xl:row-start-4" />
            ) : null}
          </div>
        </Tabs>
      </main>
    </div>
  )
}

function TopBar({ disabledReason }: { disabledReason: string | null }) {
  const generationRun = useGenerationStore((state) => state.generationRun)
  const sessionStats = useGenerationStore((state) => state.sessionStats)
  const { isLoading: isKieStatusLoading, status: kieStatus } =
    useKieStatus(generationRun)
  const activeTaskCount = getActiveTaskCount(generationRun)
  const headerMetrics = [
    {
      helper: getKieCreditsHelper(kieStatus, isKieStatusLoading),
      label: 'KIE Credits',
      value: getKieCreditsValue(kieStatus, isKieStatusLoading),
    },
    {
      helper:
        activeTaskCount > 0 ? 'Rendering now' : 'No active tasks in queue',
      label: 'Active Tasks',
      value: String(activeTaskCount),
    },
    {
      helper: 'Completed this session',
      label: 'Completed',
      value: String(sessionStats.completedVariants),
    },
    {
      helper: 'Failed this session',
      label: 'Failed',
      value: String(sessionStats.failedVariants),
    },
  ]

  return (
    <header className={cn(panelClassName, 'px-4 py-4 sm:px-5')}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(16rem,0.75fr)] xl:items-start">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
            <Clapperboard className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">Evermedia UGC</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build the reference board first, then run generation from the
              output panel.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {headerMetrics.map((metric) => (
            <HeaderMetricCard
              key={metric.label}
              helper={metric.helper}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>

        <div className={cn(insetPanelClassName, 'px-4 py-3 md:min-w-[16rem]')}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Current run
          </p>
          <p className="mt-2 text-sm font-medium">
            {getRunStatusLabel(generationRun.status)}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {getRunHelperText(generationRun)}
          </p>
          {activeTaskCount > 0 ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {activeTaskCount} provider task{activeTaskCount > 1 ? 's' : ''} active
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-border/80 pt-3">
        <p className="text-sm text-muted-foreground">
          {getGenerationHelperMessage(disabledReason, generationRun)}
        </p>
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
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const setSubjectMode = useGenerationStore((state) => state.setSubjectMode)
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
  const productSlots = products.slice(0, 2)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            eyebrow="Reference board"
            title="Build the input set"
            description="Stage every visual input here first. The board stays fixed so the user can scan people, styling, and products without hunting for slots."
          />
          <Button onClick={resetGenerationState} size="sm" variant="ghost">
            Reset
          </Button>
        </div>

        <ControlGroup
          title="Reference priority"
          description="Choose whether the workspace should lead with a face-driven scene or a product-driven scene."
        >
          <ToggleGroup
            aria-label="Subject Mode"
            type="single"
            value={subjectMode}
            className="grid grid-cols-2 gap-2"
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
                className="w-full justify-center"
              >
                {mode.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ControlGroup>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-x-6">
          <div className="grid gap-5">
            <ReferenceCardGroup title="People">
              {peopleReferenceCards.map((asset) => (
                <ReferenceCard
                  key={asset.key}
                  icon={asset.icon}
                  inputId={`asset-${asset.key}`}
                  slot={assets[asset.key]}
                  onClear={() => clearNamedAsset(asset.key)}
                  onSelect={(file) => setNamedAssetFile(asset.key, file)}
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
                  onClear={() => clearNamedAsset(asset.key)}
                  onSelect={(file) => setNamedAssetFile(asset.key, file)}
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
                onClear={() => clearProductSlot(product.id)}
                onSelect={(file) => setProductSlotFile(product.id, file)}
              />
            ))}
          </ReferenceCardGroup>
        </div>
      </div>
    </section>
  )
}

function PromptSection({ className }: { className?: string }) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const setTextPrompt = useGenerationStore((state) => state.setTextPrompt)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-4">
        <SectionHeader
          eyebrow="Brief"
          title={activeTab === 'image' ? 'Add written direction' : 'Add motion direction'}
          description={
            activeTab === 'image'
              ? 'Use the prompt after the reference board when the render needs extra art direction or when you want a prompt-only run.'
              : 'Use the prompt after the reference board to describe motion intent, even if no start-frame reference is ready.'
          }
        />
        <Textarea
          aria-label={
            activeTab === 'image'
              ? 'Image generation prompt'
              : 'Video generation prompt'
          }
          autoComplete="off"
          placeholder={
            activeTab === 'image'
              ? 'Example: Beauty creator holding the serum in soft window light with premium skincare styling.'
              : 'Example: Hero product glides through morning window light while the actor reaches in from frame left.'
          }
          value={textPrompt}
          onChange={(event) => setTextPrompt(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {activeTab === 'image'
            ? 'A prompt alone can unlock generation when no reference image is ready.'
            : 'Prompt-only runs are allowed when no start-frame reference is staged.'}
        </p>
      </div>
    </section>
  )
}

function RefineRenderSection({ className }: { className?: string }) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const setImageModel = useGenerationStore((state) => state.setImageModel)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const setVideoModel = useGenerationStore((state) => state.setVideoModel)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const setProductCategory = useGenerationStore(
    (state) => state.setProductCategory,
  )
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const setCreativeStyle = useGenerationStore((state) => state.setCreativeStyle)
  const selectedImageModel = imageModels.find((model) => model.value === imageModel)
  const selectedVideoModel = videoModels.find((model) => model.value === videoModel)

  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-5">
        <SectionHeader
          eyebrow="Refine render"
          title="Tune the output"
          description="Once the reference board is ready, adjust the model and campaign context for the next run."
        />

        <div className="grid gap-5">
          <ControlGroup
            title={activeTab === 'image' ? 'Image model' : 'Video model'}
            description="Curated provider options for the active workspace."
          >
            {activeTab === 'image' ? (
              <div className="grid gap-2">
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
                <p className="text-xs text-muted-foreground">
                  {selectedImageModel?.helper}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
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
                <p className="text-xs text-muted-foreground">
                  {selectedVideoModel?.helper}
                </p>
              </div>
            )}
          </ControlGroup>

          <ControlGroup
            title="Product vertical"
            description="Campaign context used to frame the output."
          >
            <ToggleGroup
              aria-label="Product Category"
              type="single"
              value={productCategory}
              className="grid grid-cols-2 gap-2"
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
                    className="w-full justify-start gap-2"
                  >
                    <Icon className="size-4" />
                    {category.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </ControlGroup>

          <ControlGroup
            title="Creative direction"
            description="High-level visual language for the render."
          >
            <ToggleGroup
              aria-label="Creative Style"
              type="single"
              value={creativeStyle}
              className="grid grid-cols-1 gap-2"
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
                  className="w-full justify-center"
                >
                  {style.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlGroup>
        </div>
      </div>
    </section>
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
              icon={ScanLine}
              inputId="asset-end-frame"
              slot={endFrame}
              onClear={() => clearNamedAsset('endFrame')}
              onSelect={(file) => setNamedAssetFile('endFrame', file)}
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
  icon: Icon,
  inputId,
  slot,
  onClear,
  onSelect,
}: {
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
      )}
    >
      <input
        id={inputId}
        type="file"
        accept={imageAccept}
        className="sr-only"
        onChange={(event) => handleFileInput(event, onSelect)}
      />

      <div className="absolute inset-0">
        {previewSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            alt={`${slot.label} reference preview`}
            className="h-full w-full object-contain p-2.5"
            loading="lazy"
            src={previewSrc}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/80 text-muted-foreground">
              <Icon className="size-4.5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/88">
              {slot.label}
            </p>
          </div>
        )}
      </div>

      {hasMedia ? (
        <div className="absolute inset-x-0 bottom-0 p-2.5">
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
          <X className="size-3.5" />
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
              <Upload data-icon="inline-start" />
              Upload
            </label>
          </Button>
        </div>
      )}

      {isUploading ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-background/78 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm">
            <LoaderCircle className="size-3.5 animate-spin" />
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
  onGenerate,
  className,
}: {
  canGenerate: boolean
  disabledReason: string | null
  isBusy: boolean
  onGenerate: () => Promise<void>
  className?: string
}) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
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
  const runMatchesWorkspace = generationRun.workspace === activeTab
  const linkedTaskCount = getLinkedTaskCount(generationRun)

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
          <Badge className="self-start" variant="outline">
            {activeTab === 'video' ? 'Video workspace' : 'Image workspace'}
          </Badge>
        </div>

        <div className={cn(insetPanelClassName, 'overflow-hidden')}>
          <div className="p-4 sm:p-6">
            <div className="flex min-h-[320px] flex-col sm:min-h-[420px]">
              <PreviewStage
                activeTab={activeTab}
                loadedAssets={loadedAssets.length}
                runMatchesWorkspace={runMatchesWorkspace}
                runState={generationRun}
              />
            </div>
          </div>

          <div className="border-t border-border px-4 py-4 sm:px-6">
            <div className="grid gap-2 sm:grid-cols-2">
              <PreviewSnapshotItem
                label="Primary input"
                value={primaryInputLabel}
              />
              <PreviewSnapshotItem
                label="Staged assets"
                value={getLoadedAssetLabel(loadedAssets.length)}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
              {activeTab === 'video' && cameraMovement ? (
                <StatusPill
                  label="Camera"
                  value={getCameraMovementLabel(cameraMovement)}
                />
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Variation
                </p>
                <div className="mt-2">
                  <ToggleGroup
                    aria-label="Batch Size"
                    type="single"
                    value={String(batchSize)}
                    className="grid grid-cols-4 gap-2"
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
                        className="min-h-15 w-full justify-center"
                      >
                        <span className="flex flex-col items-center gap-1">
                          <span>{size}x</span>
                          <span className="text-[10px] font-normal uppercase tracking-[0.12em] text-current/70">
                            {size === 1 ? 'Single' : `${size} Tasks`}
                          </span>
                        </span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Parallel variants reuse the same uploaded references and split
                  into separate KIE tasks.
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Run action
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {getGenerationHelperMessage(disabledReason, generationRun)}
                </p>
                {runMatchesWorkspace && linkedTaskCount > 0 ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {linkedTaskCount} linked task{linkedTaskCount > 1 ? 's' : ''}{' '}
                    across {generationRun.variants.length} variation
                    {generationRun.variants.length > 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>

              <Button
                className="min-h-12 w-full text-base font-medium"
                disabled={isBusy || !canGenerate}
                onClick={() => {
                  void onGenerate()
                }}
              >
                {isBusy ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <WandSparkles data-icon="inline-start" />
                )}
                {getGenerateButtonLabel(generationRun, batchSize)}
              </Button>
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
  const selectGenerationVariant = useGenerationStore(
    (state) => state.selectGenerationVariant,
  )
  const selectedVariant = runMatchesWorkspace
    ? getSelectedRunVariant(runState)
    : null
  const totalVariants = runState.variants.length
  const completedVariants = getCompletedVariantCount(runState)
  const failedVariants = getFailedVariantCount(runState)
  const activeTaskCount = getActiveTaskCount(runState)

  if (
    runMatchesWorkspace &&
    (runState.status === 'uploading' || runState.status === 'submitting') &&
    totalVariants === 0
  ) {
    return (
      <PreviewStateCallout
        body={getRunBodyCopy(runState)}
        icon={<LoaderCircle className="size-8 animate-spin" />}
        title={getRunHeadline(runState)}
      />
    )
  }

  if (runMatchesWorkspace && totalVariants > 0) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-secondary/60 p-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Batch review
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {getRunHeadline(runState)}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {getRunBodyCopy(runState)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label="Status" value={getRunStatusLabel(runState.status)} />
            <StatusPill label="Complete" value={`${completedVariants}/${totalVariants}`} />
            {failedVariants > 0 ? (
              <StatusPill label="Failed" value={String(failedVariants)} />
            ) : null}
            {activeTaskCount > 0 ? (
              <StatusPill label="Tasks" value={String(activeTaskCount)} />
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-secondary/70">
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
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    alt={`Generated result for variation ${selectedVariant.index}`}
                    className="h-full w-full object-cover"
                    src={selectedVariant.result.url}
                  />
                )}
              </div>

              <div className="border-t border-border bg-background/95 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Selected variation
                    </p>
                    <p className="mt-2 text-base font-semibold">
                      Variation {selectedVariant.index}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedVariant.profile}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label="Task" value={selectedVariant.result.taskId.slice(0, 18)} />
                    <StatusPill label="Model" value={selectedVariant.result.model} />
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Prompt
                  </p>
                  <p className="mt-2 max-h-24 overflow-auto pr-1 text-sm leading-6 text-foreground/88">
                    {selectedVariant.prompt}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <PreviewStateCallout
              body={getRunBodyCopy(runState)}
              icon={
                runState.status === 'error' ? (
                  <AlertTriangle className="size-8" />
                ) : (
                  <LoaderCircle className="size-8 animate-spin" />
                )
              }
              tone={runState.status === 'error' ? 'destructive' : 'default'}
              title={getRunHeadline(runState)}
            />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {runState.variants.map((variant) => {
            const isSelected = selectedVariant?.variantId === variant.variantId
            const isInteractive =
              variant.status === 'success' && Boolean(variant.result)

            return (
              <button
                key={variant.variantId}
                className={cn(
                  'flex min-h-36 w-full flex-col items-start rounded-xl border bg-background p-4 text-left transition-colors',
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

                <p className="mt-4 text-sm text-muted-foreground">
                  {variant.taskId
                    ? `Task ${variant.taskId.slice(0, 18)}`
                    : variant.error ?? 'Task creation did not complete.'}
                </p>

                <p className="mt-3 text-sm leading-6 text-foreground/86">
                  {variant.status === 'success' && variant.result
                    ? `Ready to review in the spotlight. ${variant.result.type === 'video' ? 'Video output returned.' : 'Image output returned.'}`
                    : variant.status === 'error'
                      ? variant.error ?? 'This variation failed upstream.'
                      : 'Provider task is still rendering.'}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (runMatchesWorkspace && runState.status === 'error') {
    return (
      <PreviewStateCallout
        body={runState.error ?? 'The provider rejected this request.'}
        icon={<AlertTriangle className="size-8" />}
        tone="destructive"
        title="Generation stopped before completion"
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
        {activeTab === 'video' ? (
          <Film className="size-8" />
        ) : (
          <ImageIcon className="size-8" />
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
    <div className={cn(rowClassName, 'px-3 py-3')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  )
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="max-w-full rounded-lg border border-border bg-secondary px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>{' '}
      <span className="break-words text-sm font-medium tracking-tight text-foreground">
        {value}
      </span>
    </div>
  )
}

function ControlGroup({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-3">
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
  const activeTab = useGenerationStore((state) => state.activeTab)
  const imageModel = useGenerationStore((state) => state.imageModel)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const productCategory = useGenerationStore((state) => state.productCategory)
  const creativeStyle = useGenerationStore((state) => state.creativeStyle)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const batchSize = useGenerationStore((state) => state.batchSize)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const assets = useGenerationStore((state) => state.assets)
  const products = useGenerationStore((state) => state.products)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const activeVariantSignature = useMemo(
    () =>
      generationRun.variants
        .map(
          (variant) =>
            `${variant.variantId}:${variant.status}:${variant.taskId ?? ''}`,
        )
        .join('|'),
    [generationRun.variants],
  )
  const hasRenderableVariants = useMemo(
    () =>
      generationRun.variants.some(
        (variant) => variant.status === 'rendering' && Boolean(variant.taskId),
      ),
    [generationRun.variants],
  )

  const validation = useMemo(
    () =>
      getGenerationValidation({
        activeTab,
        assets,
        batchSize,
        cameraMovement,
        creativeStyle,
        imageModel,
        outputQuality,
        productCategory,
        products,
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
      creativeStyle,
      imageModel,
      outputQuality,
      productCategory,
      products,
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
      generationRun.status !== 'rendering' ||
      !generationRun.provider ||
      !generationRun.workspace ||
      !generationRun.model ||
      !hasRenderableVariants
    ) {
      return
    }

    const pollTaskGroup = async () => {
      const state = useGenerationStore.getState()
      const { generationRun: run } = state

      if (
        run.status !== 'rendering' ||
        !run.provider ||
        !run.workspace ||
        !run.model
      ) {
        return
      }

      const activeVariants = run.variants.filter(
        (variant) => variant.status === 'rendering' && Boolean(variant.taskId),
      )
      const provider = run.provider
      const workspace = run.workspace
      const model = run.model

      if (activeVariants.length === 0) {
        return
      }

      if (run.startedAt && Date.now() - run.startedAt > taskPollTimeoutMs) {
        state.setGenerationError(
          'Generation timed out after 10 minutes. Please retry the task.',
        )

        return
      }

      try {
        const pollResults = await Promise.allSettled(
          activeVariants.map(async (variant) => {
            const response = await fetch(
              `/api/generation/tasks/${encodeURIComponent(variant.taskId ?? '')}?provider=${encodeURIComponent(provider)}&workspace=${encodeURIComponent(workspace)}&model=${encodeURIComponent(model)}`,
              {
                cache: 'no-store',
              },
            )
            const payload = (await response.json()) as TaskPollResponse & {
              error?: string
            }

            if (!response.ok) {
              throw new Error(
                payload.error ?? 'Unable to read generation status.',
              )
            }

            return {
              payload,
              variantId: variant.variantId,
            }
          }),
        )
        const latestState = useGenerationStore.getState()

        if (latestState.generationRun.runId !== run.runId) {
          return
        }

        const updates = new Map<
          string,
          Partial<GenerationVariant>
        >()

        pollResults.forEach((result, index) => {
          const variant = activeVariants[index]

          if (!variant) {
            return
          }

          if (result.status === 'rejected') {
            updates.set(variant.variantId, {
              error:
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Unable to poll generation status.',
              result: null,
              status: 'error',
            })

            return
          }

          if (result.value.payload.status === 'success' && result.value.payload.result) {
            updates.set(variant.variantId, {
              error: null,
              result: result.value.payload.result,
              status: 'success',
            })
            return
          }

          if (result.value.payload.status === 'error') {
            updates.set(variant.variantId, {
              error: result.value.payload.error ?? 'Generation failed.',
              result: null,
              status: 'error',
            })
          }
        })

        if (updates.size === 0) {
          return
        }

        latestState.setGenerationVariants(
          latestState.generationRun.variants.map((variant) =>
            updates.has(variant.variantId)
              ? {
                  ...variant,
                  ...updates.get(variant.variantId),
                }
              : variant,
          ),
        )
      } catch (error) {
        state.setGenerationError(
          error instanceof Error
            ? error.message
            : 'Unable to poll generation status.',
        )
      }
    }

    void pollTaskGroup()

    const interval = window.setInterval(() => {
      void pollTaskGroup()
    }, taskPollIntervalMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    activeVariantSignature,
    generationRun.model,
    generationRun.provider,
    generationRun.runId,
    generationRun.status,
    generationRun.workspace,
    hasRenderableVariants,
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
    const currentModel =
      state.activeTab === 'image' ? state.imageModel : state.videoModel

    state.clearUploadMetadata()
    state.updateGenerationRun({
      error: null,
      model: currentModel,
      provider: null,
      runId: null,
      selectedVariantId: null,
      startedAt: Date.now(),
      uploadedAssets: [],
      variants: [],
      workspace: state.activeTab,
    })
    markManifestState(assetManifest, 'uploading', null)
    state.setGenerationRunStatus('uploading')

    try {
      state.setGenerationRunStatus('submitting')

      const response = await fetch('/api/generation/run', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as RunSubmissionResponse & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to start generation.')
      }

      applyUploadedAssetState(payload.uploadedAssets)

      state.updateGenerationRun({
        error: null,
        model: payload.model,
        provider: payload.provider,
        runId: payload.runId,
        selectedVariantId: null,
        startedAt: Date.now(),
        uploadedAssets: payload.uploadedAssets,
        workspace: payload.workspace,
      })
      state.setGenerationVariants(payload.variants)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start generation.'

      markManifestState(assetManifest, 'error', message)
      state.setGenerationError(message)
    }
  }

  return {
    canGenerate: validation.canGenerate,
    disabledReason,
    handleGenerate,
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
  uploadedAssets: RunSubmissionResponse['uploadedAssets'],
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

function getActiveTaskCount(run: GenerationRun) {
  return run.variants.filter(
    (variant) => variant.status === 'rendering' && Boolean(variant.taskId),
  ).length
}

function getLinkedTaskCount(run: GenerationRun) {
  return run.variants.filter((variant) => Boolean(variant.taskId)).length
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

function getCompletedVariantCount(run: GenerationRun) {
  return run.variants.filter((variant) => variant.status === 'success').length
}

function getFailedVariantCount(run: GenerationRun) {
  return run.variants.filter((variant) => variant.status === 'error').length
}

function hasActiveGeneration(run: GenerationRun) {
  return (
    run.status === 'uploading' ||
    run.status === 'submitting' ||
    run.status === 'rendering'
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
    case 'rendering':
    case 'submitting':
      return 'outline' as const
    default:
      return 'secondary' as const
  }
}

function getGenerationHelperMessage(
  disabledReason: string | null,
  generationRun: GenerationRun,
) {
  if (disabledReason) {
    return disabledReason
  }

  const total = generationRun.variants.length
  const completed = getCompletedVariantCount(generationRun)
  const failed = getFailedVariantCount(generationRun)

  if (generationRun.status === 'success') {
    return `${completed} of ${total} variation${total === 1 ? '' : 's'} completed successfully.`
  }

  if (generationRun.status === 'partial-success') {
    return `${completed} variation${completed === 1 ? '' : 's'} finished and ${failed} failed. Review the successful outputs in the spotlight.`
  }

  if (generationRun.status === 'error') {
    if (total > 0) {
      return generationRun.error ?? `All ${total} variations failed. Adjust the brief and try again.`
    }

    return generationRun.error ?? 'The last run failed. Adjust inputs and retry.'
  }

  if (generationRun.status === 'rendering') {
    return `${completed} of ${total} variation${total === 1 ? '' : 's'} completed so far. The remaining tasks are still rendering.`
  }

  if (generationRun.status === 'submitting') {
    return 'The server is creating parallel provider tasks for the selected batch.'
  }

  if (generationRun.status === 'uploading') {
    return 'Local references are uploading once and will be reused across every variation.'
  }

  return 'Use the reference board first, then run from the output panel.'
}

function getGenerateButtonLabel(
  generationRun: GenerationRun,
  batchSize: BatchSize,
) {
  if (generationRun.status === 'uploading') {
    return 'Uploading References'
  }

  if (generationRun.status === 'submitting') {
    return `Creating ${batchSize} Variation${batchSize > 1 ? 's' : ''}`
  }

  if (generationRun.status === 'rendering') {
    const total = generationRun.variants.length || batchSize
    const completed = getCompletedVariantCount(generationRun)

    return completed > 0
      ? `${completed} of ${total} Complete`
      : `Generating ${total} Variation${total > 1 ? 's' : ''}`
  }

  if (generationRun.status === 'partial-success') {
    const failed = getFailedVariantCount(generationRun)

    return `Completed with ${failed} Failed`
  }

  if (generationRun.status === 'error') {
    return 'Retry Generation'
  }

  if (generationRun.status === 'success') {
    return 'Generate Again'
  }

  return `Generate ${batchSize} Variation${batchSize > 1 ? 's' : ''}`
}

function getRunHelperText(run: GenerationRun) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'uploading':
      return 'Uploading shared references once'
    case 'submitting':
      return 'Creating batched provider tasks'
    case 'rendering':
      return `${completed} of ${total} complete`
    case 'partial-success':
      return `${completed} complete, ${failed} failed`
    case 'success':
      return `${completed} variation${completed === 1 ? '' : 's'} ready`
    case 'error':
      return total > 0 ? 'Batch finished with no usable outputs' : 'Retry after adjusting inputs'
    default:
      return 'No active render'
  }
}

function getRunHeadline(run: GenerationRun) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'uploading':
      return 'Uploading local references'
    case 'submitting':
      return `Submitting ${total || 1} KIE variation${(total || 1) > 1 ? 's' : ''}`
    case 'rendering':
      return `Generating ${total} variation${total > 1 ? 's' : ''}`
    case 'partial-success':
      return `Completed with ${failed} failed variation${failed > 1 ? 's' : ''}`
    case 'success':
      return `${completed} variation${completed > 1 ? 's are' : ' is'} ready for review`
    case 'error':
      return total > 0 ? 'Every variation failed' : 'Generation stopped before completion'
    default:
      return 'Rendering media on KIE'
  }
}

function getRunBodyCopy(run: GenerationRun) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'uploading':
      return 'Your browser-local images are being uploaded to temporary KIE file storage before task submission.'
    case 'submitting':
      return 'The server is compiling deterministic prompt variants and creating the provider tasks in parallel.'
    case 'rendering':
      return `${completed} of ${total} variation${total === 1 ? '' : 's'} have completed. The remaining tasks are polled every three seconds until they resolve or time out.`
    case 'partial-success':
      return `${completed} successful variation${completed === 1 ? '' : 's'} remain reviewable in the spotlight. ${failed} variation${failed === 1 ? '' : 's'} failed and stay visible in the gallery for debugging.`
    case 'success':
      return 'Review the spotlight output, switch between finished variants below, and rerun when you want a fresh batch.'
    case 'error':
      return run.error ?? 'The provider rejected every variation in this batch.'
    default:
      return 'The app is polling the task status every three seconds and will swap this canvas to the finished result when the provider completes.'
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
  return (
    subjectModes.find((option) => option.value === mode)?.label ??
    humanize(mode)
  )
}

function getCameraMovementLabel(movement: CameraMovement) {
  return (
    cameraMovements.find((option) => option.value === movement)?.label ??
    humanize(movement)
  )
}

function getRunStatusLabel(
  status: GenerationRunStatus | GenerationVariant['status'],
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
