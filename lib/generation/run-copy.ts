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
    return `${completed} of ${total} variation${total === 1 ? '' : 's'} completed successfully and were saved automatically.`
  }

  if (generationRun.status === 'cancelled') {
    return 'The active run was cancelled. Any completed outputs remain available in the library.'
  }

  if (generationRun.status === 'partial-success') {
    return `${completed} variation${completed === 1 ? '' : 's'} were saved and ${failed} failed.`
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

  return 'Add local references or a prompt, then generate a new batch.'
}

export function getGenerateButtonLabel(
  generationRun: GenerationRun,
  batchSize: BatchSize,
) {
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
    case 'rendering':
      return `${completed} of ${total} complete`
    case 'partial-success':
      return `${completed} saved, ${failed} failed`
    case 'success':
      return `${completed} variation${completed === 1 ? '' : 's'} saved`
    case 'error':
      return total > 0 ? 'Batch finished with no saved outputs' : 'Adjust inputs and run again'
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
    case 'rendering':
      return `Generating ${total} variation${total > 1 ? 's' : ''}`
    case 'partial-success':
      return `${completed} saved, ${failed} failed`
    case 'success':
      return `${completed} variation${completed > 1 ? 's are' : ' is'} ready`
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
    case 'rendering':
      return `${completed} of ${total} variation${total === 1 ? '' : 's'} have completed. The remaining tasks are polled every few seconds until they resolve.`
    case 'partial-success':
      return `${completed} successful variation${completed === 1 ? '' : 's'} were saved automatically. ${failed} variation${failed === 1 ? '' : 's'} failed.`
    case 'success':
      return 'Review the saved outputs below or open the flat library history when you want to revisit older generations.'
    case 'error':
      return (
        run.error ??
        'The provider rejected every variation in this batch. Adjust the inputs and generate again.'
      )
    case 'cancelled':
      return 'The run stopped early after a cancel request. Any completed outputs remain available.'
    default:
      return 'The app is polling the task status and will replace this panel with saved outputs as each variation finishes.'
  }
}
