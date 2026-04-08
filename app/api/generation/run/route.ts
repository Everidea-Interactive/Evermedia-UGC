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
  getProjectForUser,
  loadPersistedAssetFile,
  markGenerationRunError,
} from '@/lib/persistence/repository'

export const runtime = 'nodejs'

function inferProvider(input: ReturnType<typeof parseGenerationFormData>) {
  if (input.workspace === 'video' && input.videoModel === 'veo-3.1') {
    return 'veo' as const
  }

  return 'market' as const
}

function createConfigSnapshot(input: ReturnType<typeof parseGenerationFormData>) {
  return {
    activeTab: input.workspace,
    batchSize: input.batchSize,
    cameraMovement: input.cameraMovement,
    creativeStyle: input.creativeStyle,
    imageModel: input.imageModel,
    outputQuality: input.outputQuality,
    productCategory: input.productCategory,
    subjectMode: input.subjectMode,
    textPrompt: input.textPrompt,
    videoDuration: input.videoDuration,
    videoModel: input.videoModel,
  }
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let runId: string | null = null

  try {
    const formData = await request.formData()
    const parsedRequest = parseGenerationFormData(formData)
    const project = await getProjectForUser(user.id, parsedRequest.projectId)

    if (!project) {
      throw new Error('Active project could not be found.')
    }

    runId = createRunId()
    const promptSnapshot = buildPromptSnapshot(parsedRequest)

    await createGenerationRunForUser({
      configSnapshot: createConfigSnapshot(parsedRequest),
      model: String(parsedRequest.activeModel),
      projectId: parsedRequest.projectId,
      promptSnapshot,
      provider: inferProvider(parsedRequest),
      runId,
      status: 'uploading',
      userId: user.id,
      workspace: parsedRequest.workspace,
    })

    const response = await submitGenerationRequest(parsedRequest, {
      basePrompt: promptSnapshot,
      resolvePersistedAssetFile: async (assetId) =>
        (
          await loadPersistedAssetFile({
            assetId,
            projectId: parsedRequest.projectId,
            userId: user.id,
          })
        ).file,
      runId,
    })

    await createGenerationVariantsForRun(
      runId,
      response.variants.map((variant) => ({
        error: variant.error,
        id: variant.variantId,
        profile: variant.profile,
        prompt: variant.prompt,
        status: variant.status,
        taskId: variant.taskId,
        variantIndex: variant.index,
      })),
    )

    return NextResponse.json(response)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to start generation.'

    if (user && runId) {
      await markGenerationRunError({
        error: message,
        runId,
        userId: user.id,
      }).catch(() => undefined)
    }

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
