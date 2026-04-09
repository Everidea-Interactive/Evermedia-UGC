import type {
  CameraMovement,
  CharacterAgeGroup,
  CharacterEthnicity,
  CharacterGender,
  CreativeStyle,
  FigureArtDirection,
  GenerationProvider,
  GenerationReviewStatus,
  GenerationRunStatus,
  GenerationVariantStatus,
  ImageModelOption,
  NamedAssetKey,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  SubmittedAssetDescriptor,
  SubjectMode,
  UploadedAssetDescriptor,
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
  characterAgeGroup: CharacterAgeGroup
  characterEthnicity: CharacterEthnicity
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  figureArtDirection: FigureArtDirection
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  shotEnvironment: ShotEnvironment
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
  isHero: boolean
  profile: string
  prompt: string
  reviewNotes: string | null
  reviewStatus: GenerationReviewStatus
  resultAssetId: string | null
  runId: string
  selectedForDelivery: boolean
  status: GenerationVariantStatus
  taskId: string | null
  variantIndex: 1 | 2 | 3 | 4
}

export type GenerationRunRecord = {
  assetManifest: SubmittedAssetDescriptor[]
  attemptCount: number
  cancelRequestedAt: string | null
  completedAt: string | null
  configSnapshot: ProjectConfigSnapshot
  createdAt: string
  id: string
  lastHeartbeatAt: string | null
  leaseExpiresAt: string | null
  leaseOwner: string | null
  model: string
  parentRunId: string | null
  projectId: string
  promptSnapshot: string
  provider: GenerationProvider
  status: GenerationRunStatus
  uploadedAssets: UploadedAssetDescriptor[]
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
  outputAssets: ProjectAssetRecord[]
  project: ProjectRecord
  referenceAssets: ProjectAssetRecord[]
  runs: GenerationRunRecord[]
}
