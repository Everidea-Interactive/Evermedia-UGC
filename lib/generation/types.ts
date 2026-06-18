export type WorkspaceTab = 'image' | 'video' | 'carousel' | 'motion-control'

export type MediaKind = 'image' | 'video'

export type MotionControlResolution = '720p' | '1080p'

export type MotionControlDraft = {
  additionalInstructions: string
  motionVideo: AssetSlot
  referenceImage: AssetSlot
  resolution: MotionControlResolution
}

export type CarouselBaseTemplateMode = 'ai' | 'manual'

export type CarouselPanelDraft = {
  id: string
  order: number
  imageMode: 'ai' | 'manual'
  imagePrompt: string
  imageAsset: AssetSlot | null
  textMode: 'ai' | 'manual'
  textPrompt: string
  textValue: string
  templateMode: 'inherit' | 'override'
  templatePrompt: string
}

export type CarouselDraft = {
  baseTemplateMode: CarouselBaseTemplateMode
  baseTemplatePrompt: string
  baseTemplateAsset: AssetSlot | null
  panels: CarouselPanelDraft[]
}
export type GenerationExperience = 'manual' | 'guided' | 'ideation'
export type GenerationLocale = 'en' | 'id'
export type ContentConcept = 'driven-ads' | 'affiliate'
export type CreativeGoal = 'awareness' | 'consideration' | 'conversion'
export type AudiencePreset =
  | 'broad'
  | 'gen-z'
  | 'young-professionals'
  | 'beauty-shoppers'
  | 'parents'
  | 'fitness-shoppers'
export type PlatformPreset =
  | 'tiktok'
  | 'instagram-reels'
  | 'youtube-shorts'
  | 'meta-ads'
  | 'shopee'
  | 'tokopedia'
export type CreativePlanningStatus = 'idle' | 'planning' | 'ready' | 'error'
export type ContentFormat = 'video' | 'photos'

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
export type VideoAudio = 'no-audio' | 'with-audio'
export type OutputQuality = '720p' | '1080p' | '4k'
export type ImageResolution = '1K' | '2K' | '4K'
export type VideoResolution = '720p' | '1080p'
export type OrientationPreference = 'auto' | 'portrait' | 'landscape' | 'square'
export type BatchSize = 1 | 2 | 3 | 4
export type CameraMovement =
  | 'orbit'
  | 'dolly'
  | 'drone'
  | 'crash-zoom'
  | 'macro'

export type ImageModelOption = 'nano-banana'
export type VideoModelOption =
  | 'veo-3.1'
  | 'seedance-1.5-pro'
  | 'seedance-2'
  | 'kling-3.0'
export type KieAnalysisModel =
  | 'gemini-2.5-flash'
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

export type GenerationVariantIndex =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16

export type NamedAssetKey =
  | 'face1'
  | 'face2'
  | 'clothing'
  | 'location'
  | 'brandLogo'
  | 'firstFrame'
  | 'endFrame'

export type AssetSlot = {
  durationSeconds?: number | null
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

export type CreativeBrief = {
  audience: AudiencePreset
  goal: CreativeGoal
  platform: PlatformPreset
  productHighlights: string
  tone: string
}

export type CtaOption = {
  id: string
  label: string
  placement: 'closing-shot' | 'caption' | 'visual-overlay' | 'voiceover'
  rationale: string
}

export type PromptEnhancement = {
  ctaEnabled: boolean
  customCtaText: string
  selectedCtaId: string
  voiceoverEnabled: boolean
  voiceoverScript: string
}

export type StoryboardShot = GuidedAnalysisShot & {
  ctaText: string
  durationSeconds: number
  environmentPrompt: string
  objective: string
  renderPrompt: string
  soundPrompt: string
  visualPrompt: string
  voiceoverLine: string
}

export type CreativePlan = {
  ctaOptions: CtaOption[]
  environmentDirectionSummary: string
  messageAngle: string
  selectedCtaId: string | null
  soundDirectionSummary: string
  storyboard: StoryboardShot[]
  visualDirectionSummary: string
  voiceoverScript: string
}

export type GuidedAnalysisStatus = 'idle' | 'analyzing' | 'ready' | 'error'

export type IdeationConceptCard = {
  angle: string
  audience: string
  cta: string
  hook: string
  keyMessage: string
  title: string
  visualDirection: string
}

export type IdeationResult = {
  concepts: [IdeationConceptCard, IdeationConceptCard, IdeationConceptCard]
  summary: string
}

export type GuidedGenerationConfig = {
  analysisModel: KieAnalysisModel
  creativeBrief?: CreativeBrief | null
  creativePlan?: CreativePlan | null
  contentConcept: ContentConcept
  productUrl: string
  shots: GuidedAnalysisShot[]
  summary: string
}

export type GenerationResult = {
  label?: string
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
  experience: GenerationExperience
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
  locale?: GenerationLocale
  outputQuality: OutputQuality
  orientationPreference?: OrientationPreference
  promptEnhancement?: PromptEnhancement
  productCategory: ProductCategory
  products: AssetSlot[]
  shotEnvironment: ShotEnvironment
  subjectMode: SubjectMode
  textPrompt: string
  videoReferences: AssetSlot[]
  videoAudio: VideoAudio
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
    'nano-banana': Record<ImageResolution, GenerationCostRate>
    'grok-imagine': {
      promptOnly: GenerationCostRate
      withReference: GenerationCostRate
    }
    'gpt-image-2': {
      promptOnly: Record<ImageResolution, GenerationCostRate>
      withReference: Record<ImageResolution, GenerationCostRate>
    }
  }
  video: {
    'grok-imagine': {
      promptOnly: Record<VideoResolution, Record<VideoDuration, GenerationCostRate>>
      withReference: Record<VideoResolution, Record<VideoDuration, GenerationCostRate>>
    }
    kling: {
      promptOnly: Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      withReference: Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
    }
    'kling-3.0': {
      promptOnly: Record<
        VideoResolution,
        Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      >
      withReference: Record<
        VideoResolution,
        Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      >
    }
    'kling-3.0-motion-control': Record<VideoResolution, GenerationCostRate>
    'veo-3.1': {
      promptOnly: Record<VideoResolution, GenerationCostRate>
      withReference: Record<VideoResolution, GenerationCostRate>
    }
    'seedance-1.5-pro': {
      promptOnly: Record<
        VideoResolution,
        Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      >
      withReference: Record<
        VideoResolution,
        Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      >
    }
    'seedance-2': {
      promptOnly: Record<
        VideoResolution,
        Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      >
      withReference: Record<
        VideoResolution,
        Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>
      >
    }
  }
}

export type KiePricingResponse = {
  creditUsdRate: number
  error?: string
  expiresAt: string
  fetchedAt: string
  matrix: KiePricingMatrix | null
  supportedImageQualities?: Record<ImageModelOption, OutputQuality[]>
}

export type GenerationCostEstimate = {
  available: boolean
  credits: number | null
  reason: string | null
  usd: number | null
}
