import { after, NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  buildPromptSnapshot,
  createRunId,
  getQueuedVariantPlan,
  parseGenerationFormData,
  stripAssetFiles,
} from '@/lib/generation/kie'
import { runGenerationWorkerCycle } from '@/lib/generation/worker'
import {
  createGenerationRunForUser,
  createGenerationVariantsForRun,
  getProjectForUser,
  getProjectGenerationRunForUser,
} from '@/lib/persistence/repository'
import {
  createGenerationRunState,
  normalizeProjectConfigSnapshot,
} from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

function inferProvider(input: ReturnType<typeof parseGenerationFormData>) {
  if (input.workspace === 'video' && input.videoModel === 'veo-3.1') {
    return 'veo' as const
  }

  return 'market' as const
}

function createConfigSnapshot(input: ReturnType<typeof parseGenerationFormData>) {
  return normalizeProjectConfigSnapshot({
    activeTab: input.workspace,
    batchSize: input.batchSize,
    cameraMovement: input.cameraMovement,
    characterAgeGroup: input.characterAgeGroup,
    characterGender: input.characterGender,
    creativeStyle: input.creativeStyle,
    figureArtDirection: input.figureArtDirection,
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

function createEphemeralWorkerId(runId: string) {
  return `web-${runId}`
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const parsedRequest = parseGenerationFormData(formData)
    const project = await getProjectForUser(user.id, parsedRequest.projectId)

    if (!project) {
      throw new Error('Active project could not be found.')
    }

    const runId = createRunId()
    const promptSnapshot = buildPromptSnapshot(parsedRequest)
    const assetManifest = stripAssetFiles(parsedRequest.assetDescriptors)

    if (assetManifest.some((descriptor) => !descriptor.persistedAssetId)) {
      throw new Error(
        'Wait for project asset sync to finish before starting generation.',
      )
    }

    await createGenerationRunForUser({
      assetManifest,
      configSnapshot: createConfigSnapshot(parsedRequest),
      model: String(parsedRequest.activeModel),
      projectId: parsedRequest.projectId,
      promptSnapshot,
      provider: inferProvider(parsedRequest),
      runId,
      status: 'queued',
      userId: user.id,
      workspace: parsedRequest.workspace,
    })

    await createGenerationVariantsForRun(
      runId,
      getQueuedVariantPlan(parsedRequest, {
        basePrompt: promptSnapshot,
        runId,
      }),
    )
    const persistedRun = await getProjectGenerationRunForUser({
      projectId: parsedRequest.projectId,
      runId,
      userId: user.id,
    })

    if (!persistedRun) {
      throw new Error('Queued generation run could not be reloaded.')
    }

    after(async () => {
      await runGenerationWorkerCycle(createEphemeralWorkerId(runId)).catch(() => undefined)
    })

    return NextResponse.json(createGenerationRunState(persistedRun, []))
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
