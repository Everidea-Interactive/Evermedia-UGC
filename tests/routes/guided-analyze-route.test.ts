import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', () => ({
  getKieApiKey: vi.fn(),
  uploadFileToKie: vi.fn(),
}))

vi.mock('@/lib/generation/kie-analysis', () => ({
  analyzeGuidedProductPlan: vi.fn(),
}))

vi.mock('@/lib/generation/product-page', () => ({
  scrapeProductPage: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { analyzeGuidedProductPlan } from '@/lib/generation/kie-analysis'
import { getKieApiKey, uploadFileToKie } from '@/lib/generation/kie'
import { scrapeProductPage } from '@/lib/generation/product-page'
import { POST } from '@/app/api/guided/analyze/route'

const guidedPlan = {
  creativeStyle: 'tv-commercial' as const,
  productCategory: 'cosmetics' as const,
  shots: [
    {
      prompt: 'Prompt 1',
      shotEnvironment: 'indoor' as const,
      slug: 'shot-1',
      subjectMode: 'product-only' as const,
      tags: ['hero'],
      title: 'Shot 1',
    },
  ],
  summary: 'Guided summary',
}

function createRequest(formData: FormData) {
  return new Request('http://localhost/api/guided/analyze', {
    body: formData,
    method: 'POST',
  })
}

function buildBaseFormData() {
  const formData = new FormData()

  formData.append('analysisModel', 'gemini-2.5-flash')
  formData.append('contentConcept', 'affiliate')
  formData.append('heroImage', new File(['image'], 'hero.png', { type: 'image/png' }))
  formData.append('shotCount', '1')

  return formData
}

describe('POST /api/guided/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
    })
    vi.mocked(getKieApiKey).mockReturnValue('test-key')
    vi.mocked(uploadFileToKie).mockResolvedValue('https://files.example.com/hero.png')
    vi.mocked(analyzeGuidedProductPlan).mockResolvedValue(guidedPlan)
  })

  it('analyzes successfully with only the uploaded hero image', async () => {
    const response = await POST(createRequest(buildBaseFormData()))

    expect(response.status).toBe(200)
    expect(scrapeProductPage).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImageUrl: 'https://files.example.com/hero.png',
        productPage: null,
      }),
    )
  })

  it('uses scraped product page context when the product URL is reachable', async () => {
    const formData = buildBaseFormData()

    formData.append('productUrl', 'https://example.com/product')
    vi.mocked(scrapeProductPage).mockResolvedValue({
      brand: 'Brand',
      currency: 'USD',
      description: 'Description',
      images: ['https://example.com/image.png'],
      jsonLdName: 'Product Name',
      ogDescription: 'OG description',
      ogTitle: 'OG title',
      price: '29.99',
      title: 'Title',
      url: 'https://example.com/product',
    })

    const response = await POST(createRequest(formData))

    expect(response.status).toBe(200)
    expect(scrapeProductPage).toHaveBeenCalledWith('https://example.com/product')
    expect(analyzeGuidedProductPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        productPage: expect.objectContaining({
          brand: 'Brand',
          url: 'https://example.com/product',
        }),
      }),
    )
  })

  it('returns a non-blocking warning when product page scraping fails', async () => {
    const formData = buildBaseFormData()

    formData.append('productUrl', 'https://example.com/product')
    vi.mocked(scrapeProductPage).mockRejectedValue(new Error('Timed out'))

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as {
      plan: typeof guidedPlan
      warning: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.warning).toContain('Timed out')
    expect(analyzeGuidedProductPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        productPage: null,
      }),
    )
  })

  it('rejects unsupported models before calling the KIE adapter', async () => {
    const formData = buildBaseFormData()

    formData.set('analysisModel', 'opus-tier')

    const response = await POST(createRequest(formData))

    expect(response.status).toBe(400)
    expect(uploadFileToKie).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).not.toHaveBeenCalled()
  })

  it('rejects unsupported hero image formats before calling KIE', async () => {
    const formData = buildBaseFormData()

    formData.set(
      'heroImage',
      new File(['image'], 'hero.svg', { type: 'image/svg+xml' }),
    )

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(400)
    expect(payload.error).toContain('PNG, JPG, JPEG, WEBP, or GIF')
    expect(uploadFileToKie).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).not.toHaveBeenCalled()
  })
})
