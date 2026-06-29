import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  clampGuidedShotCount,
  contentConcepts,
  normalizeKieAnalysisModel,
} from '@/lib/generation/guided'
import {
  getImageUploadSupportProfile,
  isFileSupportedByImageProfile,
} from '@/lib/generation/image-upload-support'
import { analyzeGuidedProductPlan } from '@/lib/generation/kie-analysis'
import { getKieApiKey, uploadImageFileToKieBase64 } from '@/lib/generation/kie'
import { scrapeProductPage } from '@/lib/generation/product-page'
import { normalizeImageFileForProfile } from '@/lib/generation/upload-normalization'

export const runtime = 'nodejs'

const guidedHeroImageProfile = getImageUploadSupportProfile('guided-hero')
const guidedHeroImageErrorMessage =
  'Hero image must be a PNG, JPG, JPEG, WEBP, or GIF file. HEIC, HEIF, AVIF, BMP, and TIFF are converted automatically.'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    throw new Error(`Missing required form field: ${key}.`)
  }

  return value
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readOptionalEnum<T extends string>(
  formData: FormData,
  key: string,
  values: readonly T[],
) {
  const value = readOptionalString(formData, key)

  if (!value) {
    return null
  }

  if (!values.includes(value as T)) {
    throw new Error(`Invalid value for ${key}.`)
  }

  return value as T
}

function isSupportedGuidedHeroImage(file: File) {
  return isFileSupportedByImageProfile(file, guidedHeroImageProfile)
}

function getGuidedAnalyzeErrorStatus(message: string) {
  if (message.includes('timed out')) {
    return 504
  }

  if (message.includes('KIE_API_KEY') || message.includes('configured')) {
    return 500
  }

  return 400
}

async function createGeminiHeroImageDataUrl(file: File) {
  const source = Buffer.from(await file.arrayBuffer())

  try {
    const optimized = await sharp(source)
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 70,
        mozjpeg: true,
      })
      .toBuffer()

    return `data:image/jpeg;base64,${optimized.toString('base64')}`
  } catch {
    const contentType = file.type || 'application/octet-stream'
    return `data:${contentType};base64,${source.toString('base64')}`
  }
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const heroImage = formData.get('heroImage')
    const analysisModel = normalizeKieAnalysisModel(
      readString(formData, 'analysisModel'),
    )
    const contentConcept = readString(formData, 'contentConcept')
    const shotCount = Number.parseInt(readString(formData, 'shotCount'), 10)
    const productUrl = readOptionalString(formData, 'productUrl')
    const workspace =
      readOptionalEnum(formData, 'workspace', ['image', 'video'] as const) ??
      'image'
    const videoDuration =
      readOptionalEnum(formData, 'videoDuration', ['base', 'extended'] as const) ??
      'base'
    const videoModel =
      readOptionalEnum(
        formData,
        'videoModel',
        [
          'veo-3.1',
          'grok-imagine-video-1.5',
          'seedance-1.5-pro',
          'seedance-2-mini',
          'seedance-2',
          'kling-3.0',
        ] as const,
      ) ?? 'veo-3.1'
    const orientationPreference = readOptionalEnum(
      formData,
      'orientationPreference',
      ['auto', 'portrait', 'landscape', 'square'] as const,
    )
    const cameraMovement = readOptionalEnum(
      formData,
      'cameraMovement',
      ['orbit', 'dolly', 'drone', 'crash-zoom', 'macro'] as const,
    )
    const shouldUseInlineHeroImage = analysisModel === 'gemini-2.5-flash'

    if (!(heroImage instanceof File) || heroImage.size === 0) {
      throw new Error('A hero product image is required.')
    }

    const normalizedHeroImage = await normalizeImageFileForProfile(
      heroImage,
      guidedHeroImageProfile,
    )

    if (!isSupportedGuidedHeroImage(normalizedHeroImage)) {
      throw new Error(guidedHeroImageErrorMessage)
    }

    if (!analysisModel) {
      throw new Error('Unsupported guided analysis model.')
    }

    if (!contentConcepts.includes(contentConcept as (typeof contentConcepts)[number])) {
      throw new Error('Unsupported content concept.')
    }

    if (!Number.isInteger(shotCount) || shotCount < 1 || shotCount > 4) {
      throw new Error('Shot count must be between 1 and 4.')
    }

    let warning: string | null = null
    let productPage = null

    if (productUrl) {
      try {
        productPage = await scrapeProductPage(productUrl)
      } catch (error) {
        warning =
          error instanceof Error
            ? `Product page enrichment skipped: ${error.message}`
            : 'Product page enrichment skipped.'
      }
    }

    const heroImageDataUrl = shouldUseInlineHeroImage
      ? await createGeminiHeroImageDataUrl(normalizedHeroImage)
      : null
    const heroImageUrl = shouldUseInlineHeroImage
      ? 'inline://guided-hero-image'
      : await uploadImageFileToKieBase64(
          getKieApiKey(),
          normalizedHeroImage,
          'evermedia-ugc/image',
        )
    const guidedShotCount =
      workspace === 'video' ? 1 : clampGuidedShotCount(shotCount)
    const plan = await analyzeGuidedProductPlan({
      analysisModel,
      contentConcept: contentConcept as (typeof contentConcepts)[number],
      cameraMovement,
      heroImageDataUrl,
      heroImageUrl,
      orientationPreference: orientationPreference ?? undefined,
      productPage,
      shotCount: guidedShotCount,
      videoDuration,
      videoModel,
      workspace,
    })

    return NextResponse.json({
      plan,
      warning,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to analyze the product.'

    return NextResponse.json(
      { error: message },
      {
        status: getGuidedAnalyzeErrorStatus(message),
      },
    )
  }
}
