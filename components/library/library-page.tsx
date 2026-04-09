'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

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

function getAssetMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
}

function getAssetDownloadUrl(assetId: string) {
  return `/api/media/${assetId}?download=1`
}

function AssetCardMedia({
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
        <button
          aria-label={`Preview ${label}`}
          className="block w-full overflow-hidden bg-black/20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={alt}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
            src={src}
          />
        </button>
      </ImagePreviewDialog>
    )
  }

  return (
    <video
      className="aspect-[4/3] w-full bg-black object-cover"
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
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null)

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
  const selectedEntry =
    activeRun?.outputs.find((entry) => entry.output.id === selectedOutputId) ??
    activeRun?.outputs[0] ??
    null

  const deleteOutput = async (outputId: string) => {
    await fetch(`/api/outputs/${outputId}`, {
      method: 'DELETE',
    })

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Library
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold">
          Runs, history, and reusable outputs
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Inspect saved runs, review output history, and open the studio whenever
          you want to generate a fresh batch from the current workflow.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sessions
          </p>
          <div className="mt-4 grid gap-3">
            {runGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved runs exist yet. Open the studio and finish a successful
                batch to populate this library.
              </p>
            ) : null}
            {runGroups.map((run) => (
              <button
                key={run.id}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  run.id === activeRun?.id
                    ? 'border-foreground/35 bg-secondary'
                    : 'border-border bg-background hover:border-foreground/20'
                }`}
                onClick={() => {
                  setSelectedRunId(run.id)
                  setSelectedOutputId(null)
                }}
                type="button"
              >
                <p className="font-medium text-foreground">
                  {run.run.workspace === 'video' ? 'Video session' : 'Image session'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.outputs.length} saved variation
                  {run.outputs.length === 1 ? '' : 's'} ·{' '}
                  {new Date(run.outputs[0]?.output.createdAt ?? run.run.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Run History
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                {activeRun
                  ? activeRun.run.workspace === 'video'
                    ? 'Video session'
                    : 'Image session'
                  : 'No session selected'}
              </h2>
            </div>

            {activeRun ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href="/">Open Studio</Link>
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {activeRun ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {activeRun.run.workspace === 'video' ? 'Video run' : 'Image run'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeRun.run.model} · {activeRun.run.status}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activeRun.run.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {activeRun.run.promptSnapshot}
                </p>
              </div>
            ) : null}

            {activeRun?.outputs.length ? (
              activeRun.outputs.map((entry) => (
                <button
                  key={entry.output.id}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    entry.output.id === selectedEntry?.output.id
                      ? 'border-foreground/35 bg-secondary'
                      : 'border-border bg-background hover:border-foreground/20'
                  }`}
                  onClick={() => setSelectedOutputId(entry.output.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      Variation {entry.variant.variantIndex}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.variant.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {entry.variant.profile}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{new Date(entry.output.createdAt).toLocaleString()}</span>
                    {entry.variant.taskId ? <span>Task {entry.variant.taskId}</span> : null}
                  </div>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No saved outputs exist for this run yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Outputs & Archive
          </p>

          <div className="mt-4 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Selected output
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedEntry ? 'Preview ready' : 'No output selected'}
                </span>
              </div>
              <div className="mt-3">
                {selectedEntry ? (
                  <article className="overflow-hidden rounded-xl border border-border bg-background">
                    <AssetCardMedia
                      alt={selectedEntry.output.label}
                      label={selectedEntry.output.label}
                      mimeType={selectedEntry.output.mimeType}
                      src={getAssetMediaUrl(selectedEntry.output.id)}
                    />
                    <div className="p-3">
                      <p className="font-medium text-foreground">
                        {selectedEntry.output.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Run {selectedEntry.run.workspace} · Variation{' '}
                        {selectedEntry.variant.variantIndex}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {selectedEntry.variant.profile}
                      </p>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
                        {selectedEntry.variant.prompt}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AssetPreviewButton
                          alt={selectedEntry.output.label}
                          label={selectedEntry.output.label}
                          mimeType={selectedEntry.output.mimeType}
                          src={getAssetMediaUrl(selectedEntry.output.id)}
                        />
                        <Button asChild size="sm" variant="secondary">
                          <a
                            download={selectedEntry.output.originalName}
                            href={getAssetDownloadUrl(selectedEntry.output.id)}
                          >
                            Download
                          </a>
                        </Button>
                        <Button
                          disabled={isPending}
                          onClick={() => {
                            void deleteOutput(selectedEntry.output.id)
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Select a saved output from the run history to inspect it here.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Run outputs
                </h3>
                <span className="text-xs text-muted-foreground">
                  {activeRun?.outputs.length ?? 0} saved
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {activeRun?.outputs.length ? (
                  activeRun.outputs.map((entry) => (
                    <article
                      key={`${entry.output.id}-asset`}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      <AssetCardMedia
                        alt={entry.output.label}
                        label={entry.output.label}
                        mimeType={entry.output.mimeType}
                        src={getAssetMediaUrl(entry.output.id)}
                      />
                      <div className="p-3">
                        <p className="font-medium text-foreground">{entry.output.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Variation {entry.variant.variantIndex} ·{' '}
                          {formatBytes(entry.output.fileSize) ?? 'Unknown size'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AssetPreviewButton
                            alt={entry.output.label}
                            label={entry.output.label}
                            mimeType={entry.output.mimeType}
                            src={getAssetMediaUrl(entry.output.id)}
                          />
                          <Button
                            onClick={() => setSelectedOutputId(entry.output.id)}
                            size="sm"
                            variant="ghost"
                          >
                            Inspect
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No saved outputs have been attached to the selected run yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">Archive summary</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                      ? new Date(archiveStats.latestSavedAt).toLocaleString()
                      : 'No saved outputs yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
