import 'server-only'

import {
  getTaskStatus,
  submitVariantTaskForRun,
  uploadPersistedAssets,
} from '@/lib/generation/kie'
import type { GenerationRunRecord } from '@/lib/persistence/types'
import {
  assignGenerationVariantTask,
  claimGenerationRunById,
  claimNextGenerationRun,
  getClaimedGenerationRun,
  heartbeatGenerationRunLease,
  loadPersistedAssetFile,
  markGenerationRunCancelled,
  markGenerationRunError,
  releaseGenerationRunLease,
  saveGeneratedOutputForVariant,
  syncGenerationRunStatus,
  updateGenerationRunLifecycle,
  updateGenerationRunUploadedAssets,
  updateGenerationVariantById,
  updateGenerationVariantStatus,
} from '@/lib/persistence/repository'

const workerLeaseMs = 15_000
const taskPollIntervalMs = 3_000
const taskPollTimeoutMs = 10 * 60 * 1_000
const idlePollMs = 2_000

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getResultFileName(taskId: string, workspace: GenerationRunRecord['workspace']) {
  return `${taskId}.${workspace === 'video' ? 'mp4' : 'png'}`
}

async function refreshLease(workerId: string, runId: string) {
  await heartbeatGenerationRunLease({
    leaseMs: workerLeaseMs,
    runId,
    workerId,
  })
}

async function resolveRunForWorker(workerId: string, runId: string) {
  const run = await getClaimedGenerationRun({
    runId,
    workerId,
  })

  if (!run) {
    throw new Error('Claimed run could not be reloaded from persistence.')
  }

  return run
}

async function ensureUploadedAssets(workerId: string, run: GenerationRunRecord) {
  if (run.assetManifest.length === 0) {
    return []
  }

  if (run.uploadedAssets.length === run.assetManifest.length) {
    return run.uploadedAssets
  }

  await updateGenerationRunLifecycle({
    runId: run.id,
    status: 'uploading',
  })
  await refreshLease(workerId, run.id)

  const resolvedAssets = await Promise.all(
    run.assetManifest.map(async (descriptor) => {
      if (!descriptor.persistedAssetId) {
        throw new Error(`Asset ${descriptor.label} is not persisted to the project yet.`)
      }

      const { file } = await loadPersistedAssetFile({
        assetId: descriptor.persistedAssetId,
        projectId: run.projectId,
        userId: run.userId,
      })

      return {
        ...descriptor,
        file,
      }
    }),
  )

  const uploadedAssets = await uploadPersistedAssets({
    assetDescriptors: resolvedAssets,
    workspace: run.workspace,
  })

  await updateGenerationRunUploadedAssets({
    runId: run.id,
    uploadedAssets,
  })

  return uploadedAssets
}

async function submitQueuedVariants(workerId: string, run: GenerationRunRecord) {
  const queuedVariants = run.variants.filter(
    (variant) => variant.status === 'queued' && !variant.taskId,
  )

  if (queuedVariants.length === 0) {
    return
  }

  await updateGenerationRunLifecycle({
    runId: run.id,
    status: 'submitting',
  })
  await refreshLease(workerId, run.id)

  const uploadedAssets = await ensureUploadedAssets(workerId, run)
  const settled = await Promise.allSettled(
    queuedVariants.map(async (variant) => {
      const submitted = await submitVariantTaskForRun({
        assets: uploadedAssets,
        cameraMovement:
          run.workspace === 'video' ? run.configSnapshot.cameraMovement : null,
        creativeStyle: run.configSnapshot.creativeStyle,
        imageModel: run.configSnapshot.imageModel,
        outputQuality: run.configSnapshot.outputQuality,
        productCategory: run.configSnapshot.productCategory,
        prompt: variant.prompt,
        subjectMode: run.configSnapshot.subjectMode,
        videoDuration: run.configSnapshot.videoDuration,
        videoModel: run.configSnapshot.videoModel,
        workspace: run.workspace,
      })

      return {
        ...submitted,
        variantId: variant.id,
      }
    }),
  )

  for (const [index, settledVariant] of settled.entries()) {
    const queuedVariant = queuedVariants[index]

    if (!queuedVariant) {
      continue
    }

    if (settledVariant.status === 'fulfilled') {
      await assignGenerationVariantTask({
        runId: run.id,
        taskId: settledVariant.value.taskId,
        userId: run.userId,
        variantId: queuedVariant.id,
      })
      continue
    }

    await updateGenerationVariantById({
      completedAt: new Date(),
      error:
        settledVariant.reason instanceof Error
          ? settledVariant.reason.message
          : 'Unable to create provider task.',
      runId: run.id,
      status: 'error',
      variantId: queuedVariant.id,
    })
  }

  await syncGenerationRunStatus(run.id)
}

async function pollRenderingVariants(workerId: string, run: GenerationRunRecord) {
  const startedAt = Date.parse(run.createdAt)

  while (true) {
    await refreshLease(workerId, run.id)
    const currentRun = await resolveRunForWorker(workerId, run.id)

    if (currentRun.cancelRequestedAt) {
      await markGenerationRunCancelled({
        runId: currentRun.id,
      })
      return
    }

    const activeVariants = currentRun.variants.filter(
      (variant) => variant.status === 'rendering' && Boolean(variant.taskId),
    )

    if (activeVariants.length === 0) {
      return
    }

    if (Date.now() - startedAt > taskPollTimeoutMs) {
      await markGenerationRunError({
        error:
          'Generation timed out after 10 minutes. Adjust the inputs and generate again.',
        runId: currentRun.id,
        userId: currentRun.userId,
      })
      return
    }

    await updateGenerationRunLifecycle({
      runId: currentRun.id,
      status: 'rendering',
    })

    for (const variant of activeVariants) {
      await refreshLease(workerId, currentRun.id)

      const taskState = await getTaskStatus({
        model: currentRun.model,
        provider: currentRun.provider,
        taskId: variant.taskId ?? '',
        workspace: currentRun.workspace,
      })

      if (taskState.status === 'rendering') {
        continue
      }

      if (taskState.status === 'error') {
        await updateGenerationVariantStatus({
          error: taskState.error ?? 'Generation failed upstream.',
          runId: currentRun.id,
          status: 'error',
          taskId: variant.taskId ?? '',
          userId: currentRun.userId,
        })
        continue
      }

      if (taskState.result) {
        await saveGeneratedOutputForVariant({
          fileName: getResultFileName(variant.taskId ?? variant.id, currentRun.workspace),
          fileType:
            taskState.result.type === 'video' ? 'video/mp4' : 'image/png',
          label: `Variation ${variant.variantIndex} Output`,
          projectId: currentRun.projectId,
          runId: currentRun.id,
          sourceUrl: taskState.result.url,
          userId: currentRun.userId,
          variantId: variant.id,
        })
      }
    }

    await syncGenerationRunStatus(currentRun.id)
    await sleep(taskPollIntervalMs)
  }
}

async function processClaimedRun(workerId: string, claimedRun: GenerationRunRecord) {
  try {
    let run = await resolveRunForWorker(workerId, claimedRun.id)

    if (run.cancelRequestedAt) {
      await markGenerationRunCancelled({
        runId: run.id,
      })
      return
    }

    await ensureUploadedAssets(workerId, run)
    run = await resolveRunForWorker(workerId, run.id)

    if (run.cancelRequestedAt) {
      await markGenerationRunCancelled({
        runId: run.id,
      })
      return
    }

    await submitQueuedVariants(workerId, run)
    run = await resolveRunForWorker(workerId, run.id)

    if (run.cancelRequestedAt) {
      await markGenerationRunCancelled({
        runId: run.id,
      })
      return
    }

    await pollRenderingVariants(workerId, run)
  } catch (error) {
    await markGenerationRunError({
      error:
        error instanceof Error
          ? error.message
          : 'Worker failed while processing the queued generation run.',
      runId: claimedRun.id,
      userId: claimedRun.userId,
    }).catch(() => undefined)
  } finally {
    await releaseGenerationRunLease({
      runId: claimedRun.id,
      workerId,
    }).catch(() => undefined)
  }
}

export async function runGenerationWorkerCycle(workerId: string) {
  const claimedRun = await claimNextGenerationRun(workerId, workerLeaseMs)

  if (!claimedRun) {
    return false
  }

  await processClaimedRun(workerId, claimedRun)

  return true
}

export async function runGenerationWorkerCycleForRun(
  runId: string,
  workerId: string,
) {
  const claimedRun = await claimGenerationRunById({
    leaseMs: workerLeaseMs,
    runId,
    workerId,
  })

  if (!claimedRun) {
    return false
  }

  await processClaimedRun(workerId, claimedRun)

  return true
}

export async function runGenerationWorker(workerId: string) {
  while (true) {
    const didWork = await runGenerationWorkerCycle(workerId)

    if (!didWork) {
      await sleep(idlePollMs)
    }
  }
}
