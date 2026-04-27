export type WorkspaceTab = 'image' | 'video'
export type GenerationExperience = 'manual' | 'guided'
export type ContentConcept = 'driven-ads' | 'affiliate'

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
export type VideoModelOption =
  | 'veo-3.1'
  | 'kling'
  | 'grok-imagine'
  | 'seedance-1.5-pro'
export type KieAnalysisModel =
  | 'gemini-2.5-flash'
  | 'claude-haiku-4-5'
  | 'claude-sonnet-4-6'
export type GenerationProvider = 'market' | 'veo'
export type KieStatusSource = 'chat-credit' | 'user-credits'

export type AssetUploadStatus = 'idle' | 'staged'

export type GenerationRunStatus =
  | 'idle'
  | 'rendering'
  | 'partial-success'
  | 'success'
  | 'cancelled'
  | 'error'

export type GenerationVariantStatus =
  | 'rendering'
  | 'success'
  | 'cancelled'
  | 'error'

export type GenerationVariantIndex = 1 | 2 | 3 | 4

export type NamedAssetKey =
  | 'face1'
  | 'face2'
  | 'clothing'
  | 'location'
  | 'endFrame'

export type AssetSlot = {
  error: string | null
  file: File | null
  id: string
  label: string
  mimeType: string | null
  previewUrl: string | null
  size: number | null
  uploadStatus: AssetUploadStatus
}

export type NamedAssetSlots = Record<NamedAssetKey, AssetSlot>

export type GuidedAnalysisShot = {
  prompt: string
  shotEnvironment: ShotEnvironment
  slug: string
  subjectMode: SubjectMode
  tags: string[]
  title: string
}

export type GuidedAnalysisPlan = {
  creativeStyle: CreativeStyle
  productCategory: ProductCategory
  shots: GuidedAnalysisShot[]
  summary: string
}

export type GuidedAnalysisStatus = 'idle' | 'analyzing' | 'ready' | 'error'

export type GuidedGenerationConfig = {
  analysisModel: KieAnalysisModel
  contentConcept: ContentConcept
  productUrl: string
  shots: GuidedAnalysisShot[]
  summary: string
}

export type GenerationResult = {
  model: string
  taskId: string
  thumbnailUrl?: string
  type: 'image' | 'video'
  url: string
}

export type GenerationVariant = {
  completedAt: string | null
  createdAt: string | null
  error: string | null
  index: GenerationVariantIndex
  profile: string
  prompt: string
  result: GenerationResult | null
  status: GenerationVariantStatus
  taskId: string | null
  variantId: string
}

export type GenerationRun = {
  completedAt: string | null
  createdAt: string | null
  error: string | null
  model: string | null
  provider: GenerationProvider | null
  runId: string | null
  selectedVariantId: string | null
  startedAt: number | null
  status: GenerationRunStatus
  variants: GenerationVariant[]
  workspace: WorkspaceTab | null
}

export type GenerationSessionStats = {
  completedVariants: number
  failedVariants: number
}

export type GenerationSnapshot = {
  activeTab: WorkspaceTab
  assets: NamedAssetSlots
  batchSize: BatchSize
  cameraMovement: CameraMovement | null
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  figureArtDirection: FigureArtDirection
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  products: AssetSlot[]
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}

export type SubmittedAssetDescriptor = {
  fieldName: string
  kind: 'named' | 'product'
  label: string
  order: number
  key?: NamedAssetKey
  productId?: string
}

export type UploadedAssetDescriptor = SubmittedAssetDescriptor & {
  remoteUrl: string
}

export type RunSubmissionResponse = {
  completedAt: string | null
  createdAt: string
  model: string
  provider: GenerationProvider
  runId: string
  status: Exclude<GenerationRunStatus, 'idle'>
  variants: GenerationVariant[]
  workspace: WorkspaceTab
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
  error: string | null
  fetchedAt: string | null
  source: KieStatusSource | null
}

export type GenerationCostRate = {
  credits: number
  usd: number
}

export type KiePricingMatrix = {
  image: {
    'nano-banana': Record<OutputQuality, GenerationCostRate>
    'grok-imagine': {
      promptOnly: GenerationCostRate
      withReference: GenerationCostRate
    }
  }
  video: {
    'grok-imagine': {
      promptOnly: Record<OutputQuality, Record<VideoDuration, GenerationCostRate>>
      withReference: Record<OutputQuality, Record<VideoDuration, GenerationCostRate>>
    }
    kling: {
      promptOnly: Record<VideoDuration, GenerationCostRate>
      withReference: Record<VideoDuration, GenerationCostRate>
    }
    'veo-3.1': {
      promptOnly: GenerationCostRate
      withReference: GenerationCostRate
    }
    'seedance-1.5-pro': {
      promptOnly: Record<Exclude<OutputQuality, '4k'>, Record<VideoDuration, GenerationCostRate>>
      withReference: Record<Exclude<OutputQuality, '4k'>, Record<VideoDuration, GenerationCostRate>>
    }
  }
}

export type KiePricingResponse = {
  creditUsdRate: number
  error?: string
  expiresAt: string
  fetchedAt: string
  matrix: KiePricingMatrix | null
}

export type GenerationCostEstimate = {
  available: boolean
  credits: number | null
  reason: string | null
  usd: number | null
}
