import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { POST } from '@/app/api/guided/creative-plan/route'

function createRequest(formData: FormData) {
  return new Request('http://localhost/api/guided/creative-plan', {
    body: formData,
    method: 'POST',
  })
}

function buildBaseFormData() {
  const formData = new FormData()

  formData.append('audience', 'broad')
  formData.append('goal', 'conversion')
  formData.append('platform', 'tiktok')
  formData.append('productHighlights', 'hydrating finish and easy application')
  formData.append('tone', 'clean and confident')
  formData.append('creativeStyle', 'ugc-lifestyle')
  formData.append('productCategory', 'cosmetics')
  formData.append('guidedSummary', 'Show the product benefit from hook to CTA.')
  formData.append('outputLanguage', 'en')
  formData.append(
    'guidedShots',
    JSON.stringify([
      {
        prompt: 'Creator opens the product and reacts to the finish.',
        shotEnvironment: 'indoor',
        slug: 'hook-shot',
        subjectMode: 'lifestyle',
        tags: ['hook'],
        title: 'Hook Shot',
      },
      {
        prompt: 'Close on the product packaging and CTA.',
        shotEnvironment: 'indoor',
        slug: 'cta-shot',
        subjectMode: 'product-only',
        tags: ['cta'],
        title: 'CTA Shot',
      },
    ]),
  )

  return formData
}

describe('POST /api/guided/creative-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
  })

  it('builds a creative plan from the guided plan and brief', async () => {
    const response = await POST(createRequest(buildBaseFormData()))
    const payload = (await response.json()) as {
      creativePlan?: {
        ctaOptions: Array<{ id: string }>
        storyboard: Array<{ renderPrompt: string; slug: string; voiceoverLine: string }>
        voiceoverScript: string
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creativePlan?.ctaOptions.length).toBeGreaterThan(0)
    expect(payload.creativePlan?.storyboard).toHaveLength(2)
    expect(payload.creativePlan?.storyboard[0]?.renderPrompt).not.toContain('Objective:')
    expect(payload.creativePlan?.storyboard[0]?.renderPrompt).toContain(
      'Include clear spoken voiceover that says exactly: "Here is the product that delivers hydrating finish and easy application."',
    )
    expect(payload.creativePlan?.storyboard[1]?.renderPrompt).toContain(
      'End with a spoken CTA that says exactly: "Shop now on TikTok".',
    )
    expect(payload.creativePlan?.storyboard[1]?.renderPrompt).toContain(
      'If any readable on-screen CTA text appears, it must be exactly "Shop now on TikTok" in Latin letters only. Do not translate or replace it.',
    )
    expect(payload.creativePlan?.storyboard[0]?.renderPrompt).toContain(
      'Avoid foreign-language characters, translated captions, extra UI text, logos, or watermarks.',
    )
    expect(payload.creativePlan?.voiceoverScript).not.toContain('Hook the viewer fast')
    expect(payload.creativePlan?.storyboard[0]?.voiceoverLine).toBe(
      'Here is the product that delivers hydrating finish and easy application.',
    )
  })

  it('keeps instructional highlight text out of the final voiceover line', async () => {
    const formData = buildBaseFormData()

    formData.set(
      'productHighlights',
      'yakinkan pengguna dengan bahasa yang jelas terhadap audiens terhadap keunggulan produk',
    )

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as {
      creativePlan?: {
        storyboard: Array<{ voiceoverLine: string }>
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creativePlan?.storyboard[0]?.voiceoverLine).toBe(
      'Here is the product that delivers the clearest product benefit.',
    )
  })

  it('summarizes long product highlight lists into a usable voiceover benefit', async () => {
    const formData = buildBaseFormData()

    formData.set(
      'guidedSummary',
      'Portable massage gun (UNEED UMG102) — compact handheld percussive therapy device in a dark matte finish with ergonomic pistol grip.',
    )
    formData.set(
      'productHighlights',
      '3200RPM HIGH ENERGY MAGNETIC MOTOR, DEEP MUSCLE RELAXATION, 6 SPEED ADJUSTMENT MODE, 4 TYPE NOZZLE MASSAGE HEAD, LIGHT & COMPACT TRAVEL SIZE',
    )

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as {
      creativePlan?: {
        storyboard: Array<{ voiceoverLine: string }>
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creativePlan?.storyboard[0]?.voiceoverLine).toBe(
      'Here is the product that delivers 3200RPM HIGH ENERGY MAGNETIC MOTOR, DEEP MUSCLE RELAXATION, and 6 SPEED ADJUSTMENT MODE.',
    )
  })

  it('builds Indonesian voiceover lines when the output language is id', async () => {
    const formData = buildBaseFormData()

    formData.set('outputLanguage', 'id')
    formData.set(
      'guidedSummary',
      'Tampilkan manfaat produk dari hook hingga penutup dengan fokus pada pemulihan setelah olahraga.',
    )

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as {
      creativePlan?: {
        ctaOptions: Array<{ label: string }>
        storyboard: Array<{ renderPrompt: string; voiceoverLine: string }>
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creativePlan?.storyboard[0]?.voiceoverLine).toBe(
      'Inilah produk yang menghadirkan hydrating finish and easy application.',
    )
    expect(payload.creativePlan?.storyboard[0]?.renderPrompt).toContain(
      'Spoken narration language: Bahasa Indonesia only, with natural Indonesian pronunciation.',
    )
    expect(payload.creativePlan?.ctaOptions[0]?.label).toBe(
      'Belanja sekarang di TikTok',
    )
  })

  it('rejects unsupported brief values', async () => {
    const formData = buildBaseFormData()

    formData.set('goal', 'viral')

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toContain('Unsupported creative goal')
  })
})
