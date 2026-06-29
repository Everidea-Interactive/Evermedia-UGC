import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/auth/session', () => ({
  getOptionalAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/generation/kie', () => ({
  getKieApiKey: vi.fn(),
  uploadImageFileToKieBase64: vi.fn(),
}))

vi.mock('@/lib/generation/kie-analysis', () => ({
  analyzeGuidedProductPlan: vi.fn(),
}))

vi.mock('@/lib/generation/product-page', () => ({
  scrapeProductPage: vi.fn(),
}))

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { analyzeGuidedProductPlan } from '@/lib/generation/kie-analysis'
import { getKieApiKey, uploadImageFileToKieBase64 } from '@/lib/generation/kie'
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

async function createTiffFile() {
  const bytes = await sharp({
    create: {
      background: { alpha: 1, b: 220, g: 220, r: 220 },
      channels: 3,
      height: 2,
      width: 2,
    },
  })
    .tiff()
    .toBuffer()

  return new File([Uint8Array.from(bytes)], 'hero.tiff', { type: 'image/tiff' })
}

describe('POST /api/guided/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOptionalAuthenticatedUser).mockResolvedValue({
      canManageAccounts: false,
      email: 'user@example.com',
      id: 'user-1',
      roles: ['member'],
      status: 'active',
    })
    vi.mocked(getKieApiKey).mockReturnValue('test-key')
    vi.mocked(uploadImageFileToKieBase64).mockResolvedValue(
      'https://files.example.com/hero.png',
    )
    vi.mocked(analyzeGuidedProductPlan).mockResolvedValue(guidedPlan)
  })

  it('analyzes successfully with only the uploaded hero image', async () => {
    const response = await POST(createRequest(buildBaseFormData()))

    expect(response.status).toBe(200)
    expect(scrapeProductPage).not.toHaveBeenCalled()
    expect(uploadImageFileToKieBase64).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImageUrl: 'inline://guided-hero-image',
        heroImageDataUrl: expect.stringMatching(/^data:image\/(jpeg|png|webp|gif);base64,/),
        productPage: null,
      }),
    )
  })

  it('passes guided video context into the analysis adapter', async () => {
    const formData = buildBaseFormData()

    formData.append('workspace', 'video')
    formData.set('shotCount', '3')
    formData.append('videoModel', 'seedance-1.5-pro')
    formData.append('videoDuration', '12')
    formData.append('orientationPreference', 'portrait')
    formData.append('cameraMovement', 'dolly')

    const response = await POST(createRequest(formData))

    expect(response.status).toBe(200)
    expect(analyzeGuidedProductPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraMovement: 'dolly',
        orientationPreference: 'portrait',
        shotCount: 1,
        videoModel: 'seedance-1.5-pro',
        videoDuration: 12,
        workspace: 'video',
      }),
    )
  })

  it('rejects Haiku analysis model after model deprecation', async () => {
    const formData = buildBaseFormData()
    formData.set('analysisModel', 'claude-haiku-4-5')

    const response = await POST(createRequest(formData))

    expect(response.status).toBe(400)
    expect(uploadImageFileToKieBase64).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).not.toHaveBeenCalled()
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
    expect(uploadImageFileToKieBase64).not.toHaveBeenCalled()
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
    expect(uploadImageFileToKieBase64).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).not.toHaveBeenCalled()
  })

  it('accepts convertible raster hero image formats', async () => {
    const formData = buildBaseFormData()

    formData.set('heroImage', await createTiffFile())

    const response = await POST(createRequest(formData))

    expect(response.status).toBe(200)
    expect(uploadImageFileToKieBase64).not.toHaveBeenCalled()
    expect(analyzeGuidedProductPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImageDataUrl: expect.stringMatching(/^data:image\/jpeg;base64,/),
      }),
    )
  })

  it('returns a gateway timeout when the KIE upload hangs', async () => {
    const formData = buildBaseFormData()

    vi.mocked(uploadImageFileToKieBase64).mockRejectedValue(
      new Error('KIE base64 file upload timed out after 60 seconds.'),
    )

    const response = await POST(createRequest(formData))
    const payload = (await response.json()) as { error?: string }

    // Gemini path no longer uploads remote files; upload timeout should not block analyze.
    expect(response.status).toBe(200)
    expect(payload.error).toBeUndefined()
    expect(analyzeGuidedProductPlan).toHaveBeenCalled()
  })
})
