import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/kie/pricing/route'
import { resetKiePricingCache } from '@/lib/generation/kie-pricing'
import { KIE_PRICING_TTL_MS } from '@/lib/generation/pricing'

function createPricingResponse(records: unknown[]) {
  return new Response(
    JSON.stringify({
      code: 200,
      data: {
        records,
      },
      msg: 'success',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  )
}

function createPricingFetchMock() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const requestBody = JSON.parse(String(init?.body)) as {
      modelDescription: string
    }

    switch (requestBody.modelDescription) {
      case 'grok':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '4',
              modelDescription: 'grok-imagine, image-to-image',
              usdPrice: '0.02',
            },
            {
              creditPrice: '4.0',
              modelDescription: 'grok-imagine, text-to-image',
              usdPrice: '0.02',
            },
            {
              creditPrice: '1.6',
              modelDescription: 'grok-imagine, image-to-video, 480p',
              usdPrice: '0.008',
            },
            {
              creditPrice: '3',
              modelDescription: 'grok-imagine, image-to-video, 720p',
              usdPrice: '0.015',
            },
            {
              creditPrice: '1.6',
              modelDescription: 'grok-imagine, text-to-video, 480p',
              usdPrice: '0.008',
            },
            {
              creditPrice: '3',
              modelDescription: 'grok-imagine, text-to-video, 720p',
              usdPrice: '0.015',
            },
          ]),
        )
      case 'kling':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '55.0',
              modelDescription: 'kling 2.6, image-to-video, without audio-5.0s',
              usdPrice: '0.275',
            },
            {
              creditPrice: '110.0',
              modelDescription: 'kling 2.6, image-to-video, without audio-10.0s',
              usdPrice: '0.55',
            },
            {
              creditPrice: '55.0',
              modelDescription: 'kling 2.6, text-to-video, without audio-5.0s',
              usdPrice: '0.275',
            },
            {
              creditPrice: '110.0',
              modelDescription: 'kling 2.6, text-to-video, without audio-10.0s',
              usdPrice: '0.55',
            },
          ]),
        )
      case 'nano banana':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '8',
              modelDescription: 'Google nano banana 2, 1K',
              usdPrice: '0.04',
            },
            {
              creditPrice: '12',
              modelDescription: 'Google nano banana 2, 2K',
              usdPrice: '0.06',
            },
          ]),
        )
      case 'seedance':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '20',
              modelDescription: 'bytedance/seedance-1.5-pro, 720p with video input',
              usdPrice: '0.10',
            },
            {
              creditPrice: '33',
              modelDescription: 'bytedance/seedance-1.5-pro, 720p no video input',
              usdPrice: '0.165',
            },
            {
              creditPrice: '62',
              modelDescription: 'bytedance/seedance-1.5-pro, 1080p with video input',
              usdPrice: '0.31',
            },
            {
              creditPrice: '102',
              modelDescription: 'bytedance/seedance-1.5-pro, 1080p no video input',
              usdPrice: '0.51',
            },
          ]),
        )
      case 'veo':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '60.0',
              modelDescription: 'Google veo 3.1, image-to-video, Fast',
              usdPrice: '0.3',
            },
            {
              creditPrice: '60.0',
              modelDescription: 'Google veo 3.1, text-to-video, Fast',
              usdPrice: '0.3',
            },
          ]),
        )
      default:
        return Promise.reject(new Error(`Unexpected search ${requestBody.modelDescription}`))
    }
  })
}

describe('GET /api/kie/pricing', () => {
  beforeEach(() => {
    resetKiePricingCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns normalized pricing from the KIE pricing API', async () => {
    vi.stubGlobal('fetch', createPricingFetchMock())

    const response = await GET()
    const payload = (await response.json()) as {
      creditUsdRate: number
      matrix: {
        image: {
          'nano-banana': {
            '1080p': {
              credits: number
              usd: number
            }
          }
        }
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creditUsdRate).toBe(0.005)
    expect(payload.matrix.image['nano-banana']['1080p']).toEqual({
      credits: 8,
      usd: 0.04,
    })
  })

  it('reuses the cached pricing payload within the TTL window', async () => {
    const fetchMock = createPricingFetchMock()

    vi.stubGlobal('fetch', fetchMock)

    await GET()
    await GET()

    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('falls back to the stale cached pricing payload when refresh fails', async () => {
    const fetchMock = createPricingFetchMock()

    vi.stubGlobal('fetch', fetchMock)
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000)

    const initialResponse = await GET()
    const initialPayload = await initialResponse.json()

    dateNowSpy.mockReturnValue(1_000 + KIE_PRICING_TTL_MS + 1)
    fetchMock.mockImplementation(() => Promise.reject(new Error('upstream unavailable')))

    const fallbackResponse = await GET()
    const fallbackPayload = await fallbackResponse.json()

    expect(fallbackResponse.status).toBe(200)
    expect(fallbackPayload).toEqual(initialPayload)
    expect(fetchMock).toHaveBeenCalledTimes(10)
  })
})
