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
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (requestUrl === 'https://kie.ai/seedance-1-5-pro') {
      const nextData = {
        props: {
          pageProps: {
            pageInfo: {
              groupData: [
                {
                  path: 'seedance-1-5-pro',
                  pricingDesc:
                    '480P: 4s: 7 credits ($0.035) no audio / 14 credits ($0.07) with audio; 8s: 14 ($0.07) / 28 ($0.14); 12s: 19 ($0.095) / 38 ($0.19)\n' +
                    '720P: 4s: 14 ($0.07) / 28 ($0.14); 8s: 28 ($0.14) / 56 ($0.28); 12s: 42 ($0.21) / 84 ($0.42)\n' +
                    '1080P: 4s: 30 ($0.15) / 60 ($0.30); 8s: 60 ($0.30) / 120 ($0.60); 12s: 90 ($0.45) / 180 ($0.90)',
                },
              ],
            },
          },
        },
      }
      const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></body></html>`

      return Promise.resolve(
        new Response(html, {
          headers: {
            'Content-Type': 'text/html',
          },
          status: 200,
        }),
      )
    }

    const requestBody = JSON.parse(String(init?.body)) as {
      modelDescription: string
    }

    switch (requestBody.modelDescription) {
      case 'gpt image 2':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '6',
              modelDescription: 'gpt image 2, text-to-image, 1k',
              usdPrice: '0.03',
            },
            {
              creditPrice: '10',
              modelDescription: 'gpt image 2, text-to-image, 2k',
              usdPrice: '0.05',
            },
            {
              creditPrice: '16',
              modelDescription: 'gpt image 2, text-to-image, 4k',
              usdPrice: '0.08',
            },
            {
              creditPrice: '6',
              modelDescription: 'gpt image 2, image-to-image, 1k',
              usdPrice: '0.03',
            },
            {
              creditPrice: '10',
              modelDescription: 'gpt image 2, image-to-image, 2k',
              usdPrice: '0.05',
            },
            {
              creditPrice: '16',
              modelDescription: 'gpt image 2, image-to-image, 4k',
              usdPrice: '0.08',
            },
          ]),
        )
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
            {
              creditPrice: '25',
              modelDescription: 'bytedance/seedance-2, 720p with video input',
              usdPrice: '0.125',
            },
            {
              creditPrice: '41',
              modelDescription: 'bytedance/seedance-2, 720p no video input',
              usdPrice: '0.205',
            },
            {
              creditPrice: '62',
              modelDescription: 'bytedance/seedance-2, 1080p with video input',
              usdPrice: '0.31',
            },
            {
              creditPrice: '102',
              modelDescription: 'bytedance/seedance-2, 1080p no video input',
              usdPrice: '0.51',
            },
          ]),
        )
      case 'veo':
        return Promise.resolve(
          createPricingResponse([
            {
              creditPrice: '65',
              modelDescription: 'Google veo 3.1, image-to-video, Fast-1080p',
              usdPrice: '0.325',
            },
            {
              creditPrice: '60',
              modelDescription: 'Google veo 3.1, image-to-video, Fast-720p',
              usdPrice: '0.30',
            },
            {
              creditPrice: '65',
              modelDescription: 'Google veo 3.1, text-to-video, Fast-1080p',
              usdPrice: '0.325',
            },
            {
              creditPrice: '60',
              modelDescription: 'Google veo 3.1, text-to-video, Fast-720p',
              usdPrice: '0.30',
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
      matrix: Record<string, unknown> & {
        image: {
          'nano-banana': {
            '2K': {
              credits: number
              usd: number
            }
          }
        }
        video: Record<string, unknown>
      }
    }

    expect(response.status).toBe(200)
    expect(payload.creditUsdRate).toBe(0.005)
    const videoMatrix = payload.matrix.video as Record<string, any>
    expect(Object.keys(payload.matrix.image['nano-banana']).toSorted()).toEqual([
      '1K',
      '2K',
      '4K',
    ])
    expect(payload.matrix.image['nano-banana']['2K']).toEqual({
      credits: 12,
      usd: 0.06,
    })
    expect(videoMatrix['veo-3.1'].promptOnly['1080p']).toEqual({
      credits: 65,
      usd: 0.325,
    })
    expect(videoMatrix['veo-3.1'].promptOnly['720p']).toEqual({
      credits: 60,
      usd: 0.3,
    })
    expect(videoMatrix['seedance-2'].withReference['1080p']['with-audio'].extended).toEqual({
      credits: 620,
      usd: 3.1,
    })
    expect(videoMatrix['grok-imagine-video-1.5'].promptOnly['1080p'].base).toEqual({
      credits: 24,
      usd: 0.12,
    })
    expect(
      videoMatrix['seedance-2-mini'].promptOnly['1080p']['with-audio'].base,
    ).toEqual({
      credits: 307.5,
      usd: 1.537,
    })
  })

  it('reuses the cached pricing payload within the TTL window', async () => {
    const fetchMock = createPricingFetchMock()

    vi.stubGlobal('fetch', fetchMock)

    await GET()
    await GET()

    expect(fetchMock).toHaveBeenCalledTimes(6)
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
    expect(fetchMock).toHaveBeenCalledTimes(12)
  })
})
