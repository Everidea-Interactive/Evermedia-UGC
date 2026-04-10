import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  buildPromptSnapshot,
  createRunId,
  getKieStatus,
  parseGenerationFormData,
  submitGenerationRequest,
  type ParsedGenerationRequest,
} from '@/lib/generation/kie'
import { getKiePricing } from '@/lib/generation/kie-pricing'
import {
  getGenerationCostEstimate,
  getGenerationCreditValidation,
} from '@/lib/generation/pricing'
import type {
  AssetSlot,
  GenerationSnapshot,
  NamedAssetSlots,
} from '@/lib/generation/types'
import {
  createGenerationRunForUser,
  createGenerationVariantsForRun,
  getGenerationRunBundleForUser,
} from '@/lib/persistence/repository'
import {
  createGenerationRunState,
  normalizeProjectConfigSnapshot,
} from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

function createEstimateSlot(input: {
  file: File | null
  id: string
  label: string
}): AssetSlot {
  return {
    error: null,
    file: input.file,
    id: input.id,
    label: input.label,
    mimeType: input.file?.type ?? null,
    previewUrl: null,
    size: input.file?.size ?? null,
    uploadStatus: input.file ? 'staged' : 'idle',
  }
}

function createEmptyNamedAssetSlots(): NamedAssetSlots {
  return {
    clothing: createEstimateSlot({
      file: null,
      id: 'clothing',
      label: 'Clothing',
    }),
    endFrame: createEstimateSlot({
      file: null,
      id: 'endFrame',
      label: 'End Frame',
    }),
    face1: createEstimateSlot({
      file: null,
      id: 'face1',
      label: 'Face 1',
    }),
    face2: createEstimateSlot({
      file: null,
      id: 'face2',
      label: 'Face 2',
    }),
    location: createEstimateSlot({
      file: null,
      id: 'location',
      label: 'Location',
    }),
  }
}

function createEstimateSnapshot(
  input: ParsedGenerationRequest,
): Pick<
  GenerationSnapshot,
  | 'activeTab'
  | 'assets'
  | 'batchSize'
  | 'imageModel'
  | 'outputQuality'
  | 'products'
  | 'subjectMode'
  | 'videoDuration'
  | 'videoModel'
> {
  const assets = createEmptyNamedAssetSlots()
  const products: AssetSlot[] = []

  for (const assetDescriptor of input.assetDescriptors) {
    const slot = createEstimateSlot({
      file: assetDescriptor.file,
      id: assetDescriptor.fieldName,
      label: assetDescriptor.label,
    })

    if (assetDescriptor.kind === 'named' && assetDescriptor.key) {
      assets[assetDescriptor.key] = slot
      continue
    }

    if (assetDescriptor.kind === 'product') {
      products.push(slot)
    }
  }

  return {
    activeTab: input.workspace,
    assets,
    batchSize: input.batchSize,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    products,
    subjectMode: input.subjectMode,
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
  }
}

function getGenerationErrorStatus(message: string) {
  if (message.includes('KIE_API_KEY') || message.includes('configured')) {
    return 500
  }

  if (message.startsWith('Not enough KIE credits.')) {
    return 402
  }

  if (/KIE|credit|credits|balance|pricing/i.test(message)) {
    return 503
  }

  return 400
}

function createConfigSnapshot(input: ReturnType<typeof parseGenerationFormData>) {
  return normalizeProjectConfigSnapshot({
    activeTab: input.workspace,
    batchSize: input.batchSize,
    cameraMovement: input.cameraMovement,
    characterAgeGroup: input.characterAgeGroup,
    characterGender: input.characterGender,
    creativeStyle: input.creativeStyle,
    experience: input.experience,
    figureArtDirection: input.figureArtDirection,
    guided: input.guided
      ? {
          analysisModel: input.guided.analysisModel,
          contentConcept: input.guided.contentConcept,
          productUrl: input.guided.productUrl,
          shots: input.guided.shots,
          summary: input.guided.summary,
        }
      : null,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    shotEnvironment: input.shotEnvironment,
    subjectMode: input.subjectMode,
    textPrompt: input.textPrompt,
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
  })
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const parsedRequest = parseGenerationFormData(formData)
    const pricing = await getKiePricing()
    const kieStatus = await getKieStatus()
    const estimate = getGenerationCostEstimate(
      createEstimateSnapshot(parsedRequest),
      pricing.matrix,
    )
    const creditValidation = getGenerationCreditValidation({
      balanceCredits: kieStatus.credits,
      balanceError: kieStatus.error,
      estimate,
    })

    if (!creditValidation.canGenerate) {
      return NextResponse.json(
        {
          error: creditValidation.reason ?? 'Generation is blocked.',
        },
        {
          status: getGenerationErrorStatus(
            creditValidation.reason ?? 'Generation is blocked.',
          ),
        },
      )
    }

    const runId = createRunId()
    const promptSnapshot = buildPromptSnapshot(parsedRequest)
    const submission = await submitGenerationRequest(parsedRequest, {
      basePrompt: promptSnapshot,
      runId,
    })

    await createGenerationRunForUser({
      configSnapshot: createConfigSnapshot(parsedRequest),
      model: submission.model,
      promptSnapshot,
      provider: submission.provider,
      runId,
      status: submission.status,
      userId: user.id,
      workspace: submission.workspace,
    })

    await createGenerationVariantsForRun(
      runId,
      submission.variants.map((variant) => ({
        error: variant.error,
        id: variant.variantId,
        profile: variant.profile,
        prompt: variant.prompt,
        status: variant.status,
        taskId: variant.taskId,
        variantIndex: variant.index,
      })),
    )

    const persistedRun = await getGenerationRunBundleForUser(user.id, runId)

    if (!persistedRun) {
      throw new Error('Submitted generation run could not be reloaded.')
    }

    return NextResponse.json(
      createGenerationRunState(persistedRun.run, persistedRun.outputs),
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start generation.'

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: getGenerationErrorStatus(message),
      },
    )
  }
}
