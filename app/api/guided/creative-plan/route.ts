import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { createCreativePlan } from '@/lib/generation/creative-planning'
import { normalizeGuidedAnalysisPlan } from '@/lib/generation/guided'
import { normalizeVideoDurationForModel } from '@/lib/generation/model-mapping'
import type {
  CreativeBrief,
  GuidedAnalysisPlan,
  VideoDuration,
  VideoModelOption,
} from '@/lib/generation/types'
import { normalizeLocale, type Locale } from '@/lib/i18n'

export const runtime = 'nodejs'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    throw new Error(`Missing required form field: ${key}.`)
  }

  return value
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : null
}

function readOptionalVideoDuration(formData: FormData, key: string) {
  const value = readOptionalString(formData, key)?.trim()

  if (!value) {
    return null
  }

  if (value === 'base' || value === 'extended') {
    return value as VideoDuration
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function readCreativeBrief(formData: FormData): CreativeBrief {
  const audience = readString(formData, 'audience')
  const goal = readString(formData, 'goal')
  const platform = readString(formData, 'platform')
  const productHighlights = readString(formData, 'productHighlights')
  const tone = readString(formData, 'tone')

  if (
    ![
      'broad',
      'gen-z',
      'young-professionals',
      'beauty-shoppers',
      'parents',
      'fitness-shoppers',
    ].includes(audience)
  ) {
    throw new Error('Unsupported audience preset.')
  }

  if (!['awareness', 'consideration', 'conversion'].includes(goal)) {
    throw new Error('Unsupported creative goal.')
  }

  if (
    ![
      'tiktok',
      'instagram-reels',
      'youtube-shorts',
      'meta-ads',
      'shopee',
      'tokopedia',
    ].includes(platform)
  ) {
    throw new Error('Unsupported platform preset.')
  }

  return {
    audience: audience as CreativeBrief['audience'],
    goal: goal as CreativeBrief['goal'],
    platform: platform as CreativeBrief['platform'],
    productHighlights: productHighlights.trim(),
    tone: tone.trim(),
  }
}

function readGuidedPlan(formData: FormData): GuidedAnalysisPlan {
  return normalizeGuidedAnalysisPlan({
    creativeStyle: readString(formData, 'creativeStyle'),
    productCategory: readString(formData, 'productCategory'),
    shots: JSON.parse(readString(formData, 'guidedShots')) as unknown,
    summary: readString(formData, 'guidedSummary'),
  })
}

function readOutputLanguage(formData: FormData): Locale {
  return normalizeLocale(readString(formData, 'outputLanguage'))
}

function readVideoModel(formData: FormData): VideoModelOption {
  const value = readOptionalString(formData, 'videoModel')

  if (
    value === 'grok-imagine-video-1.5' ||
    value === 'kling-3.0' ||
    value === 'seedance-1.5-pro' ||
    value === 'seedance-2' ||
    value === 'seedance-2-mini' ||
    value === 'veo-3.1'
  ) {
    return value
  }

  return 'veo-3.1'
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const brief = readCreativeBrief(formData)
    const plan = readGuidedPlan(formData)
    const outputLanguage = readOutputLanguage(formData)
    const videoModel = readVideoModel(formData)
    const videoDuration = normalizeVideoDurationForModel(
      videoModel,
      readOptionalVideoDuration(formData, 'videoDuration'),
    )
    const creativePlan = createCreativePlan({
      brief,
      outputLanguage,
      plan,
      videoDuration,
      videoModel,
    })

    return NextResponse.json({
      creativePlan,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to build the guided creative plan.',
      },
      { status: 400 },
    )
  }
}
