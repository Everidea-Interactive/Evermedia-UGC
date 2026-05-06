'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleSlash, LoaderCircle, WandSparkles } from 'lucide-react'

import {
  batchSizes,
  cameraMovements,
  creativeStyles,
  durations,
  getImageQualityLabel,
  getImageQualityOptions,
  productCategories,
  shotEnvironments,
  getVideoDurationLabel,
  figureArtDirections,
  imageModels,
  videoQualities,
  videoModels,
} from '@/components/dashboard/manual-workspace-config'
import { MotionControlsSection } from '@/components/dashboard/manual-motion-controls-section'
import { ReferenceWorkspaceSection } from '@/components/dashboard/manual-reference-workspace-section'
import {
  GenerationEstimateStrip,
  insetPanelClassName,
  panelClassName,
  PreviewSnapshotItem,
  StatusPill,
} from '@/components/dashboard/manual-workspace-ui'
import { useManualGenerationController } from '@/components/dashboard/use-manual-generation-controller'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorNoticeDialog } from '@/components/ui/error-notice-dialog'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  getGenerationFailureNotice,
  getGenerateButtonLabel,
} from '@/lib/generation/run-copy'
import { isRunVisibleForExperience } from '@/lib/generation/run-visibility'
import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  GenerationCostEstimate,
  GenerationRun,
  ImageModelOption,
  KiePricingResponse,
  KieStatusResponse,
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

const RefineRenderSection = dynamic(() =>
  import('@/components/dashboard/manual-refine-render-section').then(
    (module) => module.RefineRenderSection,
  ),
)

const OutputPanel = dynamic(() =>
  import('@/components/dashboard/manual-output-panel').then(
    (module) => module.OutputPanel,
  ),
)

type ManualSection = 'references' | 'preset' | 'motion' | 'outputs'

export function normalizeManualSection(
  manualSection: ManualSection,
  activeTab: WorkspaceTab,
): ManualSection {
  if (activeTab !== 'video' && manualSection === 'motion') {
    return 'references'
  }

  return manualSection
}

export function DashboardShell({
  isPricingLoading,
  kiePricing,
  kiePricingError,
  kieStatus,
}: {
  isPricingLoading: boolean
  kiePricing: KiePricingResponse | null
  kiePricingError: string | null
  kieStatus: KieStatusResponse
}) {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const generationErrorEventId = useGenerationStore(
    (state) => state.generationErrorEventId,
  )
  const controller = useManualGenerationController({
    enabled: true,
    kiePricing,
    kieStatus,
    pricingError: kiePricingError,
  })
  const [manualSection, setManualSection] = useState<ManualSection>('references')
  const [isErrorNoticeOpen, setIsErrorNoticeOpen] = useState(false)
  const [errorNotice, setErrorNotice] = useState(() =>
    getGenerationFailureNotice(null),
  )
  const lastManualTerminalRunKeyRef = useRef<string | null>(null)
  const visibleManualSection = normalizeManualSection(manualSection, activeTab)

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

    const timeoutId = window.setTimeout(() => {
      setErrorNotice(getGenerationFailureNotice(generationRun.error ?? ''))
      setIsErrorNoticeOpen(true)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    generationErrorEventId,
    generationRun.error,
    generationRun.status,
  ])

  return (
    <>
      <ErrorNoticeDialog
        description={errorNotice.message}
        detail={errorNotice.detail}
        onOpenChange={setIsErrorNoticeOpen}
        open={isErrorNoticeOpen}
        title={errorNotice.title}
      />
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.92fr)] xl:items-start">
          <div className="xl:col-start-1">
            <Tabs
              className="flex flex-col gap-3"
              onValueChange={(value) => setManualSection(value as ManualSection)}
              value={visibleManualSection}
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

              <TabsContent forceMount className="mt-0" value="references">
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
            generationCostEstimate={controller.generationCostEstimate}
            generationCostReason={controller.generationCostReason}
            isBusy={controller.isBusy}
            isPricingLoading={isPricingLoading}
            kiePricing={kiePricing}
            onCancelRun={controller.handleCancel}
            onGenerate={controller.handleGenerate}
          />
        </div>
      </div>
    </>
  )
}

function RunControlPanel({
  canGenerate,
  className,
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

function hasActiveGeneration(run: GenerationRun) {
  return run.status === 'rendering'
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
