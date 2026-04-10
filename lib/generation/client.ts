import type {
  AssetSlot,
  BatchSize,
  ContentConcept,
  GenerationSnapshot,
  GuidedAnalysisPlan,
  KieAnalysisModel,
  NamedAssetKey,
  SubmittedAssetDescriptor,
  WorkspaceTab,
} from '@/lib/generation/types'

const imageWorkspaceNamedAssets: NamedAssetKey[] = [
  'face1',
  'face2',
  'clothing',
  'location',
]

const videoWorkspaceNamedAssets: NamedAssetKey[] = [
  'face1',
  'face2',
  'clothing',
  'location',
  'endFrame',
]

function getWorkspaceNamedAssetKeys(workspace: WorkspaceTab) {
  return workspace === 'video'
    ? videoWorkspaceNamedAssets
    : imageWorkspaceNamedAssets
}

function getPrimaryReference(snapshot: GenerationSnapshot) {
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

  const hasPrimaryReference = Boolean(getPrimaryReference(snapshot))
  const hasPrompt = snapshot.textPrompt.trim().length > 0

  if (!hasPrimaryReference && !hasPrompt) {
    return {
      canGenerate: false,
      reason:
        snapshot.activeTab === 'video'
          ? 'Add a start-frame reference or describe the motion prompt first.'
          : 'Add a reference image or describe the image prompt first.',
    }
  }

  return {
    canGenerate: true,
    reason: null,
  }
}

export function buildGenerationFormData(snapshot: GenerationSnapshot) {
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
  formData.append('outputQuality', snapshot.outputQuality)
  formData.append('cameraMovement', snapshot.cameraMovement ?? '')

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

  formData.append('assetManifest', JSON.stringify(assetManifest))

  return { assetManifest, formData }
}

export function buildGuidedAnalysisFormData(input: {
  analysisModel: KieAnalysisModel
  contentConcept: ContentConcept
  heroAsset: AssetSlot
  productUrl: string
  shotCount: BatchSize
}) {
  if (!input.heroAsset.file) {
    throw new Error('A hero product image is required.')
  }

  const formData = new FormData()

  formData.append('analysisModel', input.analysisModel)
  formData.append('contentConcept', input.contentConcept)
  formData.append('heroImage', input.heroAsset.file)
  formData.append('productUrl', input.productUrl)
  formData.append('shotCount', String(input.shotCount))

  return { formData }
}

export function buildGuidedGenerationFormData(input: {
  analysisModel: KieAnalysisModel
  contentConcept: ContentConcept
  heroAsset: AssetSlot
  imageModel: GenerationSnapshot['imageModel']
  outputQuality: GenerationSnapshot['outputQuality']
  plan: GuidedAnalysisPlan
  productUrl: string
}) {
  if (!input.heroAsset.file) {
    throw new Error('A hero product image is required.')
  }

  const formData = new FormData()
  const assetManifest: SubmittedAssetDescriptor[] = [
    {
      fieldName: 'product_guided_hero',
      kind: 'product',
      label: input.heroAsset.label,
      order: 100,
      productId: 'guided-hero',
    },
  ]
  const firstShot = input.plan.shots[0]

  formData.append('experience', 'guided')
  formData.append('workspace', 'image')
  formData.append('imageModel', input.imageModel)
  formData.append('videoModel', 'veo-3.1')
  formData.append('productCategory', input.plan.productCategory)
  formData.append('creativeStyle', input.plan.creativeStyle)
  formData.append('subjectMode', firstShot?.subjectMode ?? 'product-only')
  formData.append('shotEnvironment', firstShot?.shotEnvironment ?? 'indoor')
  formData.append('characterGender', 'any')
  formData.append('characterAgeGroup', 'any')
  formData.append('figureArtDirection', 'none')
  formData.append('batchSize', String(input.plan.shots.length))
  formData.append('textPrompt', '')
  formData.append('videoDuration', 'base')
  formData.append('outputQuality', input.outputQuality)
  formData.append('cameraMovement', '')
  formData.append('guidedShots', JSON.stringify(input.plan.shots))
  formData.append('guidedSummary', input.plan.summary)
  formData.append('guidedContentConcept', input.contentConcept)
  formData.append('analysisModel', input.analysisModel)
  formData.append('productUrl', input.productUrl)
  formData.append('assetManifest', JSON.stringify(assetManifest))
  formData.append('product_guided_hero', input.heroAsset.file)

  return { assetManifest, formData }
}

export function formatBytes(size: number | null) {
  if (!size) {
    return null
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
