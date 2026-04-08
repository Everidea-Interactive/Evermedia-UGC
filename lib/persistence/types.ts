import type {
  CameraMovement,
  CreativeStyle,
  GenerationProvider,
  GenerationRunStatus,
  GenerationVariantStatus,
  ImageModelOption,
  NamedAssetKey,
  OutputQuality,
  ProductCategory,
  SubjectMode,
  VideoDuration,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'

export type AuthenticatedUserSummary = {
  email: string | null
  id: string
}

export type ProjectAssetKind = 'reference' | 'output'
export type ProductSlotKey = 'product-1' | 'product-2'
export type ProjectSlotKey = NamedAssetKey | ProductSlotKey

export type ProjectConfigSnapshot = {
  activeTab: WorkspaceTab
  batchSize: 1 | 2 | 3 | 4
  cameraMovement: CameraMovement | null
  creativeStyle: CreativeStyle
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}

export type ProjectRecord = {
  configSnapshot: ProjectConfigSnapshot
  createdAt: string
  id: string
  lastOpenedAt: string | null
  name: string
  updatedAt: string
  userId: string
}

export type ProjectAssetRecord = {
  createdAt: string
  fileSize: number
  id: string
  kind: ProjectAssetKind
  label: string
  mimeType: string
  originalName: string
  projectId: string
  slotKey: ProjectSlotKey | null
  storagePath: string
  userId: string
}

export type GenerationVariantRecord = {
  completedAt: string | null
  createdAt: string
  error: string | null
  id: string
  profile: string
  prompt: string
  resultAssetId: string | null
  runId: string
  status: GenerationVariantStatus
  taskId: string | null
  variantIndex: 1 | 2 | 3 | 4
}

export type GenerationRunRecord = {
  completedAt: string | null
  configSnapshot: ProjectConfigSnapshot
  createdAt: string
  id: string
  model: string
  projectId: string
  promptSnapshot: string
  provider: GenerationProvider
  status: GenerationRunStatus
  userId: string
  variants: GenerationVariantRecord[]
  workspace: WorkspaceTab
}

export type ProjectLibraryRecord = {
  assets: ProjectAssetRecord[]
  project: ProjectRecord
  runs: GenerationRunRecord[]
}

export type StudioProjectRecord = {
  project: ProjectRecord
  referenceAssets: ProjectAssetRecord[]
}
