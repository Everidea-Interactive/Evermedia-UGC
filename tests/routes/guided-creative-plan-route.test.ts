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
      email: 'user@example.com',
      id: 'user-1',
    })
  })

  it('builds a creative plan from the guided plan and brief', async () => {
    const response = await POST(createRequest(buildBaseFormData()))
    const payload = (await response.json()) as {
      creativePlan?: {
        ctaOptions: Array<{ id: string }>
        storyboard: Array<{ slug: string; renderPrompt: string }>
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creativePlan?.ctaOptions.length).toBeGreaterThan(0)
    expect(payload.creativePlan?.storyboard).toHaveLength(2)
    expect(payload.creativePlan?.storyboard[0]?.renderPrompt).toContain('Objective:')
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
