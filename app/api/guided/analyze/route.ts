import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  clampGuidedShotCount,
  contentConcepts,
  normalizeKieAnalysisModel,
} from '@/lib/generation/guided'
import { analyzeGuidedProductPlan } from '@/lib/generation/kie-analysis'
import { getKieApiKey, uploadFileToKie } from '@/lib/generation/kie'
import { scrapeProductPage } from '@/lib/generation/product-page'

export const runtime = 'nodejs'

const supportedGuidedHeroExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
])

const supportedGuidedHeroMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
])

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

function isSupportedGuidedHeroImage(file: File) {
  if (supportedGuidedHeroMimeTypes.has(file.type)) {
    return true
  }

  const normalizedName = file.name.toLowerCase()

  return Array.from(supportedGuidedHeroExtensions).some((extension) =>
    normalizedName.endsWith(extension),
  )
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

    if (!(heroImage instanceof File) || heroImage.size === 0) {
      throw new Error('A hero product image is required.')
    }

    if (!isSupportedGuidedHeroImage(heroImage)) {
      throw new Error('Hero image must be a PNG, JPG, JPEG, WEBP, or GIF file.')
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

    const apiKey = getKieApiKey()
    const heroImageUrl = await uploadFileToKie(apiKey, heroImage, 'image')
    const plan = await analyzeGuidedProductPlan({
      analysisModel,
      contentConcept: contentConcept as (typeof contentConcepts)[number],
      heroImageUrl,
      productPage,
      shotCount: clampGuidedShotCount(shotCount),
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
