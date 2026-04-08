import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-{2,}/g, '-')
}

function createId(prefix: string) {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getMediaStorageRoot() {
  const configuredRoot = process.env.MEDIA_STORAGE_DIR

  if (!configuredRoot) {
    throw new Error('MEDIA_STORAGE_DIR is not configured on the server.')
  }

  return configuredRoot
}

function buildStoragePath(input: {
  fileName: string
  folder: 'references' | 'outputs'
  projectId: string
  userId: string
}) {
  const safeName = sanitizeSegment(input.fileName || 'asset.bin')
  const relativePath = path.join(
    sanitizeSegment(input.userId),
    sanitizeSegment(input.projectId),
    input.folder,
    `${Date.now()}-${createId('file')}-${safeName}`,
  )

  return relativePath
}

export function resolveAbsoluteStoragePath(storagePath: string) {
  return path.join(getMediaStorageRoot(), storagePath)
}

export async function saveFileToDisk(input: {
  file: Blob
  fileName: string
  folder: 'references' | 'outputs'
  projectId: string
  userId: string
}) {
  const storagePath = buildStoragePath(input)
  const absolutePath = resolveAbsoluteStoragePath(storagePath)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, Buffer.from(await input.file.arrayBuffer()))

  return {
    absolutePath,
    storagePath,
  }
}

export async function duplicateStoredFile(input: {
  fileName: string
  folder: 'references' | 'outputs'
  projectId: string
  sourceStoragePath: string
  userId: string
}) {
  const sourcePath = resolveAbsoluteStoragePath(input.sourceStoragePath)
  const target = buildStoragePath(input)
  const targetPath = resolveAbsoluteStoragePath(target)

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, await readFile(sourcePath))

  return {
    absolutePath: targetPath,
    storagePath: target,
  }
}

export async function deleteStoredFile(storagePath: string | null | undefined) {
  if (!storagePath) {
    return
  }

  const absolutePath = resolveAbsoluteStoragePath(storagePath)

  try {
    await unlink(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

export async function deleteProjectDirectory(userId: string, projectId: string) {
  const absolutePath = resolveAbsoluteStoragePath(
    path.join(sanitizeSegment(userId), sanitizeSegment(projectId)),
  )

  try {
    await rm(absolutePath, { force: true, recursive: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

export async function readStoredFileBuffer(storagePath: string) {
  const absolutePath = resolveAbsoluteStoragePath(storagePath)

  return readFile(absolutePath)
}

export async function getStoredFileStats(storagePath: string) {
  const absolutePath = resolveAbsoluteStoragePath(storagePath)

  return stat(absolutePath)
}
