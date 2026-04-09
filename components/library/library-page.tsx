'use client'

import { useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ImagePreviewDialog } from '@/components/media/image-preview-dialog'
import { Button } from '@/components/ui/button'
import { isImageMimeType } from '@/lib/media/image-preview'
import type {
  ProjectLibraryRecord,
  ProjectRecord,
} from '@/lib/persistence/types'

function getAssetMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
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

export function LibraryPage({
  projects,
  selectedProject,
}: {
  projects: ProjectRecord[]
  selectedProject: ProjectLibraryRecord | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const selectedProjectId = selectedProject?.project.id ?? projects[0]?.id ?? null
  const outputAssetMap = useMemo(
    () =>
      new Map(
        (selectedProject?.assets ?? [])
          .filter((asset) => asset.kind === 'output')
          .map((asset) => [asset.id, asset] as const),
      ),
    [selectedProject?.assets],
  )
  const deliverables = useMemo(
    () =>
      (selectedProject?.runs ?? []).flatMap((run) =>
        run.variants
          .filter(
            (variant) =>
              Boolean(variant.resultAssetId) &&
              (variant.selectedForDelivery ||
                variant.isHero ||
                variant.reviewStatus === 'approved'),
          )
          .map((variant) => {
            const asset = variant.resultAssetId
              ? outputAssetMap.get(variant.resultAssetId)
              : null

            if (!asset) {
              return null
            }

            return {
              asset,
              run,
              variant,
            }
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      ),
    [outputAssetMap, selectedProject?.runs],
  )
  const heroOutputs = deliverables.filter((entry) => entry.variant.isHero)
  const rejectedHistory = useMemo(
    () =>
      (selectedProject?.runs ?? []).flatMap((run) =>
        run.variants
          .filter(
            (variant) =>
              variant.reviewStatus === 'rejected' || variant.status === 'error',
          )
          .map((variant) => ({
            run,
            variant,
          })),
      ),
    [selectedProject?.runs],
  )

  const duplicateProject = async (projectId: string) => {
    await fetch(`/api/projects/${projectId}/duplicate`, {
      method: 'POST',
    })
    startTransition(() => {
      router.refresh()
    })
  }

  const deleteProject = async (projectId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    })
    startTransition(() => {
      router.replace('/library')
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
          Projects, history, and reusable outputs
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review saved projects, inspect run history, and open any project back in
          the studio with its persisted references and generated media intact.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Projects
          </p>
          <div className="mt-4 grid gap-3">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects exist yet. Open the studio and create one to start
                building a reusable library.
              </p>
            ) : null}
            {projects.map((project) => (
              <button
                key={project.id}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  project.id === selectedProjectId
                    ? 'border-foreground/35 bg-secondary'
                    : 'border-border bg-background hover:border-foreground/20'
                }`}
                onClick={() => {
                  startTransition(() => {
                    router.replace(`/library?project=${project.id}`)
                  })
                }}
                type="button"
              >
                <p className="font-medium text-foreground">{project.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {new Date(project.updatedAt).toLocaleString()}
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
                {selectedProject?.project.name ?? 'No project selected'}
              </h2>
            </div>

            {selectedProject ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/?project=${selectedProject.project.id}`}>
                    Open in Studio
                  </Link>
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => {
                    void duplicateProject(selectedProject.project.id)
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Duplicate
                </Button>
                <Button
                  disabled={isPending}
                  onClick={() => {
                    void deleteProject(selectedProject.project.id)
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {selectedProject?.runs.length ? (
              selectedProject.runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {run.workspace === 'video' ? 'Video run' : 'Image run'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {run.model} · {run.status}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {run.promptSnapshot}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {run.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="rounded-lg border border-border/80 bg-card px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            Variation {variant.variantIndex}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {variant.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {variant.taskId ?? variant.error ?? 'Awaiting provider task'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>Review: {variant.reviewStatus}</span>
                          {variant.isHero ? <span>Hero</span> : null}
                          {variant.selectedForDelivery ? <span>Deliverable</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No runs recorded for this project yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Deliverables & Assets
          </p>

          <div className="mt-4 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Approved deliverables
                </h3>
                <span className="text-xs text-muted-foreground">
                  {deliverables.length} selected
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {deliverables.length ? (
                  deliverables.map(({ asset, run, variant }) => (
                    <article
                      key={asset.id}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      <AssetCardMedia
                        alt={asset.label}
                        label={asset.label}
                        mimeType={asset.mimeType}
                        src={getAssetMediaUrl(asset.id)}
                      />
                      <div className="p-3">
                        <p className="font-medium text-foreground">{asset.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Run {run.workspace} · Variation {variant.variantIndex}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>{variant.reviewStatus}</span>
                          {variant.isHero ? <span>Hero</span> : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AssetPreviewButton
                            alt={asset.label}
                            label={asset.label}
                            mimeType={asset.mimeType}
                            src={getAssetMediaUrl(asset.id)}
                          />
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/?project=${asset.projectId}`}>Open in Studio</Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No approved deliverables have been promoted from this project yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Hero outputs</h3>
                <span className="text-xs text-muted-foreground">
                  {heroOutputs.length} hero pick{heroOutputs.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {heroOutputs.length ? (
                  heroOutputs.map(({ asset, variant }) => (
                    <article
                      key={`${asset.id}-hero`}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      <AssetCardMedia
                        alt={asset.label}
                        label={asset.label}
                        mimeType={asset.mimeType}
                        src={getAssetMediaUrl(asset.id)}
                      />
                      <div className="p-3">
                        <p className="font-medium text-foreground">{asset.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Variation {variant.variantIndex} hero selection
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No hero output has been chosen for this project yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Rejected & failed history
                </h3>
                <span className="text-xs text-muted-foreground">
                  {rejectedHistory.length} entries
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {rejectedHistory.length ? (
                  rejectedHistory.map(({ run, variant }) => (
                    <div
                      key={`${run.id}-${variant.id}-history`}
                      className="rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          Run {run.workspace} · Variation {variant.variantIndex}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {variant.reviewStatus} / {variant.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {variant.reviewNotes ?? variant.error ?? 'Stored for audit trail.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No rejected or failed history has accumulated for this project yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">All assets</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {selectedProject?.assets.length ? (
                  selectedProject.assets.map((asset) => (
                    <article
                      key={asset.id}
                      className="overflow-hidden rounded-xl border border-border bg-background"
                    >
                      <AssetCardMedia
                        alt={asset.label}
                        label={asset.label}
                        mimeType={asset.mimeType}
                        src={getAssetMediaUrl(asset.id)}
                      />
                      <div className="p-3">
                        <p className="font-medium text-foreground">{asset.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {asset.kind === 'output' ? 'Generated output' : 'Reference'} ·{' '}
                          {asset.slotKey ?? 'unbound'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {asset.kind === 'output' ? (
                            <AssetPreviewButton
                              alt={asset.label}
                              label={asset.label}
                              mimeType={asset.mimeType}
                              src={getAssetMediaUrl(asset.id)}
                            />
                          ) : null}
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/?project=${asset.projectId}`}>Reuse in Studio</Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No persisted references or outputs are attached to this project yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
