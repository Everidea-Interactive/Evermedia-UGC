'use client'

import { useEffect, useMemo, useState } from 'react'

import { useLocale } from '@/components/i18n/locale-provider'
import {
  buildGenerationFormData,
  getGenerationValidation,
  readJsonResponse,
} from '@/lib/generation/client'
import {
  getGenerationCostEstimate,
  getGenerationCreditValidation,
} from '@/lib/generation/pricing'
import { readVideoDurationSeconds } from '@/lib/generation/video-metadata'
import type {
  AssetSlot,
  BatchSize,
  CameraMovement,
  CarouselDraft,
  CharacterAgeGroup,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  GenerationRun,
  GenerationSnapshot,
  GenerationLocale,
  ImageModelOption,
  KiePricingResponse,
  KieStatusResponse,
  MotionControlDraft,
  NamedAssetSlots,
  OrientationPreference,
  OutputQuality,
  PromptEnhancement,
  ProductCategory,
  ShotEnvironment,
  SubjectMode,
  VideoDuration,
  VideoAudio,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import { useGenerationStore } from '@/store/use-generation-store'

const runPollIntervalMs = 2_500

function createGenerationSnapshot(input: {
  activeTab: WorkspaceTab
  assets: NamedAssetSlots
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  carouselDraft: CarouselDraft
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  figureArtDirection: FigureArtDirection
  imageModel: ImageModelOption
  locale: GenerationLocale
  motionControl: MotionControlDraft
  orientationPreference: OrientationPreference
  outputQuality: OutputQuality
  promptEnhancement: PromptEnhancement
  productCategory: ProductCategory
  products: AssetSlot[]
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoReferences: AssetSlot[]
  videoAudio: VideoAudio
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}): GenerationSnapshot & {
  carouselDraft: CarouselDraft
  motionControl: MotionControlDraft
} {
  return {
    ...input,
    carouselDraft: input.carouselDraft,
    motionControl: input.motionControl,
  }
}

function hasActiveGeneration(run: GenerationRun) {
  return run.status === 'rendering'
}

function canResolveMotionControlDurationOnSubmit(
  snapshot: ReturnType<typeof createGenerationSnapshot>,
  creditValidation: ReturnType<typeof getGenerationCreditValidation>,
) {
  return (
    snapshot.activeTab === 'motion-control' &&
    creditValidation.reason === 'Checking motion video duration.' &&
    Boolean(
      snapshot.motionControl.referenceImage.file &&
        snapshot.motionControl.motionVideo.file,
    )
  )
}

async function hydrateMotionControlDurationIfMissing(
  snapshot: ReturnType<typeof createGenerationSnapshot>,
  setMotionControlMotionVideoDuration: (value: number | null) => void,
) {
  if (snapshot.activeTab !== 'motion-control') {
    return snapshot
  }

  const motionVideoFile = snapshot.motionControl.motionVideo.file
  const durationSeconds = snapshot.motionControl.motionVideo.durationSeconds

  if (!motionVideoFile) {
    return snapshot
  }

  let nextDurationSeconds: number | null = null

  try {
    nextDurationSeconds = await readVideoDurationSeconds(motionVideoFile)
  } catch {
    if (
      typeof durationSeconds === 'number' &&
      Number.isFinite(durationSeconds) &&
      durationSeconds > 0
    ) {
      nextDurationSeconds = durationSeconds
    } else {
      throw new Error('Unable to read motion video duration metadata.')
    }
  }

  setMotionControlMotionVideoDuration(nextDurationSeconds)

  return {
    ...snapshot,
    motionControl: {
      ...snapshot.motionControl,
      motionVideo: {
        ...snapshot.motionControl.motionVideo,
        durationSeconds: nextDurationSeconds,
      },
    },
  }
}

export function useManualGenerationController(input: {
  enabled: boolean
  kiePricing: KiePricingResponse | null
  kieStatus: KieStatusResponse
  pricingError: string | null
}) {
  const { enabled, kiePricing, kieStatus, pricingError } = input
  const { locale } = useLocale()
  const activeTab = useGenerationStore((state) => state.activeTab)
  const assets = useGenerationStore((state) => state.assets)
  const batchSize = useGenerationStore((state) => state.batchSize)
  const cameraMovement = useGenerationStore((state) => state.cameraMovement)
  const carouselDraft = useGenerationStore((state) => state.carouselDraft)
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
  const motionControl = useGenerationStore((state) => state.motionControl)
  const orientationPreference = useGenerationStore(
    (state) => state.orientationPreference,
  )
  const outputQuality = useGenerationStore((state) => state.outputQuality)
  const promptEnhancement = useGenerationStore(
    (state) => state.promptEnhancement,
  )
  const productCategory = useGenerationStore((state) => state.productCategory)
  const products = useGenerationStore((state) => state.products)
  const videoReferences = useGenerationStore((state) => state.videoReferences)
  const resetGenerationRun = useGenerationStore((state) => state.resetGenerationRun)
  const setGenerationError = useGenerationStore(
    (state) => state.setGenerationError,
  )
  const shotEnvironment = useGenerationStore((state) => state.shotEnvironment)
  const subjectMode = useGenerationStore((state) => state.subjectMode)
  const textPrompt = useGenerationStore((state) => state.textPrompt)
  const videoDuration = useGenerationStore((state) => state.videoDuration)
  const videoAudio = useGenerationStore((state) => state.videoAudio)
  const videoModel = useGenerationStore((state) => state.videoModel)
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false)

  const generationSnapshot = useMemo(
    () =>
      createGenerationSnapshot({
        activeTab,
        assets,
        batchSize,
        cameraMovement,
        carouselDraft,
        characterAgeGroup,
        characterGender,
        creativeStyle,
        figureArtDirection,
        imageModel,
        locale,
        motionControl,
        orientationPreference,
        outputQuality,
        promptEnhancement,
        productCategory,
        products,
        shotEnvironment,
        subjectMode,
        textPrompt,
        videoReferences,
        videoAudio,
        videoDuration,
        videoModel,
      }),
    [
      activeTab,
      assets,
      batchSize,
      cameraMovement,
      carouselDraft,
      characterAgeGroup,
      characterGender,
      creativeStyle,
      figureArtDirection,
      imageModel,
      locale,
      motionControl,
      orientationPreference,
      outputQuality,
      promptEnhancement,
      productCategory,
      products,
      shotEnvironment,
      subjectMode,
      textPrompt,
      videoReferences,
      videoAudio,
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
  const motionControlCanResolveDurationOnSubmit = useMemo(
    () =>
      canResolveMotionControlDurationOnSubmit(
        generationSnapshot,
        creditValidation,
      ),
    [creditValidation, generationSnapshot],
  )

  const isBusy = isSubmittingGeneration || hasActiveGeneration(generationRun)
  const disabledReason = isBusy
    ? 'A batched render is already in progress. Wait for the current run to finish before starting another batch.'
    : enabled
      ? validation.reason ??
        (motionControlCanResolveDurationOnSubmit
          ? null
          : creditValidation.reason)
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
      carouselDraft: state.carouselDraft,
      characterAgeGroup: state.characterAgeGroup,
      characterGender: state.characterGender,
      creativeStyle: state.creativeStyle,
      figureArtDirection: state.figureArtDirection,
      imageModel: state.imageModel,
      locale,
      motionControl: state.motionControl,
      orientationPreference: state.orientationPreference,
      outputQuality: state.outputQuality,
      promptEnhancement: state.promptEnhancement,
      productCategory: state.productCategory,
      products: state.products,
      shotEnvironment: state.shotEnvironment,
      subjectMode: state.subjectMode,
      textPrompt: state.textPrompt,
      videoReferences: state.videoReferences,
      videoAudio: state.videoAudio,
      videoDuration: state.videoDuration,
      videoModel: state.videoModel,
    })
    const currentValidation = getGenerationValidation(currentSnapshot)

    if (!currentValidation.canGenerate) {
      setGenerationError(currentValidation.reason ?? 'Generation is blocked.')
      return
    }

    const hydratedSnapshot = await hydrateMotionControlDurationIfMissing(
      currentSnapshot,
      state.setMotionControlMotionVideoDuration,
    )

    const currentEstimate = getGenerationCostEstimate(
      hydratedSnapshot,
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
      const { formData } = buildGenerationFormData(hydratedSnapshot)

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
      >(response, 'Unable to start generation.')

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

  const createSnapshot = () => {
    const state = useGenerationStore.getState()
    return createGenerationSnapshot({
      activeTab: state.activeTab,
      assets: state.assets,
      batchSize: state.batchSize,
      cameraMovement: state.cameraMovement,
      carouselDraft: state.carouselDraft,
      characterAgeGroup: state.characterAgeGroup,
      characterGender: state.characterGender,
      creativeStyle: state.creativeStyle,
      figureArtDirection: state.figureArtDirection,
      imageModel: state.imageModel,
      locale,
      motionControl: state.motionControl,
      orientationPreference: state.orientationPreference,
      outputQuality: state.outputQuality,
      promptEnhancement: state.promptEnhancement,
      productCategory: state.productCategory,
      products: state.products,
      shotEnvironment: state.shotEnvironment,
      subjectMode: state.subjectMode,
      textPrompt: state.textPrompt,
      videoReferences: state.videoReferences,
      videoAudio: state.videoAudio,
      videoDuration: state.videoDuration,
      videoModel: state.videoModel,
    })
  }

  return {
    canGenerate:
      enabled && !isSubmittingGeneration
        ? validation.canGenerate &&
          (creditValidation.canGenerate || motionControlCanResolveDurationOnSubmit)
        : false,
    createSnapshot,
    disabledReason,
    generationCostEstimate,
    generationCostReason:
      pricingError ?? generationCostEstimate.reason ?? 'Live pricing unavailable.',
    handleGenerate,
    isBusy,
  }
}

export type ManualGenerationController = ReturnType<
  typeof useManualGenerationController
>
