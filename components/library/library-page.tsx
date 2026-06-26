'use client'

import { ChevronLeft, ChevronRight, Forward, LoaderCircle, Trash2 } from 'lucide-react'
import { startTransition, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { VideoThumbnailOverlay } from '@/components/dashboard/manual-workspace-ui'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MediaPreviewDialog } from '@/components/media/media-preview-dialog'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/generation/client'
import { fetchForwardedResultFile } from '@/lib/generation/forward-to-video'
import type { GenerationRun } from '@/lib/generation/types'
import {
  formatIdeationConceptCardText,
  formatIdeationResultText,
} from '@/lib/generation/ideation'
import { isImageMimeType } from '@/lib/media/media-preview'
import type {
  ProjectConfigSnapshot,
  SavedIdeationHistoryEntry,
  SavedOutputHistoryEntry,
} from '@/lib/persistence/types'
import { useGenerationStore } from '@/store/use-generation-store'

type RunGroup = {
  id: string
  outputs: SavedOutputHistoryEntry[]
  run: SavedOutputHistoryEntry['run']
}

type DeleteTarget =
  | {
      id: string
      kind: 'output'
      label: string
    }
  | {
      id: string
      kind: 'session'
      label: string
      outputCount: number
    }
  | {
      id: string
      kind: 'ideation'
      label: string
    }

type ArchiveView = 'outputs' | 'ideations'

interface DiskSpaceStats {
  free: number
  used: number
  total: number
  percentageUsed: number
}

function getAssetMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
}

function getAssetDownloadUrl(assetId: string) {
  return `/api/media/${assetId}?download=1`
}

function formatLibraryTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'numeric',
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
  }).format(new Date(value))
}

function getWorkspaceLabel(workspace: ProjectConfigSnapshot['activeTab']) {
  return workspace === 'motion-control'
    ? 'Motion Control media set'
    : workspace === 'video'
      ? 'Video media set'
      : 'Image media set'
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

  return (
    <MediaPreviewDialog alt={alt} label={label} mimeType={mimeType} src={src}>
      <button
        aria-label={`Preview ${label}`}
        className="block w-full overflow-hidden bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        type="button"
      >
        {isImageMimeType(mimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={alt}
            className={mediaClassName}
            loading="lazy"
            src={src}
          />
        ) : (
          <div className="relative">
            <video
              aria-hidden="true"
              className={`pointer-events-none ${mediaClassName} bg-secondary`}
              muted
              playsInline
              preload="metadata"
              src={src}
              tabIndex={-1}
            />
            <VideoThumbnailOverlay />
          </div>
        )}
      </button>
    </MediaPreviewDialog>
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
  return (
    <MediaPreviewDialog alt={alt} label={label} mimeType={mimeType} src={src}>
      <Button size="sm" variant="secondary">
        Preview
      </Button>
    </MediaPreviewDialog>
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

interface LibraryPageProps {
  initialOutputs: SavedOutputHistoryEntry[]
  initialIdeations: SavedIdeationHistoryEntry[]
  currentPage: number
  currentPageSize: number
  stats: {
    totalRuns: number
    totalOutputs: number
    totalSizeBytes: number
    totalIdeations: number
  }
  initialView: ArchiveView
}
export function LibraryPage({
  initialOutputs,
  initialIdeations,
  currentPage,
  currentPageSize,
  stats,
  initialView,
}: LibraryPageProps) {
  const outputs = initialOutputs
  const ideations = initialIdeations
  const router = useRouter()
  const [isPending, startRefreshTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [forwardingOutputId, setForwardingOutputId] = useState<string | null>(null)
  const [forwardingCarouselOutputId, setForwardingCarouselOutputId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [archiveView, setArchiveView] = useState<ArchiveView>(initialView)
  const [page, setPage] = useState(currentPage)
  const [diskStats, setDiskStats] = useState<DiskSpaceStats | null>(null)
  const [diskError, setDiskError] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedIdeationId, setSelectedIdeationId] = useState<string | null>(null)
  const forwardManualImageResultToVideo = useGenerationStore(
    (state) => state.forwardManualImageResultToVideo,
  )
  const forwardManualImageResultToCarousel = useGenerationStore(
    (state) => state.forwardManualImageResultToCarousel,
  )
  const hydrateProjectConfig = useGenerationStore((state) => state.hydrateProjectConfig)

  const runGroups = useMemo(() => buildRunGroups(outputs), [outputs])
  const archiveStats = useMemo(
    () => ({
      latestSavedAt: outputs[0]?.output.createdAt ?? null,
      latestIdeationAt: ideations[0]?.createdAt ?? null,
      totalIdeations: stats.totalIdeations,
      totalOutputs: stats.totalOutputs,
      totalSize: stats.totalSizeBytes,
    }),
    [ideations, outputs, stats],
  )
  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(
          (archiveView === 'outputs' ? runGroups.length : ideations.length) / currentPageSize,
        ),
      ),
    [archiveView, currentPageSize, ideations.length, runGroups.length],
  )
  const pagedRunGroups = useMemo(() => {
    const start = (page - 1) * currentPageSize

    return runGroups.slice(start, start + currentPageSize)
  }, [currentPageSize, page, runGroups])
  const pagedIdeations = useMemo(() => {
    const start = (page - 1) * currentPageSize

    return ideations.slice(start, start + currentPageSize)
  }, [currentPageSize, ideations, page])

  useEffect(() => {
    const nextPage = Math.min(Math.max(1, currentPage), totalPages)
    setPage(nextPage)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (page <= totalPages) {
      return
    }

    setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const nextView = params.get('view')
      const nextPageValue = Number.parseInt(params.get('page') ?? '1', 10)

      setArchiveView(nextView === 'ideations' ? 'ideations' : 'outputs')
      setPage(Number.isFinite(nextPageValue) && nextPageValue > 0 ? nextPageValue : 1)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadDiskStats = async () => {
      try {
        setDiskError(false)
        const response = await fetch('/api/system/storage', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Unable to load disk space stats.')
        }

        const payload = (await response.json()) as DiskSpaceStats

        if (!isMounted) {
          return
        }

        setDiskStats(payload)
      } catch {
        if (!isMounted) {
          return
        }

        setDiskError(true)
      }
    }

    void loadDiskStats()

    return () => {
      isMounted = false
    }
  }, [])

  const updateLibraryUrl = (nextView: ArchiveView, nextPage: number) => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    params.set('view', nextView)
    params.set('page', nextPage.toString())
    params.set('pageSize', currentPageSize.toString())
    window.history.pushState({}, '', `/library?${params.toString()}`)
  }

  const navigateToPage = (newPage: number) => {
    const nextPage = Math.min(Math.max(1, newPage), totalPages)
    setPage(nextPage)
    updateLibraryUrl(archiveView, nextPage)
  }

  const handleViewChange = (newView: ArchiveView) => {
    setArchiveView(newView)
    setPage(1)
    updateLibraryUrl(newView, 1)
  }

  const activeRun =
    pagedRunGroups.find((run) => run.id === selectedRunId) ?? pagedRunGroups[0] ?? null
  const activeIdeation =
    pagedIdeations.find((ideation) => ideation.id === selectedIdeationId) ?? pagedIdeations[0] ?? null
  const activeRunOwnerTag =
    activeRun?.outputs[0]?.output.ownerEmail ?? activeRun?.outputs[0]?.output.userId ?? null
  const activeIdeationOwnerTag = activeIdeation?.ownerEmail ?? activeIdeation?.userId ?? null

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
      throw new Error('Unable to delete media set.')
    }
  }

  const deleteIdeation = async (ideationId: string) => {
    const response = await fetch(`/api/ideations/${encodeURIComponent(ideationId)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Unable to delete ideation brief.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)

    if (deleteTarget.kind === 'session') {
      await deleteSession(deleteTarget.id)
      setSelectedRunId(null)
    } else if (deleteTarget.kind === 'ideation') {
      await deleteIdeation(deleteTarget.id)
      setSelectedIdeationId(null)
    } else {
      await deleteOutput(deleteTarget.id)
    }

    setDeleteTarget(null)
    setIsDeleting(false)
    startRefreshTransition(() => {
      router.refresh()
    })
  }

  const forwardOutputToVideo = async (outputId: string, runId: string) => {
    try {
      setForwardingOutputId(outputId)
      const runResponse = await fetch(
        `/api/generation/runs/${encodeURIComponent(runId)}`,
        {
          cache: 'no-store',
        },
      )
      const runPayload = (await runResponse.json().catch(() => null)) as
        | {
            configSnapshot?: ProjectConfigSnapshot
            error?: string
            run?: GenerationRun
          }
        | null

      if (!runResponse.ok || !runPayload?.configSnapshot) {
        throw new Error(runPayload?.error ?? 'Unable to load the saved preset.')
      }
      const configSnapshot = runPayload.configSnapshot

      const file = await fetchForwardedResultFile(getAssetMediaUrl(outputId))

      startTransition(() => {
        hydrateProjectConfig(configSnapshot)
        forwardManualImageResultToVideo(file)
        router.push('/')
      })
    } finally {
      setForwardingOutputId(null)
    }
  }

  const forwardOutputToCarousel = async (outputId: string, runId: string) => {
    try {
      setForwardingCarouselOutputId(outputId)
      const runResponse = await fetch(
        `/api/generation/runs/${encodeURIComponent(runId)}`,
        {
          cache: 'no-store',
        },
      )
      const runPayload = (await runResponse.json().catch(() => null)) as
        | {
            configSnapshot?: ProjectConfigSnapshot
            error?: string
            run?: GenerationRun
          }
        | null

      if (!runResponse.ok || !runPayload?.configSnapshot) {
        throw new Error(runPayload?.error ?? 'Unable to load the saved preset.')
      }
      const configSnapshot = runPayload.configSnapshot

      const file = await fetchForwardedResultFile(getAssetMediaUrl(outputId))

      startTransition(() => {
        hydrateProjectConfig(configSnapshot)
        forwardManualImageResultToCarousel(file)
        router.push('/')
      })
    } finally {
      setForwardingCarouselOutputId(null)
    }
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
    deleteTarget?.kind === 'session'
      ? `Delete this media set and its ${deleteTarget.outputCount} saved media item${deleteTarget.outputCount === 1 ? '' : 's'}. This cannot be undone.`
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
              Saved media
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {archiveStats.totalOutputs}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {archiveStats.latestSavedAt
                ? formatLibraryTimestamp(archiveStats.latestSavedAt)
                : 'No saved media yet'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Saved ideation
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {archiveStats.totalIdeations}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {archiveStats.latestIdeationAt
                ? formatLibraryTimestamp(archiveStats.latestIdeationAt)
                : 'No saved ideation yet'}
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
              Disk space
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {diskStats ? formatBytes(diskStats.free) ?? '0 B' : '—'}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {diskError
                ? 'Unavailable'
                : diskStats
                  ? `${formatBytes(diskStats.used)} used / ${formatBytes(diskStats.total)} total (${Math.round(diskStats.percentageUsed)}%)`
                  : 'Loading...'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleViewChange('outputs')}
            size="sm"
            variant={archiveView === 'outputs' ? 'default' : 'secondary'}
          >
            Saved media
          </Button>
          <Button
            onClick={() => handleViewChange('ideations')}
            size="sm"
            variant={archiveView === 'ideations' ? 'default' : 'secondary'}
          >
            Saved ideation
          </Button>
        </div>
      </section>

      {archiveView === 'outputs' ? (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border bg-card p-4 xl:flex xl:h-full xl:flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Media sets
            </p>
            <div className="mt-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
              <div className="xl:flex-1">
                <div className="grid gap-3">
                  {pagedRunGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved media sets exist yet. Finished generations will appear here.
                    </p>
                  ) : null}
                  {pagedRunGroups.map((run) => (
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
                            {getWorkspaceLabel(run.run.workspace)}
                          </p>
                          {run.outputs[0]?.output.ownerEmail ?? run.outputs[0]?.output.userId ? (
                            <p className="mt-1">
                              <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {run.outputs[0].output.ownerEmail ?? run.outputs[0].output.userId}
                              </span>
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {run.outputs.length} saved media item
                            {run.outputs.length === 1 ? '' : 's'} ·{' '}
                            {formatLibraryTimestamp(
                              run.outputs[0]?.output.createdAt ?? run.run.createdAt,
                            )}
                          </p>
                        </button>
                        <Button
                          aria-label="Delete media set"
                          className="-mr-2 text-destructive hover:text-destructive"
                          disabled={isDeleting || isPending}
                          onClick={() => {
                            setDeleteTarget({
                              id: run.id,
                              kind: 'session',
                              label:
                                getWorkspaceLabel(run.run.workspace),
                              outputCount: run.outputs.length,
                            })
                          }}
                          size="icon"
                          title="Delete media set"
                          variant="ghost"
                        >
                          <Trash2 suppressHydrationWarning />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={navigateToPage}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Media set
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  {activeRun
                    ? getWorkspaceLabel(activeRun.run.workspace)
                    : 'No media set selected'}
                </h2>
                {activeRunOwnerTag ? (
                  <p className="mt-2">
                    <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {activeRunOwnerTag}
                    </span>
                  </p>
                ) : null}
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
                        <span>{formatLibraryTimestamp(activeRun.run.createdAt)}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {activeRun.run.promptSnapshot}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 justify-center gap-3 self-center text-center text-sm sm:grid-cols-[repeat(2,88px)] lg:grid-cols-[repeat(2,88px)]">
                      <div className="flex min-h-24 flex-col justify-center rounded-lg border border-border bg-card px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Media
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
                          {isImageMimeType(entry.output.mimeType) ? (
                            <>
                              <Button
                                disabled={forwardingOutputId === entry.output.id}
                                onClick={() => {
                                  void forwardOutputToVideo(entry.output.id, entry.run.id)
                                }}
                                size="sm"
                                type="button"
                                variant="secondary"
                              >
                                {forwardingOutputId === entry.output.id ? (
                                  <LoaderCircle
                                    className="animate-spin"
                                    data-icon="inline-start"
                                    suppressHydrationWarning
                                  />
                                ) : (
                                  <Forward
                                    data-icon="inline-start"
                                    suppressHydrationWarning
                                  />
                                )}
                                {forwardingOutputId === entry.output.id
                                  ? 'Forwarding...'
                                  : 'Forward to Video'}
                              </Button>
                              <Button
                                disabled={forwardingCarouselOutputId === entry.output.id}
                                onClick={() => {
                                  void forwardOutputToCarousel(entry.output.id, entry.run.id)
                                }}
                                size="sm"
                                type="button"
                                variant="secondary"
                              >
                                {forwardingCarouselOutputId === entry.output.id ? (
                                  <LoaderCircle
                                    className="animate-spin"
                                    data-icon="inline-start"
                                    suppressHydrationWarning
                                  />
                                ) : (
                                  <Forward
                                    data-icon="inline-start"
                                    suppressHydrationWarning
                                  />
                                )}
                                {forwardingCarouselOutputId === entry.output.id
                                  ? 'Forwarding...'
                                  : 'Forward to Carousel'}
                              </Button>
                            </>
                          ) : null}
                          <Button
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting || isPending}
                            onClick={() => {
                              setDeleteTarget({
                                id: entry.output.id,
                                kind: 'output',
                                label: entry.output.label,
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
                          {formatLibraryTimestamp(entry.output.createdAt)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No saved media exists for this media set yet.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-border bg-card p-4 xl:flex xl:h-full xl:flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Ideation
            </p>
            <div className="mt-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
              <div className="xl:flex-1">
                <div className="grid gap-3">
                  {pagedIdeations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No saved ideation exists yet.
                    </p>
                  ) : null}
                  {pagedIdeations.map((ideation) => (
                    <div
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        ideation.id === activeIdeation?.id
                          ? 'border-foreground/35 bg-secondary'
                          : 'border-border bg-background hover:border-foreground/20'
                      }`}
                      key={ideation.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedIdeationId(ideation.id)}
                          type="button"
                        >
                          <p className="font-medium text-foreground">Ideation</p>
                          {ideation.ownerEmail ?? ideation.userId ? (
                            <p className="mt-1">
                              <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {ideation.ownerEmail ?? ideation.userId}
                              </span>
                            </p>
                          ) : null}
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {ideation.result.summary}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatLibraryTimestamp(ideation.createdAt)}
                          </p>
                        </button>
                        <Button
                          aria-label="Delete brief"
                          className="-mr-2 text-destructive hover:text-destructive"
                          disabled={isDeleting || isPending}
                          onClick={() => {
                            setDeleteTarget({
                              id: ideation.id,
                              kind: 'ideation',
                              label: 'this ideation brief',
                            })
                          }}
                          size="icon"
                          title="Delete brief"
                          variant="ghost"
                        >
                          <Trash2 suppressHydrationWarning />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={navigateToPage}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Ideation
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  {activeIdeation ? 'Saved ideation' : 'No ideation selected'}
                </h2>
                {activeIdeationOwnerTag ? (
                  <p className="mt-2">
                    <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {activeIdeationOwnerTag}
                    </span>
                  </p>
                ) : null}
              </div>
              {activeIdeation ? (
                <Button
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      formatIdeationResultText(activeIdeation.result),
                    )
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Copy full ideation
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4">
              {activeIdeation ? (
                <>
                  <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{activeIdeation.inputSnapshot.analysisModel}</span>
                      <span>·</span>
                      <span>{activeIdeation.inputSnapshot.contentConcept}</span>
                      <span>·</span>
                      <span>
                        {activeIdeation.inputSnapshot.contentFormat === 'photos'
                          ? 'Photos'
                          : 'Video'}
                      </span>
                      <span>·</span>
                      <span>{formatLibraryTimestamp(activeIdeation.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {activeIdeation.result.summary}
                    </p>
                    <div className="mt-4 grid gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Content format
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {activeIdeation.inputSnapshot.contentFormat === 'photos'
                            ? 'Photos'
                            : 'Video'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Product URL
                        </p>
                        <p className="mt-1 break-all text-sm text-foreground">
                          {activeIdeation.inputSnapshot.productUrl ?? 'No product URL captured.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Written brief
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {activeIdeation.inputSnapshot.briefText}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {activeIdeation.result.concepts.map((concept, index) => (
                      <article
                        className="rounded-xl border border-border bg-background p-4"
                        key={`${activeIdeation.id}-${index}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Concept {index + 1}
                            </p>
                            <p className="mt-2 font-medium text-foreground">
                              {concept.title}
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                formatIdeationConceptCardText(concept, index),
                              )
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
                          <p><span className="font-medium text-foreground">Audience:</span> {concept.audience}</p>
                          <p><span className="font-medium text-foreground">Angle:</span> {concept.angle}</p>
                          <p><span className="font-medium text-foreground">Hook:</span> {concept.hook}</p>
                          <p><span className="font-medium text-foreground">Key message:</span> {concept.keyMessage}</p>
                          <p><span className="font-medium text-foreground">Visual direction:</span> {concept.visualDirection}</p>
                          <p><span className="font-medium text-foreground">CTA:</span> {concept.cta}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No saved ideation exists yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

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
          deleteTarget?.kind === 'session'
            ? 'Delete media set?'
            : deleteTarget?.kind === 'ideation'
              ? 'Delete brief?'
              : 'Delete media?'
        }
      />
    </main>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    pages.push(1)

    if (currentPage > 3) pages.push('...')
    else pages.push(2)

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i)
    }

    if (currentPage < totalPages - 2) pages.push('...')
    else if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1)

    if (!pages.includes(totalPages)) pages.push(totalPages)

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
      {/* Mobile */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
          aria-label="Go to previous page"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <div>
          <nav className="isolate inline-flex items-center gap-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
              aria-label="Go to previous page"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>

            {pageNumbers.map((page, idx) =>
              typeof page === 'string' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="inline-flex size-10 items-center justify-center text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  &hellip;
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={page === currentPage}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none',
                    page === currentPage
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {page}
                </button>
              ),
            )}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
              aria-label="Go to next page"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
