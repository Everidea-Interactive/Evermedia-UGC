import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getTaskStatus } from '@/lib/generation/kie'
import { splitImageGridBuffer } from '@/lib/media/image-grid'
import {
  deleteGenerationRunForUser,
  getGenerationRunBundleForUser,
  saveGeneratedOutputBufferForVariant,
  saveGeneratedOutputForVariant,
  syncGenerationRunStatus,
  updateGenerationVariantStatus,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

function getResultFileName(taskId: string, workspace: 'image' | 'video') {
  return `${taskId}.${workspace === 'video' ? 'mp4' : 'png'}`
}

function isManualImageGridRun(bundle: NonNullable<Awaited<ReturnType<typeof getGenerationRunBundleForUser>>>) {
  return (
    bundle.run.workspace === 'image' &&
    bundle.run.configSnapshot.experience === 'manual'
  )
}

async function downloadGeneratedOutputBuffer(sourceUrl: string) {
  const response = await fetch(sourceUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Unable to download generated media from ${sourceUrl}.`)
  }

  return Buffer.from(await response.arrayBuffer())
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
    const shouldSplitImageGrid = isManualImageGridRun(bundle)
    const variantGroups = shouldSplitImageGrid
      ? Array.from(
          activeVariants.reduce((groups, variant) => {
            if (!variant.taskId) {
              return groups
            }

            const existing = groups.get(variant.taskId) ?? []
            existing.push(variant)
            groups.set(variant.taskId, existing)

            return groups
          }, new Map<string, typeof activeVariants>()),
        ).map(([, variants]) => variants)
      : activeVariants.map((variant) => [variant])

    await Promise.all(
      variantGroups.map(async (variants) => {
        const variant = variants[0]

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

          if (
            shouldSplitImageGrid &&
            variants.length === 4 &&
            taskState.result.type === 'image'
          ) {
            const gridBuffer = await downloadGeneratedOutputBuffer(taskState.result.url)
            const quadrants = await splitImageGridBuffer(gridBuffer)
            const orderedVariants = variants
              .slice()
              .sort((left, right) => left.variantIndex - right.variantIndex)

            await Promise.all(
              orderedVariants.map(async (gridVariant, index) => {
                const quadrant = quadrants[index]

                if (!quadrant) {
                  throw new Error('Generated grid image did not split into four outputs.')
                }

                await saveGeneratedOutputBufferForVariant({
                  buffer: quadrant.buffer,
                  fileName: `${variant.taskId}-variation-${gridVariant.variantIndex}.png`,
                  fileType: 'image/png',
                  label: `Variation ${gridVariant.variantIndex} Output`,
                  runId,
                  userId: user.id,
                  variantId: gridVariant.id,
                })
              }),
            )
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
    configSnapshot: refreshedBundle.run.configSnapshot,
    run: createGenerationRunState(refreshedBundle.run, refreshedBundle.outputs),
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId } = await context.params
  const run = await deleteGenerationRunForUser({
    runId,
    userId: user.id,
  })

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  return NextResponse.json({ runId: run.id })
}
