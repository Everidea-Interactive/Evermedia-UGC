import { and, asc, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm'

import { getDatabase } from '@/lib/db/client'
import {
  generationRuns,
  generationVariants,
  projectAssets,
  projects,
} from '@/lib/db/schema'
import {
  deleteProjectDirectory,
  deleteStoredFile,
  duplicateStoredFile,
  readStoredFileBuffer,
  saveFileToDisk,
} from '@/lib/media/storage'
import {
  defaultProjectConfigSnapshot,
  getProductSlotKey,
  normalizeProjectConfigSnapshot,
} from '@/lib/persistence/serialization'
import type {
  GenerationRunRecord,
  GenerationVariantRecord,
  ProjectAssetKind,
  ProjectAssetRecord,
  ProjectConfigSnapshot,
  ProjectLibraryRecord,
  ProjectRecord,
  ProjectSlotKey,
  StudioProjectRecord,
} from '@/lib/persistence/types'
import type {
  GenerationReviewStatus,
  GenerationRunStatus,
  GenerationVariantIndex,
  GenerationVariantStatus,
  SubmittedAssetDescriptor,
  UploadedAssetDescriptor,
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

function normalizeConfigSnapshot(value: unknown): ProjectConfigSnapshot {
  if (!value || typeof value !== 'object') {
    return defaultProjectConfigSnapshot
  }

  return normalizeProjectConfigSnapshot({
    ...defaultProjectConfigSnapshot,
    ...(value as Partial<ProjectConfigSnapshot>),
  })
}

function normalizeAssetManifest(value: unknown): SubmittedAssetDescriptor[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is SubmittedAssetDescriptor =>
      Boolean(entry) && typeof entry === 'object' && 'fieldName' in entry,
  )
}

function normalizeUploadedAssets(value: unknown): UploadedAssetDescriptor[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is UploadedAssetDescriptor =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      'fieldName' in entry &&
      'remoteUrl' in entry,
  )
}

function mapProject(row: typeof projects.$inferSelect): ProjectRecord {
  return {
    configSnapshot: normalizeConfigSnapshot(row.configSnapshot),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
  }
}

function mapAsset(row: typeof projectAssets.$inferSelect): ProjectAssetRecord {
  return {
    createdAt: row.createdAt.toISOString(),
    fileSize: row.fileSize,
    id: row.id,
    kind: row.kind as ProjectAssetKind,
    label: row.label,
    mimeType: row.mimeType,
    originalName: row.originalName,
    projectId: row.projectId,
    slotKey: row.slotKey as ProjectSlotKey | null,
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
    isHero: row.isHero,
    profile: row.profile,
    prompt: row.prompt,
    reviewNotes: row.reviewNotes,
    reviewStatus: row.reviewStatus as GenerationReviewStatus,
    resultAssetId: row.resultAssetId,
    runId: row.runId,
    selectedForDelivery: row.selectedForDelivery,
    status: row.status as GenerationVariantStatus,
    taskId: row.taskId,
    variantIndex: row.variantIndex as GenerationVariantIndex,
  }
}

function mapRun(
  row: typeof generationRuns.$inferSelect,
  variants: GenerationVariantRecord[],
): GenerationRunRecord {
  return {
    assetManifest: normalizeAssetManifest(row.assetManifest),
    attemptCount: row.attemptCount,
    cancelRequestedAt: row.cancelRequestedAt
      ? row.cancelRequestedAt.toISOString()
      : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    configSnapshot: normalizeConfigSnapshot(row.configSnapshot),
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    lastHeartbeatAt: row.lastHeartbeatAt
      ? row.lastHeartbeatAt.toISOString()
      : null,
    leaseExpiresAt: row.leaseExpiresAt ? row.leaseExpiresAt.toISOString() : null,
    leaseOwner: row.leaseOwner,
    model: row.model,
    parentRunId: row.parentRunId,
    projectId: row.projectId,
    promptSnapshot: row.promptSnapshot,
    provider: row.provider as GenerationRunRecord['provider'],
    status: row.status as GenerationRunStatus,
    uploadedAssets: normalizeUploadedAssets(row.uploadedAssets),
    userId: row.userId,
    variants,
    workspace: row.workspace as GenerationRunRecord['workspace'],
  }
}

async function getProjectRowsForUser(userId: string) {
  const db = getDatabase()

  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.lastOpenedAt), desc(projects.updatedAt))
}

async function getVariantRowsForRun(runId: string) {
  const db = getDatabase()

  return db
    .select()
    .from(generationVariants)
    .where(eq(generationVariants.runId, runId))
    .orderBy(generationVariants.variantIndex)
}

async function getRunRowsForProject(userId: string, projectId: string) {
  const db = getDatabase()

  return db
    .select()
    .from(generationRuns)
    .where(and(eq(generationRuns.userId, userId), eq(generationRuns.projectId, projectId)))
    .orderBy(desc(generationRuns.createdAt))
}

export async function listProjectsForUser(userId: string) {
  const rows = await getProjectRowsForUser(userId)

  return rows.map(mapProject)
}

export async function getProjectForUser(userId: string, projectId: string) {
  const db = getDatabase()
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .limit(1)

  return row ? mapProject(row) : null
}

export async function touchProjectForUser(userId: string, projectId: string) {
  const db = getDatabase()

  await db
    .update(projects)
    .set({
      lastOpenedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
}

export async function createProjectForUser(input: {
  configSnapshot?: ProjectConfigSnapshot
  name?: string
  userId: string
}) {
  const db = getDatabase()
  const id = createRecordId('project')
  const now = new Date()
  const [row] = await db
    .insert(projects)
    .values({
      configSnapshot: input.configSnapshot ?? defaultProjectConfigSnapshot,
      id,
      lastOpenedAt: now,
      name: input.name?.trim() || 'Untitled Project',
      updatedAt: now,
      userId: input.userId,
    })
    .returning()

  return mapProject(row)
}

export async function updateProjectForUser(input: {
  configSnapshot?: ProjectConfigSnapshot
  lastOpenedAt?: Date
  name?: string
  projectId: string
  userId: string
}) {
  const db = getDatabase()
  const updatePayload: Partial<typeof projects.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.configSnapshot) {
    updatePayload.configSnapshot = input.configSnapshot
  }

  if (typeof input.name === 'string' && input.name.trim()) {
    updatePayload.name = input.name.trim()
  }

  if (input.lastOpenedAt) {
    updatePayload.lastOpenedAt = input.lastOpenedAt
  }

  const [row] = await db
    .update(projects)
    .set(updatePayload)
    .where(and(eq(projects.userId, input.userId), eq(projects.id, input.projectId)))
    .returning()

  return row ? mapProject(row) : null
}

export async function deleteProjectForUser(userId: string, projectId: string) {
  const db = getDatabase()
  const assets = await db
    .select()
    .from(projectAssets)
    .where(
      and(eq(projectAssets.userId, userId), eq(projectAssets.projectId, projectId)),
    )

  const [deletedProject] = await db
    .delete(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)))
    .returning()

  if (!deletedProject) {
    return null
  }

  for (const asset of assets) {
    await deleteStoredFile(asset.storagePath)
  }

  await deleteProjectDirectory(userId, projectId)

  return mapProject(deletedProject)
}

export async function duplicateProjectForUser(userId: string, projectId: string) {
  const sourceProject = await getProjectForUser(userId, projectId)

  if (!sourceProject) {
    return null
  }

  const duplicatedProject = await createProjectForUser({
    configSnapshot: sourceProject.configSnapshot,
    name: `${sourceProject.name} Copy`,
    userId,
  })
  const db = getDatabase()
  const sourceAssets = await db
    .select()
    .from(projectAssets)
    .where(
      and(eq(projectAssets.userId, userId), eq(projectAssets.projectId, projectId)),
    )

  for (const asset of sourceAssets) {
    const copiedFile = await duplicateStoredFile({
      fileName: asset.originalName,
      folder: asset.kind === 'output' ? 'outputs' : 'references',
      projectId: duplicatedProject.id,
      sourceStoragePath: asset.storagePath,
      userId,
    })

    await db.insert(projectAssets).values({
      fileSize: asset.fileSize,
      id: createRecordId('asset'),
      kind: asset.kind,
      label: asset.label,
      mimeType: asset.mimeType,
      originalName: asset.originalName,
      projectId: duplicatedProject.id,
      slotKey: asset.slotKey,
      storagePath: copiedFile.storagePath,
      userId,
    })
  }

  return duplicatedProject
}

export async function listProjectAssetsForUser(
  userId: string,
  projectId: string,
) {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(projectAssets)
    .where(
      and(eq(projectAssets.userId, userId), eq(projectAssets.projectId, projectId)),
    )
    .orderBy(desc(projectAssets.createdAt))

  return rows.map(mapAsset)
}

export async function getProjectAssetForUser(userId: string, assetId: string) {
  const db = getDatabase()
  const [row] = await db
    .select()
    .from(projectAssets)
    .where(and(eq(projectAssets.userId, userId), eq(projectAssets.id, assetId)))
    .limit(1)

  return row ? mapAsset(row) : null
}

async function removeExistingReferenceAsset(input: {
  projectId: string
  slotKey: ProjectSlotKey
  userId: string
}) {
  const db = getDatabase()
  const [existingAsset] = await db
    .select()
    .from(projectAssets)
    .where(
      and(
        eq(projectAssets.userId, input.userId),
        eq(projectAssets.projectId, input.projectId),
        eq(projectAssets.kind, 'reference'),
        eq(projectAssets.slotKey, input.slotKey),
      ),
    )
    .limit(1)

  if (!existingAsset) {
    return null
  }

  await db.delete(projectAssets).where(eq(projectAssets.id, existingAsset.id))

  return mapAsset(existingAsset)
}

export async function replaceProjectReferenceAsset(input: {
  file: File
  label: string
  projectId: string
  slotKey: ProjectSlotKey
  userId: string
}) {
  const db = getDatabase()
  const savedFile = await saveFileToDisk({
    file: input.file,
    fileName: input.file.name,
    folder: 'references',
    projectId: input.projectId,
    userId: input.userId,
  })
  const removedAsset = await removeExistingReferenceAsset(input)
  const [row] = await db
    .insert(projectAssets)
    .values({
      fileSize: input.file.size,
      id: createRecordId('asset'),
      kind: 'reference',
      label: input.label,
      mimeType: input.file.type || 'application/octet-stream',
      originalName: input.file.name,
      projectId: input.projectId,
      slotKey: input.slotKey,
      storagePath: savedFile.storagePath,
      userId: input.userId,
    })
    .returning()

  if (removedAsset) {
    await deleteStoredFile(removedAsset.storagePath)
  }

  return mapAsset(row)
}

export async function deleteProjectAssetForUser(input: {
  assetId: string
  projectId: string
  userId: string
}) {
  const db = getDatabase()
  const [row] = await db
    .delete(projectAssets)
    .where(
      and(
        eq(projectAssets.userId, input.userId),
        eq(projectAssets.projectId, input.projectId),
        eq(projectAssets.id, input.assetId),
      ),
    )
    .returning()

  if (!row) {
    return null
  }

  await deleteStoredFile(row.storagePath)

  return mapAsset(row)
}

export async function clearProjectReferenceAssets(userId: string, projectId: string) {
  const db = getDatabase()
  const rows = await db
    .select()
    .from(projectAssets)
    .where(
      and(
        eq(projectAssets.userId, userId),
        eq(projectAssets.projectId, projectId),
        eq(projectAssets.kind, 'reference'),
      ),
    )

  if (rows.length === 0) {
    return []
  }

  await db
    .delete(projectAssets)
    .where(
      and(
        eq(projectAssets.userId, userId),
        eq(projectAssets.projectId, projectId),
        eq(projectAssets.kind, 'reference'),
      ),
    )

  for (const row of rows) {
    await deleteStoredFile(row.storagePath)
  }

  return rows.map(mapAsset)
}

export async function saveGeneratedOutputForVariant(input: {
  fileName: string
  fileType: string
  label: string
  projectId: string
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
  const savedFile = await saveFileToDisk({
    file: blob,
    fileName: input.fileName,
    folder: 'outputs',
    projectId: input.projectId,
    userId: input.userId,
  })
  const [assetRow] = await db
    .insert(projectAssets)
    .values({
      fileSize: blob.size,
      id: createRecordId('asset'),
      kind: 'output',
      label: input.label,
      mimeType: input.fileType || 'application/octet-stream',
      originalName: input.fileName,
      projectId: input.projectId,
      slotKey: null,
      storagePath: savedFile.storagePath,
      userId: input.userId,
    })
    .returning()

  await db
    .update(generationVariants)
    .set({
      completedAt: new Date(),
      error: null,
      resultAssetId: assetRow.id,
      status: 'success',
    })
    .where(
      and(
        eq(generationVariants.id, input.variantId),
        eq(generationVariants.runId, input.runId),
      ),
    )

  await syncGenerationRunStatus(input.runId)

  return mapAsset(assetRow)
}

export async function createGenerationRunForUser(input: {
  assetManifest: SubmittedAssetDescriptor[]
  configSnapshot: ProjectConfigSnapshot
  model: string
  parentRunId?: string | null
  projectId: string
  promptSnapshot: string
  provider: GenerationRunRecord['provider']
  runId: string
  status: GenerationRunRecord['status']
  uploadedAssets?: UploadedAssetDescriptor[]
  userId: string
  workspace: GenerationRunRecord['workspace']
}) {
  const db = getDatabase()
  const [row] = await db
    .insert(generationRuns)
    .values({
      assetManifest: input.assetManifest,
      configSnapshot: input.configSnapshot,
      id: input.runId,
      model: input.model,
      parentRunId: input.parentRunId ?? null,
      projectId: input.projectId,
      promptSnapshot: input.promptSnapshot,
      provider: input.provider,
      status: input.status,
      uploadedAssets: input.uploadedAssets ?? [],
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
        reviewStatus: 'pending',
        runId,
        selectedForDelivery: false,
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

export async function getProjectGenerationRunForUser(input: {
  projectId: string
  runId: string
  userId: string
}) {
  const db = getDatabase()
  const [row] = await db
    .select()
    .from(generationRuns)
    .where(
      and(
        eq(generationRuns.userId, input.userId),
        eq(generationRuns.projectId, input.projectId),
        eq(generationRuns.id, input.runId),
      ),
    )
    .limit(1)

  if (!row) {
    return null
  }

  const variantRows = await getVariantRowsForRun(row.id)

  return mapRun(row, variantRows.map(mapVariant))
}

export async function getGenerationVariantForTask(input: {
  runId: string
  taskId: string
  userId: string
}) {
  const db = getDatabase()
  const [row] = await db
    .select({
      run: generationRuns,
      variant: generationVariants,
    })
    .from(generationVariants)
    .innerJoin(generationRuns, eq(generationVariants.runId, generationRuns.id))
    .where(
      and(
        eq(generationRuns.userId, input.userId),
        eq(generationRuns.id, input.runId),
        eq(generationVariants.taskId, input.taskId),
      ),
    )
    .limit(1)

  if (!row) {
    return null
  }

  return {
    run: mapRun(row.run, []),
    variant: mapVariant(row.variant),
  }
}

export async function markGenerationRunError(input: {
  error: string
  runId: string
  userId: string
}) {
  const db = getDatabase()

  await db
    .update(generationRuns)
    .set({
      completedAt: new Date(),
      status: 'error',
    })
    .where(and(eq(generationRuns.userId, input.userId), eq(generationRuns.id, input.runId)))

  await db
    .update(generationVariants)
    .set({
      completedAt: new Date(),
      error: input.error,
      status: 'error',
    })
    .where(
      and(
        eq(generationVariants.runId, input.runId),
        inArray(generationVariants.status, [
          'queued',
          'submitting',
          'rendering',
        ]),
      ),
    )
}

export async function updateGenerationRunLifecycle(input: {
  runId: string
  status: Exclude<GenerationRunStatus, 'idle' | 'partial-success' | 'success' | 'error' | 'cancelled'>
}) {
  const db = getDatabase()
  const [row] = await db
    .update(generationRuns)
    .set({
      completedAt: null,
      lastHeartbeatAt: new Date(),
      status: input.status,
    })
    .where(eq(generationRuns.id, input.runId))
    .returning()

  return row ? mapRun(row, []) : null
}

export async function updateGenerationRunUploadedAssets(input: {
  runId: string
  uploadedAssets: UploadedAssetDescriptor[]
}) {
  const db = getDatabase()
  const [row] = await db
    .update(generationRuns)
    .set({
      lastHeartbeatAt: new Date(),
      uploadedAssets: input.uploadedAssets,
    })
    .where(eq(generationRuns.id, input.runId))
    .returning()

  return row ? mapRun(row, []) : null
}

export async function assignGenerationVariantTask(input: {
  runId: string
  taskId: string
  userId: string
  variantId: string
}) {
  const db = getDatabase()
  const [row] = await db
    .update(generationVariants)
    .set({
      error: null,
      status: 'rendering',
      taskId: input.taskId,
    })
    .where(
      and(
        eq(generationVariants.id, input.variantId),
        eq(generationVariants.runId, input.runId),
      ),
    )
    .returning()

  return row ? mapVariant(row) : null
}

export async function updateGenerationVariantStatus(input: {
  error: string | null
  resultAssetId?: string | null
  runId: string
  status: GenerationVariantRecord['status']
  taskId: string
  userId: string
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

export async function updateGenerationVariantById(input: {
  completedAt?: Date | null
  error?: string | null
  resultAssetId?: string | null
  runId: string
  status?: GenerationVariantStatus
  variantId: string
}) {
  const db = getDatabase()

  await db
    .update(generationVariants)
    .set({
      completedAt:
        typeof input.completedAt === 'undefined' ? undefined : input.completedAt,
      error: typeof input.error === 'undefined' ? undefined : input.error,
      resultAssetId:
        typeof input.resultAssetId === 'undefined'
          ? undefined
          : input.resultAssetId,
      status: input.status,
    })
    .where(
      and(
        eq(generationVariants.id, input.variantId),
        eq(generationVariants.runId, input.runId),
      ),
    )

  await syncGenerationRunStatus(input.runId)
}

export async function claimNextGenerationRun(workerId: string, leaseMs: number) {
  const db = getDatabase()
  const now = new Date()
  const [candidate] = await db
    .select()
    .from(generationRuns)
    .where(
      and(
        inArray(generationRuns.status, [
          'queued',
          'uploading',
          'submitting',
          'rendering',
        ]),
        or(isNull(generationRuns.leaseExpiresAt), lte(generationRuns.leaseExpiresAt, now)),
      ),
    )
    .orderBy(asc(generationRuns.createdAt))
    .limit(1)

  if (!candidate) {
    return null
  }

  const leaseExpiresAt = new Date(now.getTime() + leaseMs)
  const [claimed] = await db
    .update(generationRuns)
    .set({
      attemptCount: candidate.attemptCount + 1,
      lastHeartbeatAt: now,
      leaseExpiresAt,
      leaseOwner: workerId,
    })
    .where(
      and(
        eq(generationRuns.id, candidate.id),
        or(isNull(generationRuns.leaseExpiresAt), lte(generationRuns.leaseExpiresAt, now)),
      ),
    )
    .returning()

  if (!claimed) {
    return null
  }

  const variantRows = await getVariantRowsForRun(claimed.id)

  return mapRun(claimed, variantRows.map(mapVariant))
}

export async function claimGenerationRunById(input: {
  leaseMs: number
  runId: string
  workerId: string
}) {
  const db = getDatabase()
  const now = new Date()
  const [candidate] = await db
    .select()
    .from(generationRuns)
    .where(
      and(
        eq(generationRuns.id, input.runId),
        inArray(generationRuns.status, [
          'queued',
          'uploading',
          'submitting',
          'rendering',
        ]),
        or(isNull(generationRuns.leaseExpiresAt), lte(generationRuns.leaseExpiresAt, now)),
      ),
    )
    .limit(1)

  if (!candidate) {
    return null
  }

  const leaseExpiresAt = new Date(now.getTime() + input.leaseMs)
  const [claimed] = await db
    .update(generationRuns)
    .set({
      attemptCount: candidate.attemptCount + 1,
      lastHeartbeatAt: now,
      leaseExpiresAt,
      leaseOwner: input.workerId,
    })
    .where(
      and(
        eq(generationRuns.id, candidate.id),
        inArray(generationRuns.status, [
          'queued',
          'uploading',
          'submitting',
          'rendering',
        ]),
        or(isNull(generationRuns.leaseExpiresAt), lte(generationRuns.leaseExpiresAt, now)),
      ),
    )
    .returning()

  if (!claimed) {
    return null
  }

  const variantRows = await getVariantRowsForRun(claimed.id)

  return mapRun(claimed, variantRows.map(mapVariant))
}

export async function heartbeatGenerationRunLease(input: {
  leaseMs: number
  runId: string
  workerId: string
}) {
  const db = getDatabase()
  const now = new Date()
  const [row] = await db
    .update(generationRuns)
    .set({
      lastHeartbeatAt: now,
      leaseExpiresAt: new Date(now.getTime() + input.leaseMs),
    })
    .where(
      and(
        eq(generationRuns.id, input.runId),
        eq(generationRuns.leaseOwner, input.workerId),
      ),
    )
    .returning()

  return row ? mapRun(row, []) : null
}

export async function releaseGenerationRunLease(input: {
  runId: string
  workerId: string
}) {
  const db = getDatabase()
  const [row] = await db
    .update(generationRuns)
    .set({
      leaseExpiresAt: null,
      leaseOwner: null,
    })
    .where(
      and(
        eq(generationRuns.id, input.runId),
        eq(generationRuns.leaseOwner, input.workerId),
      ),
    )
    .returning()

  return row ? mapRun(row, []) : null
}

export async function getClaimedGenerationRun(input: {
  runId: string
  workerId: string
}) {
  const db = getDatabase()
  const [runRow] = await db
    .select()
    .from(generationRuns)
    .where(
      and(
        eq(generationRuns.id, input.runId),
        eq(generationRuns.leaseOwner, input.workerId),
      ),
    )
    .limit(1)

  if (!runRow) {
    return null
  }

  const variantRows = await getVariantRowsForRun(runRow.id)

  return mapRun(runRow, variantRows.map(mapVariant))
}

export async function requestGenerationRunCancellation(input: {
  projectId: string
  runId: string
  userId: string
}) {
  const db = getDatabase()
  const now = new Date()
  const [row] = await db
    .update(generationRuns)
    .set({
      cancelRequestedAt: now,
    })
    .where(
      and(
        eq(generationRuns.id, input.runId),
        eq(generationRuns.projectId, input.projectId),
        eq(generationRuns.userId, input.userId),
      ),
    )
    .returning()

  if (!row) {
    return null
  }

  const run = mapRun(row, [])

  if (run.status === 'queued') {
    await markGenerationRunCancelled({
      runId: run.id,
      userId: input.userId,
    })

    return getProjectGenerationRunForUser(input)
  }

  return run
}

export async function markGenerationRunCancelled(input: {
  runId: string
  userId?: string
}) {
  const db = getDatabase()
  const whereClause = input.userId
    ? and(eq(generationRuns.id, input.runId), eq(generationRuns.userId, input.userId))
    : eq(generationRuns.id, input.runId)

  await db
    .update(generationVariants)
    .set({
      completedAt: new Date(),
      error: 'Run cancelled.',
      status: 'cancelled',
    })
    .where(
      and(
        eq(generationVariants.runId, input.runId),
        inArray(generationVariants.status, [
          'queued',
          'submitting',
          'rendering',
        ]),
      ),
    )

  const [row] = await db
    .update(generationRuns)
    .set({
      cancelRequestedAt: new Date(),
      completedAt: new Date(),
      leaseExpiresAt: null,
      leaseOwner: null,
      status: 'cancelled',
    })
    .where(whereClause)
    .returning()

  if (!row) {
    return null
  }

  const variantRows = await getVariantRowsForRun(row.id)

  return mapRun(row, variantRows.map(mapVariant))
}

export async function updateGenerationVariantReview(input: {
  projectId: string
  reviewNotes?: string | null
  reviewStatus?: GenerationReviewStatus
  runId: string
  selectedForDelivery?: boolean
  setHero?: boolean
  userId: string
  variantId: string
}) {
  const db = getDatabase()
  const [matchedVariant] = await db
    .select({
      run: generationRuns,
      variant: generationVariants,
    })
    .from(generationVariants)
    .innerJoin(generationRuns, eq(generationVariants.runId, generationRuns.id))
    .where(
      and(
        eq(generationRuns.userId, input.userId),
        eq(generationRuns.projectId, input.projectId),
        eq(generationRuns.id, input.runId),
        eq(generationVariants.id, input.variantId),
      ),
    )
    .limit(1)

  if (!matchedVariant) {
    return null
  }

  if (input.setHero) {
    await db
      .update(generationVariants)
      .set({
        isHero: false,
      })
      .where(eq(generationVariants.runId, input.runId))
  }

  const nextReviewStatus =
    input.reviewStatus ??
    (input.setHero || input.selectedForDelivery ? 'approved' : undefined)

  const nextDelivery =
    typeof input.selectedForDelivery === 'boolean'
      ? input.selectedForDelivery
      : input.setHero
        ? true
        : undefined

  await db
    .update(generationVariants)
    .set({
      isHero: input.setHero ?? undefined,
      reviewNotes:
        typeof input.reviewNotes === 'undefined'
          ? undefined
          : input.reviewNotes,
      reviewStatus: nextReviewStatus,
      selectedForDelivery: nextDelivery,
    })
    .where(
      and(
        eq(generationVariants.id, input.variantId),
        eq(generationVariants.runId, input.runId),
      ),
    )

  if (nextReviewStatus === 'rejected') {
    await db
      .update(generationVariants)
      .set({
        isHero: false,
        selectedForDelivery: false,
      })
      .where(
        and(
          eq(generationVariants.id, input.variantId),
          eq(generationVariants.runId, input.runId),
        ),
      )
  }

  return getProjectGenerationRunForUser({
    projectId: input.projectId,
    runId: input.runId,
    userId: input.userId,
  })
}

export async function getLibraryRecordForUser(
  userId: string,
  projectId: string | null,
) {
  const userProjects = await listProjectsForUser(userId)
  const selectedProjectId = projectId ?? userProjects[0]?.id ?? null

  if (!selectedProjectId) {
    return {
      projects: userProjects,
      selectedProject: null,
    }
  }

  const selectedProject =
    (await getProjectLibraryRecordForUser(userId, selectedProjectId)) ??
    (selectedProjectId !== userProjects[0]?.id && userProjects[0]
      ? await getProjectLibraryRecordForUser(userId, userProjects[0].id)
      : null)

  return {
    projects: userProjects,
    selectedProject,
  }
}

export async function getProjectLibraryRecordForUser(
  userId: string,
  projectId: string,
): Promise<ProjectLibraryRecord | null> {
  const project = await getProjectForUser(userId, projectId)

  if (!project) {
    return null
  }

  const [assetRows, runRows, variantRows] = await Promise.all([
    listProjectAssetsForUser(userId, projectId),
    getRunRowsForProject(userId, projectId),
    getDatabase()
      .select({
        runId: generationRuns.id,
        variant: generationVariants,
      })
      .from(generationVariants)
      .innerJoin(generationRuns, eq(generationVariants.runId, generationRuns.id))
      .where(
        and(eq(generationRuns.userId, userId), eq(generationRuns.projectId, projectId)),
      )
      .orderBy(desc(generationVariants.createdAt)),
  ])

  const mappedVariants = variantRows.map((row) => ({
    runId: row.runId,
    variant: mapVariant(row.variant),
  }))

  const runs = runRows.map((runRow) =>
    mapRun(
      runRow,
      mappedVariants
        .filter((variant) => variant.runId === runRow.id)
        .map((variant) => variant.variant),
    ),
  )

  return {
    assets: assetRows,
    project,
    runs,
  }
}

export async function getStudioProjectForUser(
  userId: string,
  projectId: string,
): Promise<StudioProjectRecord | null> {
  const project = await getProjectForUser(userId, projectId)

  if (!project) {
    return null
  }

  const [assets, runRows, variantRows] = await Promise.all([
    listProjectAssetsForUser(userId, projectId),
    getRunRowsForProject(userId, projectId),
    getDatabase()
      .select({
        runId: generationRuns.id,
        variant: generationVariants,
      })
      .from(generationVariants)
      .innerJoin(generationRuns, eq(generationVariants.runId, generationRuns.id))
      .where(
        and(eq(generationRuns.userId, userId), eq(generationRuns.projectId, projectId)),
      )
      .orderBy(desc(generationVariants.createdAt)),
  ])

  const mappedVariants = variantRows.map((row) => ({
    runId: row.runId,
    variant: mapVariant(row.variant),
  }))
  const runs = runRows.map((runRow) =>
    mapRun(
      runRow,
      mappedVariants
        .filter((variant) => variant.runId === runRow.id)
        .map((variant) => variant.variant),
    ),
  )

  return {
    outputAssets: assets.filter((asset) => asset.kind === 'output'),
    project,
    referenceAssets: assets.filter((asset) => asset.kind === 'reference'),
    runs,
  }
}

export async function loadPersistedAssetFile(input: {
  assetId: string
  projectId: string
  userId: string
}) {
  const asset = await getProjectAssetForUser(input.userId, input.assetId)

  if (!asset || asset.projectId !== input.projectId) {
    throw new Error('Persisted asset could not be found for this project.')
  }

  const buffer = await readStoredFileBuffer(asset.storagePath)

  return {
    asset,
    file: new File([buffer], asset.originalName, {
      type: asset.mimeType,
    }),
  }
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

  const activeCount = variantRows.filter((variant) =>
    ['queued', 'submitting', 'rendering'].includes(variant.status),
  ).length
  const successCount = variantRows.filter((variant) => variant.status === 'success').length
  const errorCount = variantRows.filter((variant) => variant.status === 'error').length
  const cancelledCount = variantRows.filter((variant) => variant.status === 'cancelled').length

  let nextStatus: GenerationRunStatus

  if (activeCount > 0) {
    nextStatus =
      runRow.status === 'queued' ||
      runRow.status === 'uploading' ||
      runRow.status === 'submitting'
        ? (runRow.status as GenerationRunStatus)
        : 'rendering'
  } else if (successCount === variantRows.length) {
    nextStatus = 'success'
  } else if (errorCount === variantRows.length) {
    nextStatus = 'error'
  } else if (cancelledCount === variantRows.length) {
    nextStatus = 'cancelled'
  } else {
    nextStatus = 'partial-success'
  }

  const [updatedRun] = await db
    .update(generationRuns)
    .set({
      completedAt:
        nextStatus === 'queued' ||
        nextStatus === 'uploading' ||
        nextStatus === 'submitting' ||
        nextStatus === 'rendering'
          ? null
          : new Date(),
      status: nextStatus,
    })
    .where(eq(generationRuns.id, runId))
    .returning()

  if (!updatedRun) {
    return null
  }

  return mapRun(updatedRun, variantRows.map(mapVariant))
}

export function getMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
}

export function getProjectSlotLabel(slotKey: ProjectSlotKey) {
  switch (slotKey) {
    case 'face1':
      return 'Face 1'
    case 'face2':
      return 'Face 2'
    case 'clothing':
      return 'Clothing'
    case 'location':
      return 'Location'
    case 'endFrame':
      return 'End Frame'
    default: {
      const productIndex =
        slotKey === getProductSlotKey(1)
          ? 1
          : slotKey === getProductSlotKey(2)
            ? 2
            : null

      return productIndex ? `Product ${productIndex}` : 'Reference'
    }
  }
}
