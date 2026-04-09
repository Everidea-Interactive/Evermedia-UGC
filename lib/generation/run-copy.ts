import type { BatchSize, GenerationRun } from '@/lib/generation/types'

export function getCompletedVariantCount(run: GenerationRun) {
  return run.variants.filter((variant) => variant.status === 'success').length
}

export function getFailedVariantCount(run: GenerationRun) {
  return run.variants.filter((variant) => variant.status === 'error').length
}

export function getActiveTaskCount(run: GenerationRun) {
  return run.variants.filter(
    (variant) => variant.status === 'rendering' && Boolean(variant.taskId),
  ).length
}

export function getLinkedTaskCount(run: GenerationRun) {
  return run.variants.filter((variant) => Boolean(variant.taskId)).length
}

export function getGenerationHelperMessage(
  disabledReason: string | null,
  generationRun: GenerationRun,
) {
  if (disabledReason) {
    return disabledReason
  }

  const total = generationRun.variants.length
  const completed = getCompletedVariantCount(generationRun)
  const failed = getFailedVariantCount(generationRun)

  if (generationRun.status === 'success') {
    return `${completed} of ${total} variation${total === 1 ? '' : 's'} completed successfully.`
  }

  if (generationRun.status === 'cancelled') {
    return 'The run was cancelled. Completed outputs remain reviewable and you can generate again when ready.'
  }

  if (generationRun.status === 'partial-success') {
    return `${completed} variation${completed === 1 ? '' : 's'} finished and ${failed} failed. Review the completed outputs below, then generate again when you want another batch.`
  }

  if (generationRun.status === 'error') {
    if (total > 0) {
      return (
        generationRun.error ??
        `All ${total} variations failed. Adjust the brief and generate again.`
      )
    }

    return generationRun.error ?? 'The last run failed. Adjust inputs and generate again.'
  }

  if (generationRun.status === 'rendering') {
    return `${completed} of ${total} variation${total === 1 ? '' : 's'} completed so far. The remaining tasks are still rendering.`
  }

  if (generationRun.status === 'queued') {
    return 'The run is queued for the background worker and will continue even if you close the browser.'
  }

  if (generationRun.status === 'submitting') {
    return 'The server is creating parallel provider tasks for the selected batch.'
  }

  if (generationRun.status === 'uploading') {
    return 'Local references are uploading once and will be reused across every variation.'
  }

  return 'Use the reference board first, then generate from this panel.'
}

export function getGenerateButtonLabel(
  generationRun: GenerationRun,
  batchSize: BatchSize,
) {
  if (generationRun.status === 'queued') {
    return `Queued ${batchSize} Variation${batchSize > 1 ? 's' : ''}`
  }

  if (generationRun.status === 'uploading') {
    return 'Uploading References'
  }

  if (generationRun.status === 'submitting') {
    return `Creating ${batchSize} Variation${batchSize > 1 ? 's' : ''}`
  }

  if (generationRun.status === 'rendering') {
    const total = generationRun.variants.length || batchSize
    const completed = getCompletedVariantCount(generationRun)

    return completed > 0
      ? `${completed} of ${total} Complete`
      : `Generating ${total} Variation${total > 1 ? 's' : ''}`
  }

  if (
    generationRun.status === 'partial-success' ||
    generationRun.status === 'error' ||
    generationRun.status === 'cancelled' ||
    generationRun.status === 'success'
  ) {
    return 'Generate Again'
  }

  return `Generate ${batchSize} Variation${batchSize > 1 ? 's' : ''}`
}

export function getRunHelperText(run: GenerationRun) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'queued':
      return 'Queued for the background worker'
    case 'uploading':
      return 'Uploading shared references once'
    case 'submitting':
      return 'Creating batched provider tasks'
    case 'rendering':
      return `${completed} of ${total} complete`
    case 'partial-success':
      return `${completed} complete, ${failed} failed`
    case 'success':
      return `${completed} variation${completed === 1 ? '' : 's'} ready`
    case 'error':
      return total > 0
        ? 'Batch finished with no usable outputs'
        : 'Adjust inputs and run again'
    case 'cancelled':
      return 'Run cancelled'
    default:
      return 'No active render'
  }
}

export function getRunHeadline(run: GenerationRun) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'queued':
      return `Queued ${total || 1} variation${(total || 1) > 1 ? 's' : ''}`
    case 'uploading':
      return 'Uploading local references'
    case 'submitting':
      return `Submitting ${total || 1} KIE variation${(total || 1) > 1 ? 's' : ''}`
    case 'rendering':
      return `Generating ${total} variation${total > 1 ? 's' : ''}`
    case 'partial-success':
      return `${completed} ready, ${failed} failed`
    case 'success':
      return `${completed} variation${completed > 1 ? 's are' : ' is'} ready for review`
    case 'error':
      return total > 0 ? 'No usable outputs in this batch' : 'Generation stopped before completion'
    case 'cancelled':
      return 'Generation was cancelled'
    default:
      return 'Rendering media on KIE'
  }
}

export function getRunBodyCopy(run: GenerationRun) {
  const total = run.variants.length
  const completed = getCompletedVariantCount(run)
  const failed = getFailedVariantCount(run)

  switch (run.status) {
    case 'queued':
      return 'This run is persisted in Postgres and waiting for the generation worker to claim it.'
    case 'uploading':
      return 'Your browser-local images are being uploaded to temporary KIE file storage before task submission.'
    case 'submitting':
      return 'The server is compiling deterministic prompt variants and creating the provider tasks in parallel.'
    case 'rendering':
      return `${completed} of ${total} variation${total === 1 ? '' : 's'} have completed. The remaining tasks are polled every three seconds until they resolve or time out.`
    case 'partial-success':
      return `${completed} successful variation${completed === 1 ? '' : 's'} remain reviewable in the spotlight. ${failed} variation${failed === 1 ? '' : 's'} failed and stay visible below for debugging.`
    case 'success':
      return 'Review the spotlight output, switch between finished variations below, and generate again when you want a new batch.'
    case 'error':
      return (
        run.error ??
        'The provider rejected every variation in this batch. Adjust the inputs and generate again.'
      )
    case 'cancelled':
      return 'The run stopped early after a cancel request. Any finished outputs remain available for review.'
    default:
      return 'The app is polling the task status every three seconds and will swap this canvas to the finished result when the provider completes.'
  }
}
