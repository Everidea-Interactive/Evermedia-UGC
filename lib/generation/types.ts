export type WorkspaceTab = 'image' | 'video'

export type ProductCategory =
  | 'food-drink'
  | 'jewelry'
  | 'cosmetics'
  | 'electronics'
  | 'clothing'
  | 'miscellaneous'

export type CreativeStyle =
  | 'ugc-lifestyle'
  | 'cinematic'
  | 'tv-commercial'
  | 'elite-product-commercial'
export type SubjectMode = 'product-only' | 'lifestyle'
export type ShotEnvironment = 'indoor' | 'outdoor'
export type CharacterGender = 'any' | 'female' | 'male' | 'non-binary'
export type CharacterAgeGroup =
  | 'any'
  | 'young-adult'
  | 'adult'
  | 'middle-aged'
  | 'senior'
export type FigureArtDirection = 'none' | 'curvaceous-editorial'
export type VideoDuration = 'base' | 'extended'
export type OutputQuality = '720p' | '1080p' | '4k'
export type BatchSize = 1 | 2 | 3 | 4
export type CameraMovement =
  | 'orbit'
  | 'dolly'
  | 'drone'
  | 'crash-zoom'
  | 'macro'

export type ImageModelOption = 'nano-banana' | 'grok-imagine'
export type VideoModelOption = 'veo-3.1' | 'kling' | 'grok-imagine'
export type GenerationProvider = 'market' | 'veo'
export type KieStatusSource = 'chat-credit' | 'user-credits'

export type AssetUploadStatus =
  | 'idle'
  | 'staged'
  | 'uploading'
  | 'uploaded'
  | 'error'

export type GenerationRunStatus =
  | 'idle'
  | 'queued'
  | 'uploading'
  | 'submitting'
  | 'rendering'
  | 'partial-success'
  | 'success'
  | 'cancelled'
  | 'error'

export type GenerationVariantStatus =
  | 'queued'
  | 'submitting'
  | 'rendering'
  | 'success'
  | 'cancelled'
  | 'error'

export type GenerationVariantIndex = 1 | 2 | 3 | 4
export type GenerationReviewStatus = 'pending' | 'approved' | 'rejected'

export type NamedAssetKey =
  | 'face1'
  | 'face2'
  | 'clothing'
  | 'location'
  | 'endFrame'

export type AssetSlot = {
  id: string
  label: string
  file: File | null
  persistedAssetId: string | null
  previewUrl: string | null
  remoteUrl: string | null
  mimeType: string | null
  size: number | null
  uploadStatus: AssetUploadStatus
  error: string | null
}

export type NamedAssetSlots = Record<NamedAssetKey, AssetSlot>

export type GenerationResult = {
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
  taskId: string
  model: string
}

export type GenerationVariant = {
  variantId: string
  index: GenerationVariantIndex
  profile: string
  prompt: string
  taskId: string | null
  status: GenerationVariantStatus
  error: string | null
  result: GenerationResult | null
  reviewStatus: GenerationReviewStatus
  reviewNotes: string | null
  isHero: boolean
  selectedForDelivery: boolean
  createdAt: string | null
  completedAt: string | null
}

export type GenerationRun = {
  runId: string | null
  projectId: string | null
  parentRunId: string | null
  workspace: WorkspaceTab | null
  provider: GenerationProvider | null
  model: string | null
  status: GenerationRunStatus
  startedAt: number | null
  createdAt: string | null
  completedAt: string | null
  error: string | null
  cancelRequestedAt: string | null
  uploadedAssets: UploadedAssetDescriptor[]
  variants: GenerationVariant[]
  selectedVariantId: string | null
}

export type GenerationSessionStats = {
  completedVariants: number
  failedVariants: number
}

export type GenerationSnapshot = {
  activeTab: WorkspaceTab
  imageModel: ImageModelOption
  videoModel: VideoModelOption
  productCategory: ProductCategory
  creativeStyle: CreativeStyle
  subjectMode: SubjectMode
  shotEnvironment: ShotEnvironment
  characterGender: CharacterGender
  characterAgeGroup: CharacterAgeGroup
  figureArtDirection: FigureArtDirection
  batchSize: BatchSize
  textPrompt: string
  videoDuration: VideoDuration
  outputQuality: OutputQuality
  cameraMovement: CameraMovement | null
  assets: NamedAssetSlots
  products: AssetSlot[]
}

export type SubmittedAssetDescriptor = {
  fieldName: string
  kind: 'named' | 'product'
  label: string
  order: number
  persistedAssetId?: string
  key?: NamedAssetKey
  productId?: string
}

export type UploadedAssetDescriptor = SubmittedAssetDescriptor & {
  remoteUrl: string
}

export type RunSubmissionResponse = {
  runId: string
  projectId: string
  parentRunId: string | null
  model: string
  provider: GenerationProvider
  uploadedAssets: UploadedAssetDescriptor[]
  variants: GenerationVariant[]
  workspace: WorkspaceTab
  status: Exclude<GenerationRunStatus, 'idle'>
  createdAt: string
  completedAt: string | null
  cancelRequestedAt: string | null
}

export type TaskPollResponse = {
  error: string | null
  result: GenerationResult | null
  status: Extract<GenerationVariantStatus, 'rendering' | 'success' | 'error'>
  taskId: string
}

export type KieStatusResponse = {
  connected: boolean
  credits: number | null
  source: KieStatusSource | null
  fetchedAt: string | null
  error: string | null
}
