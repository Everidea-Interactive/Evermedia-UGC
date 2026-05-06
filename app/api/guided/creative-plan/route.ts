import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { createCreativePlan } from '@/lib/generation/creative-planning'
import { normalizeGuidedAnalysisPlan } from '@/lib/generation/guided'
import type { CreativeBrief, GuidedAnalysisPlan } from '@/lib/generation/types'

export const runtime = 'nodejs'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    throw new Error(`Missing required form field: ${key}.`)
  }

  return value
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

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const brief = readCreativeBrief(formData)
    const plan = readGuidedPlan(formData)
    const creativePlan = createCreativePlan({
      brief,
      plan,
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
