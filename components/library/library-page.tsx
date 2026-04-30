'use client'

import { Trash2 } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/generation/client'
import { isImageMimeType } from '@/lib/media/image-preview'
import type { SavedOutputHistoryEntry } from '@/lib/persistence/types'

type RunGroup = {
  id: string
  outputs: SavedOutputHistoryEntry[]
  run: SavedOutputHistoryEntry['run']
}

type DeleteTarget =
  | {
      id: string
      label: string
      type: 'output'
    }
  | {
      id: string
      label: string
      outputCount: number
      type: 'session'
    }

function getAssetMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
}

function getAssetDownloadUrl(assetId: string) {
  return `/api/media/${assetId}?download=1`
}

function formatLibraryTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'numeric',
    year: 'numeric',
  })
}

function AssetCardMedia({
  alt,
  label,
  mimeType,
  size = 'default',
  src,
}: {
  alt: string
  label: string
  mimeType: string
  size?: 'default' | 'large'
  src: string
}) {
  const mediaClassName =
    size === 'large'
      ? 'aspect-[16/10] w-full object-contain'
      : 'aspect-[4/3] w-full object-contain'

  if (isImageMimeType(mimeType)) {
    return (
      <ImagePreviewDialog alt={alt} label={label} src={src}>
        <button
          aria-label={`Preview ${label}`}
          className="block w-full overflow-hidden bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className={mediaClassName}
            loading="lazy"
            src={src}
          />
        </button>
      </ImagePreviewDialog>
    )
  }

  return (
    <video
      className={`${mediaClassName} bg-secondary`}
      controls
      playsInline
      preload="metadata"
      src={src}
    />
  )
}

function AssetPreviewButton({
  alt,
  label,
  mimeType,
  src,
}: {
  alt: string
  label: string
  mimeType: string
  src: string
}) {
  if (isImageMimeType(mimeType)) {
    return (
      <ImagePreviewDialog alt={alt} label={label} src={src}>
        <Button size="sm" variant="secondary">
          Preview
        </Button>
      </ImagePreviewDialog>
    )
  }

  return (
    <Button asChild size="sm" variant="secondary">
      <a href={src} rel="noreferrer" target="_blank">
        Preview
      </a>
    </Button>
  )
}

function buildRunGroups(outputs: SavedOutputHistoryEntry[]) {
  const groups = new Map<string, RunGroup>()

  for (const entry of outputs) {
    const existing = groups.get(entry.run.id)

    if (existing) {
      existing.outputs.push(entry)
      continue
    }

    groups.set(entry.run.id, {
      id: entry.run.id,
      outputs: [entry],
      run: entry.run,
    })
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      outputs: group.outputs.toSorted(
        (left, right) =>
          new Date(right.output.createdAt).getTime() -
          new Date(left.output.createdAt).getTime(),
      ),
    }))
    .toSorted(
      (left, right) =>
        new Date(right.outputs[0]?.output.createdAt ?? right.run.createdAt).getTime() -
        new Date(left.outputs[0]?.output.createdAt ?? left.run.createdAt).getTime(),
    )
}

export function LibraryPage({
  outputs,
}: {
  outputs: SavedOutputHistoryEntry[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const runGroups = useMemo(() => buildRunGroups(outputs), [outputs])
  const archiveStats = useMemo(
    () => ({
      latestSavedAt: outputs[0]?.output.createdAt ?? null,
      totalOutputs: outputs.length,
      totalSize: outputs.reduce((sum, entry) => sum + entry.output.fileSize, 0),
      workspaceCount: new Set(outputs.map((entry) => entry.run.workspace)).size,
    }),
    [outputs],
  )

  const activeRun = runGroups.find((run) => run.id === selectedRunId) ?? runGroups[0] ?? null

  const deleteOutput = async (outputId: string) => {
    const response = await fetch(`/api/outputs/${outputId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Unable to delete output.')
    }
  }

  const deleteSession = async (runId: string) => {
    const response = await fetch(`/api/generation/runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Unable to delete session.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)

    if (deleteTarget.type === 'session') {
      await deleteSession(deleteTarget.id)
      setSelectedRunId(null)
    } else {
      await deleteOutput(deleteTarget.id)
    }

    setDeleteTarget(null)
    setIsDeleting(false)
    startTransition(() => {
      router.refresh()
    })
  }

  const closeDeleteDialog = (open: boolean) => {
    if (isDeleting) {
      return
    }

    if (!open) {
      setDeleteTarget(null)
    }
  }

  const deleteDialogDescription =
    deleteTarget?.type === 'session'
      ? `Delete this session and its ${deleteTarget.outputCount} saved output${deleteTarget.outputCount === 1 ? '' : 's'}. This cannot be undone.`
      : deleteTarget
        ? `Delete ${deleteTarget.label}. This cannot be undone.`
        : undefined

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h1 className="font-display text-2xl font-semibold">
          Library
        </h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Saved outputs
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {archiveStats.totalOutputs}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Workspaces
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {archiveStats.workspaceCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Archive size
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {formatBytes(archiveStats.totalSize) ?? '0 KB'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Latest save
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {archiveStats.latestSavedAt
                ? formatLibraryTimestamp(archiveStats.latestSavedAt)
                : 'No saved outputs yet'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sessions
          </p>
          <div className="mt-4 grid gap-3">
            {runGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved sessions exist yet. Finished generations will appear here.
              </p>
            ) : null}
            {runGroups.map((run) => (
              <div
                key={run.id}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  run.id === activeRun?.id
                    ? 'border-foreground/35 bg-secondary'
                    : 'border-border bg-background hover:border-foreground/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSelectedRunId(run.id)
                    }}
                    type="button"
                  >
                    <p className="font-medium text-foreground">
                      {run.run.workspace === 'video' ? 'Video session' : 'Image session'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {run.outputs.length} saved variation
                      {run.outputs.length === 1 ? '' : 's'} ·{' '}
                      {formatLibraryTimestamp(
                        run.outputs[0]?.output.createdAt ?? run.run.createdAt,
                      )}
                    </p>
                  </button>
                  <Button
                    aria-label="Delete session"
                    className="-mr-2 text-destructive hover:text-destructive"
                    disabled={isDeleting || isPending}
                    onClick={() => {
                      setDeleteTarget({
                        id: run.id,
                        label:
                          run.run.workspace === 'video'
                            ? 'Video session'
                            : 'Image session',
                        outputCount: run.outputs.length,
                        type: 'session',
                      })
                    }}
                    size="icon"
                    title="Delete session"
                    variant="ghost"
                  >
                    <Trash2 suppressHydrationWarning />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Session
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                {activeRun
                  ? activeRun.run.workspace === 'video'
                    ? 'Video session'
                    : 'Image session'
                  : 'No session selected'}
              </h2>
            </div>

          </div>

          <div className="mt-4 grid gap-4">
            {activeRun ? (
              <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
                <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{activeRun.run.model}</span>
                      <span>·</span>
                      <span>{activeRun.run.status}</span>
                      <span>·</span>
                      <span>{new Date(activeRun.run.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {activeRun.run.promptSnapshot}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 justify-center gap-3 self-center text-center text-sm sm:grid-cols-[repeat(2,88px)] lg:grid-cols-[repeat(2,88px)]">
                    <div className="flex min-h-24 flex-col justify-center rounded-lg border border-border bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Outputs
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {activeRun.outputs.length}
                      </p>
                    </div>
                    <div className="flex min-h-24 flex-col justify-center rounded-lg border border-border bg-card px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Archive
                      </p>
                      <p className="mt-1 font-semibold text-foreground">
                        {formatBytes(
                          activeRun.outputs.reduce(
                            (sum, entry) => sum + entry.output.fileSize,
                            0,
                          ),
                        ) ?? '0 KB'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeRun?.outputs.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeRun.outputs.map((entry) => (
                  <article
                    key={entry.output.id}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <AssetCardMedia
                      alt={entry.output.label}
                      label={entry.output.label}
                      mimeType={entry.output.mimeType}
                      size="large"
                      src={getAssetMediaUrl(entry.output.id)}
                    />
                    <div className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {entry.output.label}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Variation {entry.variant.variantIndex} ·{' '}
                            {formatBytes(entry.output.fileSize) ?? 'Unknown size'}
                          </p>
                        </div>
                        <span className="rounded-full border border-border px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {entry.variant.status}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {entry.variant.profile}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {entry.variant.prompt}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <AssetPreviewButton
                          alt={entry.output.label}
                          label={entry.output.label}
                          mimeType={entry.output.mimeType}
                          src={getAssetMediaUrl(entry.output.id)}
                        />
                        <Button asChild size="sm" variant="secondary">
                          <a
                            download={entry.output.originalName}
                            href={getAssetDownloadUrl(entry.output.id)}
                          >
                            Download
                          </a>
                        </Button>
                        <Button
                          className="text-destructive hover:text-destructive"
                          disabled={isDeleting || isPending}
                          onClick={() => {
                            setDeleteTarget({
                              id: entry.output.id,
                              label: entry.output.label,
                              type: 'output',
                            })
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 data-icon="inline-start" suppressHydrationWarning />
                          Delete
                        </Button>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {new Date(entry.output.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No saved outputs exist for this session yet.
              </p>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        confirmLabel={isDeleting ? 'Deleting' : 'Delete'}
        description={deleteDialogDescription}
        isBusy={isDeleting}
        onConfirm={() => {
          void confirmDelete().catch(() => {
            setIsDeleting(false)
          })
        }}
        onOpenChange={closeDeleteDialog}
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === 'session'
            ? 'Delete session?'
            : 'Delete output?'
        }
      />
    </main>
  )
}
