import { and, desc, eq } from 'drizzle-orm'

import { getDatabase } from '@/lib/db/client'
import {
  generationRuns,
  generationVariants,
  savedOutputs,
} from '@/lib/db/schema'
import {
  deleteRunDirectory,
  deleteStoredFile,
  readStoredFileBuffer,
  saveOutputFileToDisk,
} from '@/lib/media/storage'
import {
  defaultProjectConfigSnapshot,
  normalizeProjectConfigSnapshot,
} from '@/lib/persistence/serialization'
import type {
  GenerationConfigSnapshot,
  GenerationRunBundle,
  GenerationRunRecord,
  GenerationVariantRecord,
  SavedOutputHistoryEntry,
  SavedOutputRecord,
} from '@/lib/persistence/types'
import type {
  GenerationRunStatus,
  GenerationVariantStatus,
} from '@/lib/generation/types'

function createRecordId(prefix: string) {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeConfigSnapshot(value: unknown): GenerationConfigSnapshot {
  if (!value || typeof value !== 'object') {
    return defaultProjectConfigSnapshot
  }

  return normalizeProjectConfigSnapshot({
    ...defaultProjectConfigSnapshot,
    ...(value as Partial<GenerationConfigSnapshot>),
  })
}

function mapSavedOutput(row: typeof savedOutputs.$inferSelect): SavedOutputRecord {
  return {
    createdAt: row.createdAt.toISOString(),
    fileSize: row.fileSize,
    id: row.id,
    label: row.label,
    mimeType: row.mimeType,
    originalName: row.originalName,
    runId: row.runId,
    storagePath: row.storagePath,
    userId: row.userId,
  }
}

function mapVariant(
  row: typeof generationVariants.$inferSelect,
): GenerationVariantRecord {
  return {
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    error: row.error,
    id: row.id,
    profile: row.profile,
    prompt: row.prompt,
    resultAssetId: row.resultAssetId,
    runId: row.runId,
    status: row.status as GenerationVariantStatus,
    taskId: row.taskId,
    variantIndex: row.variantIndex as GenerationVariantRecord['variantIndex'],
  }
}

function mapRun(
  row: typeof generationRuns.$inferSelect,
  variants: GenerationVariantRecord[],
): GenerationRunRecord {
  return {
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    configSnapshot: normalizeConfigSnapshot(row.configSnapshot),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    model: row.model,
    promptSnapshot: row.promptSnapshot,
    provider: row.provider as GenerationRunRecord['provider'],
    status: row.status as GenerationRunStatus,
    userId: row.userId,
    variants,
    workspace: row.workspace as GenerationRunRecord['workspace'],
  }
}

async function getVariantRowsForRun(runId: string) {
  const db = getDatabase()

  return db
    .select()
    .from(generationVariants)
    .where(eq(generationVariants.runId, runId))
    .orderBy(generationVariants.variantIndex)
}

async function getOutputRowsForRun(runId: string) {
  const db = getDatabase()

  return db
    .select()
    .from(savedOutputs)
    .where(eq(savedOutputs.runId, runId))
    .orderBy(desc(savedOutputs.createdAt))
}

export async function createGenerationRunForUser(input: {
  configSnapshot: GenerationConfigSnapshot
  model: string
  promptSnapshot: string
  provider: GenerationRunRecord['provider']
  runId: string
  status: GenerationRunRecord['status']
  userId: string
  workspace: GenerationRunRecord['workspace']
}) {
  const db = getDatabase()
  const [row] = await db
    .insert(generationRuns)
    .values({
      configSnapshot: input.configSnapshot,
      id: input.runId,
      model: input.model,
      promptSnapshot: input.promptSnapshot,
      provider: input.provider,
      status: input.status,
      userId: input.userId,
      workspace: input.workspace,
    })
    .returning()

  return mapRun(row, [])
}

export async function createGenerationVariantsForRun(
  runId: string,
  variants: Array<{
    error: string | null
    id: string
    profile: string
    prompt: string
    status: GenerationVariantRecord['status']
    taskId: string | null
    variantIndex: GenerationVariantRecord['variantIndex']
  }>,
) {
  const db = getDatabase()

  if (variants.length === 0) {
    return []
  }

  const rows = await db
    .insert(generationVariants)
    .values(
      variants.map((variant) => ({
        error: variant.error,
        id: variant.id,
        profile: variant.profile,
        prompt: variant.prompt,
        runId,
        status: variant.status,
        taskId: variant.taskId,
        variantIndex: variant.variantIndex,
      })),
    )
    .returning()

  return rows.map(mapVariant)
}

export async function getGenerationRunForUser(userId: string, runId: string) {
  const db = getDatabase()
  const [runRow] = await db
    .select()
    .from(generationRuns)
    .where(and(eq(generationRuns.userId, userId), eq(generationRuns.id, runId)))
    .limit(1)

  if (!runRow) {
    return null
  }

  const variantRows = await getVariantRowsForRun(runId)

  return mapRun(runRow, variantRows.map(mapVariant))
}

export async function getGenerationRunBundleForUser(
  userId: string,
  runId: string,
): Promise<GenerationRunBundle | null> {
  const run = await getGenerationRunForUser(userId, runId)

  if (!run) {
    return null
  }

  const outputs = await getOutputRowsForRun(runId)

  return {
    outputs: outputs.map(mapSavedOutput),
    run,
  }
}

export async function getSavedOutputForUser(userId: string, outputId: string) {
  const db = getDatabase()
  const [row] = await db
    .select()
    .from(savedOutputs)
    .where(and(eq(savedOutputs.userId, userId), eq(savedOutputs.id, outputId)))
    .limit(1)

  return row ? mapSavedOutput(row) : null
}

export async function listSavedOutputHistoryForUser(
  userId: string,
): Promise<SavedOutputHistoryEntry[]> {
  const db = getDatabase()
  const rows = await db
    .select({
      output: savedOutputs,
      run: generationRuns,
      variant: generationVariants,
    })
    .from(savedOutputs)
    .innerJoin(generationRuns, eq(savedOutputs.runId, generationRuns.id))
    .innerJoin(generationVariants, eq(generationVariants.resultAssetId, savedOutputs.id))
    .where(eq(savedOutputs.userId, userId))
    .orderBy(desc(savedOutputs.createdAt))

  return rows.map((row) => ({
    output: mapSavedOutput(row.output),
    run: {
      completedAt: row.run.completedAt ? row.run.completedAt.toISOString() : null,
      createdAt: row.run.createdAt.toISOString(),
      id: row.run.id,
      model: row.run.model,
      promptSnapshot: row.run.promptSnapshot,
      provider: row.run.provider as GenerationRunRecord['provider'],
      status: row.run.status as GenerationRunRecord['status'],
      workspace: row.run.workspace as GenerationRunRecord['workspace'],
    },
    variant: {
      completedAt: row.variant.completedAt ? row.variant.completedAt.toISOString() : null,
      createdAt: row.variant.createdAt.toISOString(),
      error: row.variant.error,
      id: row.variant.id,
      profile: row.variant.profile,
      prompt: row.variant.prompt,
      status: row.variant.status as GenerationVariantRecord['status'],
      taskId: row.variant.taskId,
      variantIndex: row.variant.variantIndex as GenerationVariantRecord['variantIndex'],
    },
  }))
}

export async function saveGeneratedOutputForVariant(input: {
  fileName: string
  fileType: string
  label: string
  runId: string
  sourceUrl: string
  userId: string
  variantId: string
}) {
  const db = getDatabase()
  const response = await fetch(input.sourceUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Unable to download generated media from ${input.sourceUrl}.`)
  }

  const blob = await response.blob()
  const savedFile = await saveOutputFileToDisk({
    file: blob,
    fileName: input.fileName,
    runId: input.runId,
    userId: input.userId,
  })

  const [outputRow] = await db
    .insert(savedOutputs)
    .values({
      fileSize: blob.size,
      id: createRecordId('output'),
      label: input.label,
      mimeType: input.fileType || 'application/octet-stream',
      originalName: input.fileName,
      runId: input.runId,
      storagePath: savedFile.storagePath,
      userId: input.userId,
    })
    .returning()

  await db
    .update(generationVariants)
    .set({
      completedAt: new Date(),
      error: null,
      resultAssetId: outputRow.id,
      status: 'success',
    })
    .where(
      and(
        eq(generationVariants.id, input.variantId),
        eq(generationVariants.runId, input.runId),
      ),
    )

  await syncGenerationRunStatus(input.runId)

  return mapSavedOutput(outputRow)
}

export async function updateGenerationVariantStatus(input: {
  error: string | null
  resultAssetId?: string | null
  runId: string
  status: GenerationVariantRecord['status']
  taskId: string
}) {
  const db = getDatabase()

  await db
    .update(generationVariants)
    .set({
      completedAt:
        input.status === 'success' ||
        input.status === 'error' ||
        input.status === 'cancelled'
          ? new Date()
          : null,
      error: input.error,
      resultAssetId:
        typeof input.resultAssetId === 'undefined'
          ? undefined
          : input.resultAssetId,
      status: input.status,
    })
    .where(
      and(
        eq(generationVariants.runId, input.runId),
        eq(generationVariants.taskId, input.taskId),
      ),
    )

  await syncGenerationRunStatus(input.runId)
}

export async function syncGenerationRunStatus(runId: string) {
  const db = getDatabase()
  const [runRow, variantRows] = await Promise.all([
    db
      .select()
      .from(generationRuns)
      .where(eq(generationRuns.id, runId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getVariantRowsForRun(runId),
  ])

  if (!runRow || variantRows.length === 0) {
    return null
  }

  let nextStatus: GenerationRunStatus

  if (runRow.status === 'cancelled') {
    nextStatus = 'cancelled'
  } else if (variantRows.some((variant) => variant.status === 'rendering')) {
    nextStatus = 'rendering'
  } else {
    const successCount = variantRows.filter((variant) => variant.status === 'success').length
    const errorCount = variantRows.filter((variant) => variant.status === 'error').length
    const cancelledCount = variantRows.filter(
      (variant) => variant.status === 'cancelled',
    ).length

    if (successCount === variantRows.length) {
      nextStatus = 'success'
    } else if (errorCount === variantRows.length) {
      nextStatus = 'error'
    } else if (cancelledCount === variantRows.length) {
      nextStatus = 'cancelled'
    } else {
      nextStatus = 'partial-success'
    }
  }

  const [updatedRun] = await db
    .update(generationRuns)
    .set({
      completedAt: nextStatus === 'rendering' ? null : new Date(),
      status: nextStatus,
    })
    .where(eq(generationRuns.id, runId))
    .returning()

  if (!updatedRun) {
    return null
  }

  return mapRun(updatedRun, variantRows.map(mapVariant))
}

export async function requestGenerationRunCancellation(input: {
  runId: string
  userId: string
}): Promise<GenerationRunBundle | null> {
  const db = getDatabase()
  const [runRow] = await db
    .select()
    .from(generationRuns)
    .where(and(eq(generationRuns.userId, input.userId), eq(generationRuns.id, input.runId)))
    .limit(1)

  if (!runRow) {
    return null
  }

  if (runRow.status === 'rendering') {
    const now = new Date()

    await db
      .update(generationVariants)
      .set({
        completedAt: now,
        error: 'Run cancelled.',
        status: 'cancelled',
      })
      .where(
        and(
          eq(generationVariants.runId, input.runId),
          eq(generationVariants.status, 'rendering'),
        ),
      )

    await db
      .update(generationRuns)
      .set({
        completedAt: now,
        status: 'cancelled',
      })
      .where(eq(generationRuns.id, input.runId))
  }

  return getGenerationRunBundleForUser(input.userId, input.runId)
}

export async function deleteSavedOutputForUser(input: {
  outputId: string
  userId: string
}) {
  const db = getDatabase()
  const [outputRow] = await db
    .select()
    .from(savedOutputs)
    .where(and(eq(savedOutputs.userId, input.userId), eq(savedOutputs.id, input.outputId)))
    .limit(1)

  if (!outputRow) {
    return null
  }

  await db
    .update(generationVariants)
    .set({
      resultAssetId: null,
    })
    .where(eq(generationVariants.resultAssetId, outputRow.id))

  await db.delete(savedOutputs).where(eq(savedOutputs.id, outputRow.id))
  await deleteStoredFile(outputRow.storagePath)

  const [remainingOutput] = await db
    .select({ id: savedOutputs.id })
    .from(savedOutputs)
    .where(eq(savedOutputs.runId, outputRow.runId))
    .limit(1)

  if (!remainingOutput) {
    const [deletedRun] = await db
      .delete(generationRuns)
      .where(
        and(
          eq(generationRuns.id, outputRow.runId),
          eq(generationRuns.userId, input.userId),
        ),
      )
      .returning()

    if (deletedRun) {
      await deleteRunDirectory(input.userId, outputRow.runId)
    }
  }

  return mapSavedOutput(outputRow)
}

export async function loadSavedOutputFile(input: {
  outputId: string
  userId: string
}) {
  const output = await getSavedOutputForUser(input.userId, input.outputId)

  if (!output) {
    throw new Error('Saved output could not be found.')
  }

  const buffer = await readStoredFileBuffer(output.storagePath)

  return {
    file: new File([buffer], output.originalName, {
      type: output.mimeType,
    }),
    output,
  }
}

export function getMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
}
