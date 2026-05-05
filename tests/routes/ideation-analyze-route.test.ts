import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', () => ({
  getKieApiKey: vi.fn(),
  uploadFileToKie: vi.fn(),
}))

vi.mock('@/lib/generation/kie-ideation', () => ({
  analyzeContentIdeation: vi.fn(),
}))

vi.mock('@/lib/generation/product-page', () => ({
  scrapeProductPage: vi.fn(),
}))

vi.mock('@/lib/persistence/repository', () => ({
  createSavedIdeationForUser: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { analyzeContentIdeation } from '@/lib/generation/kie-ideation'
import { getKieApiKey, uploadFileToKie } from '@/lib/generation/kie'
import { scrapeProductPage } from '@/lib/generation/product-page'
import { createSavedIdeationForUser } from '@/lib/persistence/repository'
import { POST } from '@/app/api/ideation/analyze/route'

const ideationResult = {
  concepts: [
    {
      angle: 'Angle 1',
      audience: 'Audience 1',
      cta: 'CTA 1',
      hook: 'Hook 1',
      keyMessage: 'Message 1',
      title: 'Concept 1',
      visualDirection: 'Visual 1',
    },
    {
      angle: 'Angle 2',
      audience: 'Audience 2',
      cta: 'CTA 2',
      hook: 'Hook 2',
      keyMessage: 'Message 2',
      title: 'Concept 2',
      visualDirection: 'Visual 2',
    },
    {
      angle: 'Angle 3',
      audience: 'Audience 3',
      cta: 'CTA 3',
      hook: 'Hook 3',
      keyMessage: 'Message 3',
      title: 'Concept 3',
      visualDirection: 'Visual 3',
    },
  ],
  summary: 'Three ideation concepts.',
}

function createRequest(formData: FormData) {
  return new Request('http://localhost/api/ideation/analyze', {
    body: formData,
    method: 'POST',
  })
}

function buildBaseFormData() {
  const formData = new FormData()

  formData.append('analysisModel', 'gemini-2.5-flash')
  formData.append('briefText', 'Premium acne serum for humid climates.')
  formData.append('contentConcept', 'affiliate')
  formData.append('heroImage', new File(['image'], 'hero.png', { type: 'image/png' }))
  formData.append('outputLanguage', 'id')
  formData.append('productUrl', 'https://example.com/product')

  return formData
}

describe('POST /api/ideation/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
    })
    vi.mocked(getKieApiKey).mockReturnValue('test-key')
    vi.mocked(uploadFileToKie).mockResolvedValue('https://files.example.com/hero.png')
    vi.mocked(analyzeContentIdeation).mockResolvedValue(ideationResult)
    vi.mocked(createSavedIdeationForUser).mockResolvedValue({
      createdAt: '2026-05-05T00:00:00.000Z',
      id: 'ideation-1',
      inputSnapshot: {
        analysisModel: 'gemini-2.5-flash',
        briefText: 'Premium acne serum for humid climates.',
        contentConcept: 'affiliate',
        heroImageName: 'hero.png',
        heroImageUrl: 'https://files.example.com/hero.png',
        productUrl: 'https://example.com/product',
      },
      result: ideationResult,
      userId: 'user-1',
    })
  })

  it('returns unauthorized when no authenticated user is present', async () => {
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue(null)

    const response = await POST(createRequest(buildBaseFormData()))

    expect(response.status).toBe(401)
  })

  it('analyzes and saves the ideation result', async () => {
    const response = await POST(createRequest(buildBaseFormData()))
    const payload = (await response.json()) as {
      result: typeof ideationResult
      savedIdeationId: string
      warning: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.savedIdeationId).toBe('ideation-1')
    expect(payload.result.summary).toBe('Three ideation concepts.')
    expect(analyzeContentIdeation).toHaveBeenCalledWith(
      expect.objectContaining({
        briefText: 'Premium acne serum for humid climates.',
        heroImageUrl: 'https://files.example.com/hero.png',
        outputLanguage: 'id',
      }),
    )
    expect(createSavedIdeationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
      }),
    )
  })

  it('returns a non-blocking warning when product page scraping fails', async () => {
    vi.mocked(scrapeProductPage).mockRejectedValue(new Error('Timed out'))

    const response = await POST(createRequest(buildBaseFormData()))
    const payload = (await response.json()) as {
      warning: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.warning).toContain('Timed out')
    expect(analyzeContentIdeation).toHaveBeenCalledWith(
      expect.objectContaining({
        productPage: null,
      }),
    )
  })

  it('rejects missing product URLs before ideation runs', async () => {
    const formData = buildBaseFormData()
    formData.delete('heroImage')
    formData.set('productUrl', '')

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toContain('hero product image or a product URL')
    expect(analyzeContentIdeation).not.toHaveBeenCalled()
  })

  it('allows missing written briefs and falls back to image-plus-page ideation', async () => {
    const formData = buildBaseFormData()
    formData.set('briefText', ' ')

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as { result?: typeof ideationResult }

    expect(response.status).toBe(200)
    expect(payload.result?.summary).toBe('Three ideation concepts.')
    expect(analyzeContentIdeation).toHaveBeenCalledWith(
      expect.objectContaining({
        briefText: '',
      }),
    )
  })

  it('rejects unsupported hero image formats before KIE upload', async () => {
    const formData = buildBaseFormData()
    formData.set('heroImage', new File(['svg'], 'hero.svg', { type: 'image/svg+xml' }))

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toContain('PNG, JPG, JPEG, WEBP, or GIF')
    expect(uploadFileToKie).not.toHaveBeenCalled()
  })

  it('allows image-only ideation analysis when no product URL is provided', async () => {
    const formData = buildBaseFormData()
    formData.set('productUrl', '')

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as {
      result?: typeof ideationResult
      warning?: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.result?.summary).toBe('Three ideation concepts.')
    expect(scrapeProductPage).not.toHaveBeenCalled()
    expect(uploadFileToKie).toHaveBeenCalled()
    expect(analyzeContentIdeation).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImageUrl: 'https://files.example.com/hero.png',
        productPage: null,
      }),
    )
    expect(createSavedIdeationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        inputSnapshot: expect.objectContaining({
          heroImageName: 'hero.png',
          heroImageUrl: 'https://files.example.com/hero.png',
          productUrl: null,
        }),
      }),
    )
  })

  it('allows link-only ideation analysis when no hero image is provided', async () => {
    const formData = buildBaseFormData()
    formData.delete('heroImage')

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as {
      result?: typeof ideationResult
      warning?: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.result?.summary).toBe('Three ideation concepts.')
    expect(scrapeProductPage).toHaveBeenCalledWith('https://example.com/product')
    expect(uploadFileToKie).not.toHaveBeenCalled()
    expect(analyzeContentIdeation).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImageUrl: null,
      }),
    )
    expect(createSavedIdeationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        inputSnapshot: expect.objectContaining({
          heroImageName: null,
          heroImageUrl: null,
          productUrl: 'https://example.com/product',
        }),
      }),
    )
  })
})
