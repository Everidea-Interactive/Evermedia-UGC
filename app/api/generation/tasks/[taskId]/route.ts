import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getTaskStatus } from '@/lib/generation/kie'
import type { GenerationProvider, WorkspaceTab } from '@/lib/generation/types'
import {
  getGenerationVariantForTask,
  getMediaUrl,
  getProjectAssetForUser,
  saveGeneratedOutputForVariant,
  updateGenerationVariantStatus,
} from '@/lib/persistence/repository'

export const runtime = 'nodejs'

function getResultFileName(taskId: string, workspace: WorkspaceTab) {
  return `${taskId}.${workspace === 'video' ? 'mp4' : 'png'}`
}

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { taskId } = await context.params
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') as GenerationProvider | null
    const workspace = searchParams.get('workspace') as WorkspaceTab | null
    const model = searchParams.get('model')
    const runId = searchParams.get('runId')

    if (!provider || (provider !== 'market' && provider !== 'veo')) {
      throw new Error('Missing or invalid provider query parameter.')
    }

    if (!workspace || (workspace !== 'image' && workspace !== 'video')) {
      throw new Error('Missing or invalid workspace query parameter.')
    }

    if (!model) {
      throw new Error('Missing model query parameter.')
    }

    const response = await getTaskStatus({
      model,
      provider,
      taskId,
      workspace,
    })

    if (runId) {
      const persistedVariant = await getGenerationVariantForTask({
        runId,
        taskId,
        userId: user.id,
      })

      if (persistedVariant) {
        if (persistedVariant.variant.resultAssetId) {
          const persistedAsset = await getProjectAssetForUser(
            user.id,
            persistedVariant.variant.resultAssetId,
          )

          if (persistedAsset && response.result) {
            return NextResponse.json({
              ...response,
              result: {
                ...response.result,
                thumbnailUrl:
                  response.result.type === 'video'
                    ? getMediaUrl(persistedAsset.id)
                    : response.result.thumbnailUrl,
                url: getMediaUrl(persistedAsset.id),
              },
            })
          }
        }

        if (response.status === 'success' && response.result) {
          const savedAsset = await saveGeneratedOutputForVariant({
            fileName: getResultFileName(taskId, workspace),
            fileType:
              response.result.type === 'video' ? 'video/mp4' : 'image/png',
            label: `Variation ${persistedVariant.variant.variantIndex} Output`,
            projectId: persistedVariant.run.projectId,
            runId,
            sourceUrl: response.result.url,
            userId: user.id,
            variantId: persistedVariant.variant.id,
          })

          return NextResponse.json({
            ...response,
            result: {
              ...response.result,
              thumbnailUrl:
                response.result.type === 'video'
                  ? getMediaUrl(savedAsset.id)
                  : response.result.thumbnailUrl,
              url: getMediaUrl(savedAsset.id),
            },
          })
        }

        if (response.status === 'error') {
          await updateGenerationVariantStatus({
            error: response.error ?? 'Generation failed upstream.',
            runId,
            status: 'error',
            taskId,
            userId: user.id,
          })
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to fetch generation status.',
      },
      {
        status: 400,
      },
    )
  }
}
