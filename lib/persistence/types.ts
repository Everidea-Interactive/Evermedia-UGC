import type {
  CameraMovement,
  CharacterAgeGroup,
  CharacterGender,
  ContentConcept,
  CreativeStyle,
  FigureArtDirection,
  GenerationExperience,
  GuidedGenerationConfig,
  IdeationResult,
  GenerationProvider,
  GenerationRunStatus,
  GenerationVariantStatus,
  ImageModelOption,
  KieAnalysisModel,
  OutputQuality,
  ProductCategory,
  ShotEnvironment,
  WorkspaceTab,
  VideoDuration,
  VideoModelOption,
} from '@/lib/generation/types'
import type { Locale } from '@/lib/i18n'

export type AuthenticatedUserSummary = {
  email: string | null
  id: string
}

export type GenerationConfigSnapshot = {
  activeTab: WorkspaceTab
  batchSize: 1 | 2 | 3 | 4
  cameraMovement: CameraMovement | null
  characterAgeGroup: CharacterAgeGroup
  characterGender: CharacterGender
  creativeStyle: CreativeStyle
  experience: GenerationExperience
  figureArtDirection: FigureArtDirection
  guided: GuidedGenerationConfig | null
  imageModel: ImageModelOption
  outputQuality: OutputQuality
  productCategory: ProductCategory
  shotEnvironment: ShotEnvironment
  subjectMode: 'product-only' | 'lifestyle'
  textPrompt: string
  videoDuration: VideoDuration
  videoModel: VideoModelOption
}

export type ProjectConfigSnapshot = GenerationConfigSnapshot

export type GuidedProjectInputSnapshot = {
  analysisModel: KieAnalysisModel
  contentConcept: ContentConcept
  productUrl: string
}

export type IdeationInputSnapshot = {
  analysisModel: KieAnalysisModel
  briefText: string
  contentConcept: ContentConcept
  heroImageName: string | null
  heroImageUrl: string | null
  outputLanguage?: Locale
  productUrl: string | null
}

export type SavedIdeationRecord = {
  createdAt: string
  id: string
  inputSnapshot: IdeationInputSnapshot
  result: IdeationResult
  userId: string
}

export type SavedOutputRecord = {
  createdAt: string
  fileSize: number
  id: string
  label: string
  mimeType: string
  originalName: string
  runId: string
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
  variantIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16
}

export type GenerationRunRecord = {
  completedAt: string | null
  configSnapshot: GenerationConfigSnapshot
  createdAt: string
  id: string
  model: string
  promptSnapshot: string
  provider: GenerationProvider
  status: GenerationRunStatus
  userId: string
  variants: GenerationVariantRecord[]
  workspace: WorkspaceTab
}

export type GenerationRunBundle = {
  outputs: SavedOutputRecord[]
  run: GenerationRunRecord
}

export type SavedOutputHistoryEntry = {
  output: SavedOutputRecord
  run: Pick<
    GenerationRunRecord,
    'completedAt' | 'createdAt' | 'id' | 'model' | 'promptSnapshot' | 'provider' | 'status' | 'workspace'
  >
  variant: Pick<
    GenerationVariantRecord,
    'completedAt' | 'createdAt' | 'error' | 'id' | 'profile' | 'prompt' | 'status' | 'taskId' | 'variantIndex'
  >
}

export type SavedIdeationHistoryEntry = SavedIdeationRecord
