import type {
  AssetSlot,
  CarouselDraft,
  CreativeBrief,
  CreativePlan,
  BatchSize,
  CameraMovement,
  ContentConcept,
  ContentFormat,
  GenerationSnapshot,
  GuidedAnalysisPlan,
  KieAnalysisModel,
  NamedAssetKey,
  SubmittedAssetDescriptor,
  VideoDuration,
  VideoAudio,
  VideoModelOption,
  WorkspaceTab,
} from '@/lib/generation/types'
import type { Locale } from '@/lib/i18n'
import {
  getMaxVideoReferenceCount,
  supportsVideoEndFrameGuidance,
  supportsVideoFirstLastFramePair,
} from '@/lib/generation/model-mapping'

function normalizeResponsePreview(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return null
  }

  return normalized.slice(0, 120)
}

function isHtmlResponse(contentType: string, text: string) {
  return contentType.includes('text/html') || /^\s*</.test(text)
}

function getProxyErrorMessage(status: number, fallbackMessage: string) {
  if (status === 413) {
    return `${fallbackMessage} Uploaded generation assets exceeded the server upload limit.`
  }

  return null
}

export async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  const text = await response.text().catch(() => '')

  if (!text.trim()) {
    throw new Error(fallbackMessage)
  }

  try {
    return JSON.parse(text) as T
  } catch {
    if (isHtmlResponse(contentType, text)) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Your session expired. Sign in again and retry.')
      }

      const proxyErrorMessage = getProxyErrorMessage(
        response.status,
        fallbackMessage,
      )

      if (proxyErrorMessage) {
        throw new Error(proxyErrorMessage)
      }

      throw new Error(`${fallbackMessage} The server returned HTML instead of JSON.`)
    }

    const preview = normalizeResponsePreview(text)

    throw new Error(
      preview ? `${fallbackMessage} Unexpected response: ${preview}` : fallbackMessage,
    )
  }
}

const imageWorkspaceNamedAssets: NamedAssetKey[] = [
  'face1',
  'face2',
  'clothing',
  'location',
  'brandLogo',
]

function getWorkspaceNamedAssetKeys(workspace: WorkspaceTab) {
  return workspace === 'video' ? [] : imageWorkspaceNamedAssets
}

function getPrimaryReference(snapshot: GenerationSnapshot) {
  if (snapshot.activeTab === 'video') {
    if (
      supportsVideoFirstLastFramePair(snapshot.videoModel) &&
      snapshot.assets.firstFrame.file
    ) {
      return snapshot.assets.firstFrame
    }

    if (snapshot.videoModel === 'kling-3.0') {
      return null
    }

    return snapshot.videoReferences.find((slot) => slot.file) ?? null
  }

  const face1 = snapshot.assets.face1
  const primaryProduct = snapshot.products[0] ?? null

  if (snapshot.subjectMode === 'lifestyle' && face1.file) {
    return face1
  }

  return primaryProduct?.file ? primaryProduct : face1.file ? face1 : null
}

export function getAssetPreviewUrl(slot: AssetSlot) {
  return slot.previewUrl
}

export function getGenerationValidation(snapshot: GenerationSnapshot) {
  if (
    snapshot.activeTab === 'video' &&
    snapshot.videoModel === 'veo-3.1' &&
    snapshot.outputQuality === '4k'
  ) {
    return {
      canGenerate: false,
      reason: '4K Veo upgrades are deferred until a later phase.',
    }
  }

  if (
    snapshot.activeTab === 'video' &&
    snapshot.videoModel === 'seedance-1.5-pro' &&
    snapshot.outputQuality === '4k'
  ) {
    return {
      canGenerate: false,
      reason: '4K Seedance 1.5 Pro output is not supported.',
    }
  }

  const hasPrimaryReference = Boolean(getPrimaryReference(snapshot))
  const hasPrompt = snapshot.textPrompt.trim().length > 0

  if (!hasPrimaryReference && !hasPrompt) {
    return {
      canGenerate: false,
      reason:
        snapshot.activeTab === 'video'
          ? snapshot.videoModel === 'kling-3.0'
            ? 'Add a First Frame image or describe the motion prompt first.'
            : 'Add a start-frame reference or describe the motion prompt first.'
          : 'Add a reference image or describe the image prompt first.',
    }
  }

  return {
    canGenerate: true,
    reason: null,
  }
}

function serializeCarouselDraft(draft: CarouselDraft) {
  return {
    ...draft,
    panels: draft.panels.map((panel) => ({
      ...panel,
      imageAsset: panel.imageAsset ? { ...panel.imageAsset, file: null } : null,
    })),
  }
}

export function buildGenerationFormData(
  snapshot: GenerationSnapshot & { carouselDraft?: CarouselDraft },
) {
  const formData = new FormData()
  const assetManifest: SubmittedAssetDescriptor[] = []
  const namedAssetKeys = getWorkspaceNamedAssetKeys(snapshot.activeTab)

  formData.append('workspace', snapshot.activeTab)
  formData.append('imageModel', snapshot.imageModel)
  formData.append('videoModel', snapshot.videoModel)
  formData.append('productCategory', snapshot.productCategory)
  formData.append('creativeStyle', snapshot.creativeStyle)
  formData.append('subjectMode', snapshot.subjectMode)
  formData.append('shotEnvironment', snapshot.shotEnvironment)
  formData.append('characterGender', snapshot.characterGender)
  formData.append('characterAgeGroup', snapshot.characterAgeGroup)
  formData.append('figureArtDirection', snapshot.figureArtDirection)
  formData.append('batchSize', String(snapshot.batchSize))
  formData.append('textPrompt', snapshot.textPrompt)
  formData.append('videoDuration', snapshot.videoDuration)
  formData.append('videoAudio', snapshot.videoAudio)
  formData.append('outputQuality', snapshot.outputQuality)
  formData.append('cameraMovement', snapshot.cameraMovement ?? '')

  if (snapshot.activeTab === 'carousel') {
    const carouselDraft = snapshot.carouselDraft

    if (!carouselDraft || carouselDraft.panels.length === 0) {
      throw new Error('Carousel workspace requires at least one panel.')
    }

    for (const panel of carouselDraft.panels) {
      const hasManualImage =
        panel.imageMode === 'manual' && panel.imageAsset?.file
      const hasAiImage =
        panel.imageMode === 'ai' && panel.imagePrompt.trim().length > 0

      if (!hasManualImage && !hasAiImage) {
        throw new Error('Each carousel panel needs a usable image source.')
      }
    }

    formData.append('carouselDraft', JSON.stringify(serializeCarouselDraft(carouselDraft)))

    for (const panel of carouselDraft.panels) {
      if (panel.imageMode === 'manual' && panel.imageAsset?.file) {
        formData.append(`carousel_panel_image_${panel.id}`, panel.imageAsset.file)
      }
    }

    return { assetManifest: [], formData }
  }

  if (snapshot.activeTab === 'video') {
    const firstFrame = snapshot.assets.firstFrame
    if (
      supportsVideoFirstLastFramePair(snapshot.videoModel) &&
      firstFrame.file
    ) {
      const fieldName = 'asset_firstFrame'
      assetManifest.push({
        fieldName,
        key: 'firstFrame',
        kind: 'named',
        label: firstFrame.label,
        order: 90,
      })
      formData.append(fieldName, firstFrame.file)
    }

    snapshot.videoReferences
      .slice(0, getMaxVideoReferenceCount(snapshot.videoModel))
      .forEach((reference, index) => {
      if (!reference.file) {
        return
      }

      const fieldName = `video_reference_${index + 1}`
      assetManifest.push({
        fieldName,
        kind: 'product',
        label: reference.label,
        order: index,
        productId: reference.id,
      })
      formData.append(fieldName, reference.file)
      })

    const endFrame = snapshot.assets.endFrame
    if (
      supportsVideoEndFrameGuidance(snapshot.videoModel) &&
      (!supportsVideoFirstLastFramePair(snapshot.videoModel) ||
        snapshot.assets.firstFrame.file) &&
      endFrame.file
    ) {
      const fieldName = 'asset_endFrame'
      assetManifest.push({
        fieldName,
        key: 'endFrame',
        kind: 'named',
        label: endFrame.label,
        order: 100,
      })
      formData.append(fieldName, endFrame.file)
    }
  } else {
    for (const [order, key] of namedAssetKeys.entries()) {
      const slot = snapshot.assets[key]

      if (!slot.file) {
        continue
      }

      const fieldName = `asset_${key}`
      assetManifest.push({
        fieldName,
        key,
        kind: 'named',
        label: slot.label,
        order,
      })
      formData.append(fieldName, slot.file)
    }

    snapshot.products.forEach((product, index) => {
      if (!product.file) {
        return
      }

      const fieldName = `product_${product.id}`
      assetManifest.push({
        fieldName,
        kind: 'product',
        label: product.label,
        order: 100 + index,
        productId: product.id,
      })
      formData.append(fieldName, product.file)
    })
  }

  formData.append('assetManifest', JSON.stringify(assetManifest))

  return { assetManifest, formData }
}

export function buildGuidedAnalysisFormData(input: {
  analysisModel: KieAnalysisModel
  cameraMovement?: CameraMovement | null
  contentConcept: ContentConcept
  heroAsset: AssetSlot
  productUrl: string
  shotCount: BatchSize
  videoDuration?: VideoDuration
  videoAudio?: VideoAudio
  videoModel?: VideoModelOption
  workspace?: WorkspaceTab
}) {
  if (!input.heroAsset.file) {
    throw new Error('A hero product image is required.')
  }

  const formData = new FormData()
  const workspace = input.workspace ?? 'image'

  formData.append('analysisModel', input.analysisModel)
  formData.append('workspace', workspace)
  formData.append('contentConcept', input.contentConcept)
  formData.append('heroImage', input.heroAsset.file)
  formData.append('productUrl', input.productUrl)
  formData.append('shotCount', String(workspace === 'video' ? 1 : input.shotCount))
  formData.append('videoModel', input.videoModel ?? 'veo-3.1')
  formData.append('videoDuration', input.videoDuration ?? 'base')
  formData.append('videoAudio', input.videoAudio ?? 'no-audio')
  formData.append('cameraMovement', input.cameraMovement ?? '')

  return { formData }
}

export function buildGuidedGenerationFormData(input: {
  analysisModel: KieAnalysisModel
  creativeBrief: CreativeBrief
  creativePlan: CreativePlan | null
  cameraMovement?: CameraMovement | null
  contentConcept: ContentConcept
  endFrameAsset?: AssetSlot
  heroAsset: AssetSlot
  imageModel: GenerationSnapshot['imageModel']
  outputQuality: GenerationSnapshot['outputQuality']
  plan: GuidedAnalysisPlan
  productUrl: string
  videoDuration?: VideoDuration
  videoAudio?: VideoAudio
  videoModel?: VideoModelOption
  workspace?: WorkspaceTab
}) {
  if (!input.heroAsset.file) {
    throw new Error('A hero product image is required.')
  }

  const formData = new FormData()
  const workspace = input.workspace ?? 'image'
  const supportsEndFrame =
    workspace === 'video' &&
    supportsVideoEndFrameGuidance(input.videoModel ?? 'veo-3.1')
  const guidedShots =
    workspace === 'video' ? input.plan.shots.slice(0, 1) : input.plan.shots
  const assetManifest: SubmittedAssetDescriptor[] = []

  if (supportsEndFrame && input.endFrameAsset?.file) {
    assetManifest.push({
      fieldName: 'asset_endFrame',
      key: 'endFrame',
      kind: 'named',
      label: input.endFrameAsset.label,
      order: 4,
    })
  }

  assetManifest.push(
    {
      fieldName: 'product_guided_hero',
      kind: 'product',
      label: input.heroAsset.label,
      order: 100,
      productId: 'guided-hero',
    },
  )
  const firstShot = guidedShots[0]

  formData.append('experience', 'guided')
  formData.append('workspace', workspace)
  formData.append('imageModel', input.imageModel)
  formData.append('videoModel', input.videoModel ?? 'veo-3.1')
  formData.append('productCategory', input.plan.productCategory)
  formData.append('creativeStyle', input.plan.creativeStyle)
  formData.append('subjectMode', firstShot?.subjectMode ?? 'product-only')
  formData.append('shotEnvironment', firstShot?.shotEnvironment ?? 'indoor')
  formData.append('characterGender', 'any')
  formData.append('characterAgeGroup', 'any')
  formData.append('figureArtDirection', 'none')
  formData.append('batchSize', String(guidedShots.length))
  formData.append('textPrompt', '')
  formData.append('videoDuration', input.videoDuration ?? 'base')
  formData.append('videoAudio', input.videoAudio ?? 'no-audio')
  formData.append('outputQuality', input.outputQuality)
  formData.append('cameraMovement', input.cameraMovement ?? '')
  formData.append('guidedShots', JSON.stringify(guidedShots))
  formData.append('guidedSummary', input.plan.summary)
  formData.append('guidedContentConcept', input.contentConcept)
  formData.append('analysisModel', input.analysisModel)
  formData.append('creativeBrief', JSON.stringify(input.creativeBrief))
  formData.append('creativePlan', JSON.stringify(input.creativePlan))
  formData.append('productUrl', input.productUrl)
  formData.append('assetManifest', JSON.stringify(assetManifest))
  if (supportsEndFrame && input.endFrameAsset?.file) {
    formData.append('asset_endFrame', input.endFrameAsset.file)
  }
  formData.append('product_guided_hero', input.heroAsset.file)

  return { assetManifest, formData }
}

export function buildCreativePlanningFormData(input: {
  brief: CreativeBrief
  outputLanguage: Locale
  plan: GuidedAnalysisPlan
}) {
  const formData = new FormData()

  formData.append('audience', input.brief.audience)
  formData.append('goal', input.brief.goal)
  formData.append('platform', input.brief.platform)
  formData.append('productHighlights', input.brief.productHighlights)
  formData.append('tone', input.brief.tone)
  formData.append('creativeStyle', input.plan.creativeStyle)
  formData.append('productCategory', input.plan.productCategory)
  formData.append('guidedSummary', input.plan.summary)
  formData.append('guidedShots', JSON.stringify(input.plan.shots))
  formData.append('outputLanguage', input.outputLanguage)

  return { formData }
}

export function buildIdeationAnalysisFormData(input: {
  analysisModel: KieAnalysisModel
  briefText: string
  contentConcept: ContentConcept
  contentFormat: ContentFormat
  heroAsset: AssetSlot
  outputLanguage: Locale
  productUrl: string
}) {
  const briefText = input.briefText.trim()
  const productUrl = input.productUrl.trim()
  const heroFile = input.heroAsset.file

  if (!heroFile && !productUrl) {
    throw new Error('Add a hero product image or a product URL.')
  }

  const formData = new FormData()

  formData.append('analysisModel', input.analysisModel)
  formData.append('briefText', briefText)
  formData.append('contentConcept', input.contentConcept)
  formData.append('contentFormat', input.contentFormat)
  formData.append('outputLanguage', input.outputLanguage)
  if (heroFile) {
    formData.append('heroImage', heroFile)
  }
  if (productUrl) {
    formData.append('productUrl', productUrl)
  }

  return { formData }
}

export function formatBytes(size: number | null) {
  if (!size) {
    return null
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (size < 1024 * 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return `${(size / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`
}
