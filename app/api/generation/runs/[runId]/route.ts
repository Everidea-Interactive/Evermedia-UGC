import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getTaskStatus } from '@/lib/generation/kie'
import {
  getGenerationRunBundleForUser,
  saveGeneratedOutputForVariant,
  syncGenerationRunStatus,
  updateGenerationVariantStatus,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

function getResultFileName(taskId: string, workspace: 'image' | 'video') {
  return `${taskId}.${workspace === 'video' ? 'mp4' : 'png'}`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId } = await context.params
  const bundle = await getGenerationRunBundleForUser(user.id, runId)

  if (!bundle) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  if (bundle.run.status === 'rendering') {
    const activeVariants = bundle.run.variants.filter(
      (variant) => variant.status === 'rendering' && Boolean(variant.taskId),
    )

    await Promise.all(
      activeVariants.map(async (variant) => {
        if (!variant.taskId) {
          return
        }

        try {
          const taskState = await getTaskStatus({
            model: bundle.run.model,
            provider: bundle.run.provider,
            taskId: variant.taskId,
            workspace: bundle.run.workspace,
          })

          if (taskState.status === 'rendering') {
            return
          }

          if (taskState.status === 'error') {
            await updateGenerationVariantStatus({
              error: taskState.error ?? 'Generation failed upstream.',
              runId,
              status: 'error',
              taskId: variant.taskId,
            })
            return
          }

          if (!taskState.result || variant.resultAssetId) {
            return
          }

          await saveGeneratedOutputForVariant({
            fileName: getResultFileName(variant.taskId, bundle.run.workspace),
            fileType:
              taskState.result.type === 'video' ? 'video/mp4' : 'image/png',
            label: `Variation ${variant.variantIndex} Output`,
            runId,
            sourceUrl: taskState.result.url,
            userId: user.id,
            variantId: variant.id,
          })
        } catch (error) {
          await updateGenerationVariantStatus({
            error:
              error instanceof Error
                ? error.message
                : 'Unable to refresh generation status.',
            runId,
            status: 'error',
            taskId: variant.taskId,
          })
        }
      }),
    )

    await syncGenerationRunStatus(runId)
  }

  const refreshedBundle = await getGenerationRunBundleForUser(user.id, runId)

  if (!refreshedBundle) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  return NextResponse.json({
    run: createGenerationRunState(refreshedBundle.run, refreshedBundle.outputs),
  })
}
