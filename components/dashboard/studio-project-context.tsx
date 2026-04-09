'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useShallow } from 'zustand/react/shallow'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getProductSlotKey } from '@/lib/persistence/serialization'
import { createGenerationRunState } from '@/lib/persistence/serialization'
import type {
  ProjectConfigSnapshot,
  ProjectAssetRecord,
  ProjectRecord,
  ProjectSlotKey,
  StudioProjectRecord,
} from '@/lib/persistence/types'
import { useGenerationStore } from '@/store/use-generation-store'
import type { NamedAssetKey } from '@/lib/generation/types'

type StudioAutosaveState = 'idle' | 'saving' | 'saved' | 'error'

type StudioProjectContextValue = {
  autosaveState: StudioAutosaveState
  currentProject: StudioProjectRecord | null
  ensureProjectId: () => Promise<string | null>
  isProjectPending: boolean
  projects: ProjectRecord[]
  refreshProject: (projectId?: string | null) => Promise<StudioProjectRecord | null>
  renameProject: (name: string) => Promise<void>
  resetProjectBoard: () => Promise<void>
  selectProject: (projectId: string) => void
  stageNamedAsset: (slot: NamedAssetKey, file: File | null) => Promise<void>
  stageProductAsset: (slotId: string, file: File | null) => Promise<void>
  clearNamedAsset: (slot: NamedAssetKey) => Promise<void>
  clearProductAsset: (slotId: string) => Promise<void>
  createProject: (name?: string) => Promise<ProjectRecord | null>
}

const StudioProjectContext =
  createContext<StudioProjectContextValue | null>(null)

function getMediaUrl(assetId: string) {
  return `/api/media/${assetId}`
}

function createProjectConfigSnapshot(
  state: ReturnType<typeof useGenerationStore.getState>,
): ProjectConfigSnapshot {
  return {
    activeTab: state.activeTab,
    batchSize: state.batchSize,
    cameraMovement: state.cameraMovement,
    characterAgeGroup: state.characterAgeGroup,
    characterGender: state.characterGender,
    creativeStyle: state.creativeStyle,
    figureArtDirection: state.figureArtDirection,
    imageModel: state.imageModel,
    outputQuality: state.outputQuality,
    productCategory: state.productCategory,
    shotEnvironment: state.shotEnvironment,
    subjectMode: state.subjectMode,
    textPrompt: state.textPrompt,
    videoDuration: state.videoDuration,
    videoModel: state.videoModel,
  }
}

function getProjectSlotForProduct(slotId: string) {
  const products = useGenerationStore.getState().products
  const productIndex = products.findIndex((product) => product.id === slotId)

  return productIndex >= 0 ? getProductSlotKey(productIndex + 1) : null
}

function useHydrateProjectState(project: StudioProjectRecord | null) {
  const hydrateProjectConfig = useGenerationStore(
    (state) => state.hydrateProjectConfig,
  )
  const setNamedAssetStoredState = useGenerationStore(
    (state) => state.setNamedAssetStoredState,
  )
  const setProductSlotStoredState = useGenerationStore(
    (state) => state.setProductSlotStoredState,
  )
  const hydrateGenerationRun = useGenerationStore(
    (state) => state.hydrateGenerationRun,
  )
  const resetGenerationState = useGenerationStore(
    (state) => state.resetGenerationState,
  )

  useEffect(() => {
    if (!project) {
      resetGenerationState()
      return
    }

    hydrateProjectConfig(project.project.configSnapshot)

    const store = useGenerationStore.getState()

    for (const asset of project.referenceAssets) {
      if (!asset.slotKey) {
        continue
      }

      const patch = {
        mimeType: asset.mimeType,
        persistedAssetId: asset.id,
        previewUrl: getMediaUrl(asset.id),
        size: asset.fileSize,
      }

      if (asset.slotKey === 'product-1' || asset.slotKey === 'product-2') {
        const productIndex = asset.slotKey === 'product-1' ? 0 : 1
        const product = store.products[productIndex]

        if (product) {
          setProductSlotStoredState(product.id, patch)
        }

        continue
      }

      setNamedAssetStoredState(asset.slotKey, patch)
    }

    hydrateGenerationRun(
      createGenerationRunState(project.runs[0] ?? null, project.outputAssets),
    )
  }, [
    hydrateGenerationRun,
    hydrateProjectConfig,
    project,
    resetGenerationState,
    setNamedAssetStoredState,
    setProductSlotStoredState,
  ])
}

function ProjectToolbar({
  autosaveState,
  createProject,
  currentProject,
  isPending,
  projects,
  renameProject,
  selectProject,
}: {
  autosaveState: StudioAutosaveState
  createProject: (name?: string) => Promise<ProjectRecord | null>
  currentProject: StudioProjectRecord | null
  isPending: boolean
  projects: ProjectRecord[]
  renameProject: (name: string) => Promise<void>
  selectProject: (projectId: string) => void
}) {
  const projectEditorKey = currentProject?.project.id ?? 'no-project'

  return (
    <section className="mx-auto w-full max-w-[1500px] px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Project Workspace
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Persisted studio session
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Projects keep references, settings, and render history across
              sessions. The studio autosaves while you work.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="h-10 min-w-[220px] rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              value={currentProject?.project.id ?? ''}
              onChange={(event) => {
                if (event.target.value) {
                  selectProject(event.target.value)
                }
              }}
            >
              {projects.length === 0 ? (
                <option value="">No saved projects yet</option>
              ) : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <Button
              disabled={isPending}
              onClick={() => {
                void createProject()
              }}
              variant="secondary"
            >
              New Project
            </Button>
          </div>
        </div>

        <ProjectNameEditor
          key={projectEditorKey}
          currentProject={currentProject}
          isPending={isPending}
          renameProject={renameProject}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          {currentProject
            ? `Autosave status: ${autosaveState}. Active project: ${currentProject.project.name}.`
            : 'Create a project or stage an asset to let the studio start persisting your work.'}
        </p>
      </div>
    </section>
  )
}

function ProjectNameEditor({
  currentProject,
  isPending,
  renameProject,
}: {
  currentProject: StudioProjectRecord | null
  isPending: boolean
  renameProject: (name: string) => Promise<void>
}) {
  const [draftName, setDraftName] = useState(currentProject?.project.name ?? '')

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="project-name">
          Project name
        </label>
        <Input
          disabled={!currentProject}
          id="project-name"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
        />
      </div>
      <Button
        disabled={!currentProject || draftName.trim().length === 0 || isPending}
        onClick={() => {
          void renameProject(draftName)
        }}
      >
        Save Name
      </Button>
    </div>
  )
}

export function StudioProjectProvider({
  children,
  initialProject,
  initialProjects,
}: {
  children: ReactNode
  initialProject: StudioProjectRecord | null
  initialProjects: ProjectRecord[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [projects, setProjects] = useState(initialProjects)
  const [currentProject, setCurrentProject] = useState(initialProject)
  const [autosaveState, setAutosaveState] = useState<StudioAutosaveState>('idle')
  const hydrationProjectIdRef = useRef<string | null>(null)

  const configSnapshot = useGenerationStore(
    useShallow(createProjectConfigSnapshot),
  )

  useHydrateProjectState(currentProject)

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  useEffect(() => {
    setCurrentProject(initialProject)
  }, [initialProject])

  useEffect(() => {
    hydrationProjectIdRef.current = currentProject?.project.id ?? null
    setAutosaveState('idle')
  }, [currentProject?.project.id])

  useEffect(() => {
    if (!currentProject) {
      return
    }

    if (hydrationProjectIdRef.current === currentProject.project.id) {
      hydrationProjectIdRef.current = null
      return
    }

    const controller = new AbortController()
    setAutosaveState('saving')

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${currentProject.project.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configSnapshot,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to autosave the project configuration.')
        }

        setAutosaveState('saved')
      } catch {
        if (controller.signal.aborted) {
          return
        }

        setAutosaveState('error')
      }
    }, 500)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [configSnapshot, currentProject])

  const createProject = async (name?: string) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configSnapshot: createProjectConfigSnapshot(useGenerationStore.getState()),
        name,
      }),
    })
    const payload = (await response.json()) as {
      error?: string
      project?: ProjectRecord
    }

    if (!response.ok || !payload.project) {
      throw new Error(payload.error ?? 'Unable to create a project.')
    }

    setProjects((current) => [payload.project!, ...current])
    setCurrentProject({
      project: payload.project,
      outputAssets: [],
      referenceAssets: [],
      runs: [],
    })
    startTransition(() => {
      router.replace(`/?project=${payload.project!.id}`)
      router.refresh()
    })

    return payload.project
  }

  const ensureProjectId = async () => {
    if (currentProject) {
      return currentProject.project.id
    }

    const project = await createProject()

    return project?.id ?? null
  }

  const renameProject = async (name: string) => {
    if (!currentProject) {
      return
    }

    const response = await fetch(`/api/projects/${currentProject.project.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
      }),
    })
    const payload = (await response.json()) as {
      error?: string
      project?: ProjectRecord
    }

    if (!response.ok || !payload.project) {
      throw new Error(payload.error ?? 'Unable to rename the project.')
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === payload.project!.id ? payload.project! : project,
      ),
    )
    setCurrentProject((current) =>
      current
        ? {
            ...current,
            project: payload.project!,
          }
        : current,
    )
  }

  const refreshProject = async (projectId?: string | null) => {
    const targetProjectId = projectId ?? currentProject?.project.id ?? null

    if (!targetProjectId) {
      return null
    }

    const response = await fetch(`/api/projects/${targetProjectId}`, {
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => null)) as
      | { error?: string } & Partial<StudioProjectRecord>
      | null

    if (!response.ok || !payload?.project) {
      throw new Error(payload?.error ?? 'Unable to refresh the active project.')
    }

    const refreshedProject = payload as StudioProjectRecord

    setCurrentProject(refreshedProject)

    return refreshedProject
  }

  const upsertCurrentProjectAsset = (
    slotKey: ProjectSlotKey,
    asset: Pick<
      ProjectAssetRecord,
      'fileSize' | 'id' | 'label' | 'mimeType' | 'originalName' | 'projectId' | 'slotKey'
    > | null,
  ) => {
    setCurrentProject((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        referenceAssets:
          asset === null
            ? current.referenceAssets.filter((item) => item.slotKey !== slotKey)
            : [
                ...current.referenceAssets.filter((item) => item.slotKey !== slotKey),
                {
                  createdAt: new Date().toISOString(),
                  kind: 'reference',
                  storagePath: '',
                  userId: current.project.userId,
                  ...asset,
                },
              ],
      }
    })
  }

  const stageNamedAsset = async (slot: NamedAssetKey, file: File | null) => {
    const store = useGenerationStore.getState()
    let projectId: string | null = currentProject?.project.id ?? null

    store.setNamedAssetFile(slot, file)

    if (!file) {
      return
    }

    try {
      if (!projectId) {
        projectId = await ensureProjectId()
      }
    } catch (error) {
      store.setNamedAssetRemoteState(slot, {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create or load the active project.',
        remoteUrl: null,
        uploadStatus: 'error',
      })

      return
    }

    if (!projectId) {
      return
    }

    store.setNamedAssetRemoteState(slot, {
      error: null,
      remoteUrl: null,
      uploadStatus: 'uploading',
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('label', store.assets[slot].label)
    formData.append('slotKey', slot)

    const response = await fetch(`/api/projects/${projectId}/assets`, {
      method: 'POST',
      body: formData,
    })
    const payload = (await response.json()) as {
      asset?: { fileSize: number; id: string; mimeType: string }
      error?: string
      mediaUrl?: string
    }

    if (!response.ok || !payload.asset || !payload.mediaUrl) {
      store.setNamedAssetRemoteState(slot, {
        error: payload.error ?? 'Unable to persist the selected asset.',
        remoteUrl: null,
        uploadStatus: 'error',
      })
      return
    }

    store.setNamedAssetStoredState(slot, {
      mimeType: payload.asset.mimeType,
      persistedAssetId: payload.asset.id,
      previewUrl: payload.mediaUrl,
      size: payload.asset.fileSize,
    })
    upsertCurrentProjectAsset(slot, {
      fileSize: payload.asset.fileSize,
      id: payload.asset.id,
      label: store.assets[slot].label,
      mimeType: payload.asset.mimeType,
      originalName: file.name,
      projectId,
      slotKey: slot,
    })
  }

  const clearNamedAsset = async (slot: NamedAssetKey) => {
    const store = useGenerationStore.getState()
    const slotState = store.assets[slot]

    if (slotState.persistedAssetId && currentProject) {
      await fetch(
        `/api/projects/${currentProject.project.id}/assets/${slotState.persistedAssetId}`,
        {
          method: 'DELETE',
        },
      )
    }

    store.clearNamedAsset(slot)
    upsertCurrentProjectAsset(slot, null)
  }

  const stageProductAsset = async (slotId: string, file: File | null) => {
    const store = useGenerationStore.getState()
    let projectId: string | null = currentProject?.project.id ?? null

    store.setProductSlotFile(slotId, file)

    if (!file) {
      return
    }

    try {
      if (!projectId) {
        projectId = await ensureProjectId()
      }
    } catch (error) {
      store.setProductSlotRemoteState(slotId, {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create or load the active project.',
        remoteUrl: null,
        uploadStatus: 'error',
      })

      return
    }

    const slotKey = getProjectSlotForProduct(slotId)

    if (!slotKey || !projectId) {
      return
    }

    store.setProductSlotRemoteState(slotId, {
      error: null,
      remoteUrl: null,
      uploadStatus: 'uploading',
    })

    const product = useGenerationStore
      .getState()
      .products.find((item) => item.id === slotId)

    if (!product) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('label', product.label)
    formData.append('slotKey', slotKey)

    const response = await fetch(`/api/projects/${projectId}/assets`, {
      method: 'POST',
      body: formData,
    })
    const payload = (await response.json()) as {
      asset?: { fileSize: number; id: string; mimeType: string }
      error?: string
      mediaUrl?: string
    }

    if (!response.ok || !payload.asset || !payload.mediaUrl) {
      store.setProductSlotRemoteState(slotId, {
        error: payload.error ?? 'Unable to persist the selected asset.',
        remoteUrl: null,
        uploadStatus: 'error',
      })
      return
    }

    store.setProductSlotStoredState(slotId, {
      mimeType: payload.asset.mimeType,
      persistedAssetId: payload.asset.id,
      previewUrl: payload.mediaUrl,
      size: payload.asset.fileSize,
    })
    upsertCurrentProjectAsset(slotKey, {
      fileSize: payload.asset.fileSize,
      id: payload.asset.id,
      label: product.label,
      mimeType: payload.asset.mimeType,
      originalName: file.name,
      projectId,
      slotKey,
    })
  }

  const clearProductAsset = async (slotId: string) => {
    const store = useGenerationStore.getState()
    const product = store.products.find((item) => item.id === slotId)

    if (!product) {
      return
    }

    if (product.persistedAssetId && currentProject) {
      await fetch(
        `/api/projects/${currentProject.project.id}/assets/${product.persistedAssetId}`,
        {
          method: 'DELETE',
        },
      )
    }

    store.clearProductSlot(slotId)
    const slotKey = getProjectSlotForProduct(slotId)

    if (slotKey) {
      upsertCurrentProjectAsset(slotKey, null)
    }
  }

  const resetProjectBoard = async () => {
    const store = useGenerationStore.getState()

    if (currentProject) {
      await fetch(`/api/projects/${currentProject.project.id}/assets`, {
        method: 'DELETE',
      })
      setCurrentProject((current) =>
        current
          ? {
              ...current,
              outputAssets: current.outputAssets,
              referenceAssets: [],
              runs: current.runs,
            }
          : current,
      )
    }

    store.resetGenerationState()
  }

  const selectProject = (projectId: string) => {
    startTransition(() => {
      router.replace(`/?project=${projectId}`)
      router.refresh()
    })
  }

  const value: StudioProjectContextValue = {
    autosaveState,
    clearNamedAsset,
    clearProductAsset,
    createProject,
    currentProject,
    ensureProjectId,
    isProjectPending: isPending,
    projects,
    refreshProject,
    renameProject,
    resetProjectBoard,
    selectProject,
    stageNamedAsset,
    stageProductAsset,
  }

  return (
    <StudioProjectContext.Provider value={value}>
      <ProjectToolbar
        autosaveState={autosaveState}
        createProject={createProject}
        currentProject={currentProject}
        isPending={isPending}
        projects={projects}
        renameProject={renameProject}
        selectProject={selectProject}
      />
      {children}
    </StudioProjectContext.Provider>
  )
}

export function useOptionalStudioProjectContext() {
  return useContext(StudioProjectContext)
}
