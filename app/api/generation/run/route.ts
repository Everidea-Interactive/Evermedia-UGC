import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  buildPromptSnapshot,
  createRunId,
  parseGenerationFormData,
  submitGenerationRequest,
} from '@/lib/generation/kie'
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
        status:
          message.includes('KIE_API_KEY') || message.includes('configured')
            ? 500
            : 400,
      },
    )
  }
}
