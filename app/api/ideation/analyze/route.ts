import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  contentConcepts,
  normalizeKieAnalysisModel,
} from '@/lib/generation/guided'
import { analyzeContentIdeation } from '@/lib/generation/kie-ideation'
import { getKieApiKey, uploadFileToKie } from '@/lib/generation/kie'
import { scrapeProductPage } from '@/lib/generation/product-page'
import { createSavedIdeationForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

const supportedIdeationHeroExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
])

const supportedIdeationHeroMimeTypes = new Set([
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

  return typeof value === 'string' ? value.trim() : ''
}

function isSupportedIdeationHeroImage(file: File) {
  if (supportedIdeationHeroMimeTypes.has(file.type)) {
    return true
  }

  const normalizedName = file.name.toLowerCase()

  return Array.from(supportedIdeationHeroExtensions).some((extension) =>
    normalizedName.endsWith(extension),
  )
}

function getIdeationAnalyzeErrorStatus(message: string) {
  if (message.includes('timed out')) {
    return 504
  }

  if (message.includes('KIE_API_KEY') || message.includes('configured')) {
    return 500
  }

  if (/KIE|credit|credits|balance|pricing/i.test(message)) {
    return 503
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
    const briefText = readOptionalString(formData, 'briefText')
    const contentConcept = readString(formData, 'contentConcept')
    const productUrl = readOptionalString(formData, 'productUrl')
    const hasHeroImage = heroImage instanceof File && heroImage.size > 0

    if (!hasHeroImage && !productUrl) {
      throw new Error('Add a hero product image or a product URL.')
    }

    if (hasHeroImage && !isSupportedIdeationHeroImage(heroImage)) {
      throw new Error('Hero image must be a PNG, JPG, JPEG, WEBP, or GIF file.')
    }

    if (!analysisModel) {
      throw new Error('Unsupported ideation analysis model.')
    }

    if (!contentConcepts.includes(contentConcept as (typeof contentConcepts)[number])) {
      throw new Error('Unsupported content concept.')
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
    const heroImageUrl = hasHeroImage
      ? await uploadFileToKie(apiKey, heroImage, 'image')
      : null
    const result = await analyzeContentIdeation({
      analysisModel,
      briefText,
      contentConcept: contentConcept as (typeof contentConcepts)[number],
      heroImageUrl,
      productPage,
    })
    const savedIdeation = await createSavedIdeationForUser({
      inputSnapshot: {
        analysisModel,
        briefText,
        contentConcept: contentConcept as (typeof contentConcepts)[number],
        heroImageName: hasHeroImage ? heroImage.name : null,
        heroImageUrl,
        productUrl: productUrl || null,
      },
      result,
      userId: user.id,
    })

    return NextResponse.json({
      createdAt: savedIdeation.createdAt,
      result: savedIdeation.result,
      savedIdeationId: savedIdeation.id,
      warning,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to analyze content ideation.'

    return NextResponse.json(
      { error: message },
      {
        status: getIdeationAnalyzeErrorStatus(message),
      },
    )
  }
}
