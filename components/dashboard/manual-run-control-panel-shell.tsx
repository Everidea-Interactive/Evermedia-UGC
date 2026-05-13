'use client'

import { useEffect, useMemo } from 'react'
import { CircleSlash, LoaderCircle, WandSparkles } from 'lucide-react'

import {
  batchSizes,
  cameraMovements,
  creativeStyles,
  getForcedVideoAudio,
  getVideoAudioLabel,
  figureArtDirections,
  getImageQualityLabel,
  getImageQualityOptions,
  getVideoDurationLabel,
  getVideoDurationOptions,
  supportsVideoAudioSelection,
  imageModels,
  productCategories,
  shotEnvironments,
  videoModels,
  videoAudioOptions,
  videoQualities,
} from '@/components/dashboard/manual-workspace-config'
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
import { Select } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getGenerateButtonLabel } from '@/lib/generation/run-copy'
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
  VideoAudio,
  VideoModelOption,
} from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

export function ManualRunControlPanelShell({
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
  const controller = useManualGenerationController({
    enabled: true,
    kiePricing,
    kieStatus,
    pricingError: kiePricingError,
  })

  return (
    <RunControlPanel
      canGenerate={controller.canGenerate}
      className={className}
      generationCostEstimate={controller.generationCostEstimate}
      generationCostReason={controller.generationCostReason}
      isBusy={controller.isBusy}
      isPricingLoading={isPricingLoading}
      kiePricing={kiePricing}
      onCancelRun={controller.handleCancel}
      onGenerate={controller.handleGenerate}
    />
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
  const videoAudio = useGenerationStore((state) => state.videoAudio)
  const setVideoAudio = useGenerationStore((state) => state.setVideoAudio)
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

  useEffect(() => {
    if (activeTab !== 'video') {
      return
    }

    const forcedAudio = getForcedVideoAudio(videoModel)

    if (forcedAudio && videoAudio !== forcedAudio) {
      setVideoAudio(forcedAudio)
    }
  }, [activeTab, videoAudio, videoModel, setVideoAudio])

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
              ) : null}

              <div className="mt-2 grid gap-2.5">
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
                      {getVideoDurationOptions(videoModel).map((duration) => (
                        <option key={duration} value={duration}>
                          {getVideoDurationLabel(videoModel, duration)}
                        </option>
                      ))}
                    </Select>
                    {supportsVideoAudioSelection(videoModel) ? (
                      <>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Audio
                        </p>
                        <Select
                          aria-label="Video Audio"
                          onChange={(event) =>
                            setVideoAudio(event.target.value as VideoAudio)
                          }
                          value={videoAudio}
                        >
                          {videoAudioOptions.map((videoAudioOption) => (
                            <option key={videoAudioOption} value={videoAudioOption}>
                              {getVideoAudioLabel(videoAudioOption)}
                            </option>
                          ))}
                        </Select>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Audio
                        </p>
                        <Select
                          aria-label="Video Audio"
                          disabled
                          value="with-audio"
                        >
                          <option value="with-audio">Included by model</option>
                        </Select>
                      </>
                    )}
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
