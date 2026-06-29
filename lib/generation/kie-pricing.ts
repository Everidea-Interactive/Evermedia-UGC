import {
  buildKiePricingMatrix,
  KIE_CREDIT_USD_RATE,
  KIE_PRICING_TTL_MS,
  type KiePricingApiRecord,
} from '@/lib/generation/pricing'
import {
  allVideoDurations,
  getVideoDurationOptions,
  normalizeVideoDurationForModel,
} from '@/lib/generation/model-mapping'
import type {
  GenerationCostRate,
  ImageModelOption,
  KiePricingResponse,
  OutputQuality,
  VideoAudio,
  VideoDuration,
  VideoResolution,
} from '@/lib/generation/types'

const KIE_PRICING_API_URL = 'https://api.kie.ai/client/v1/model-pricing/page'
type KiePricingPageResponse = {
  code?: number
  data?: {
    records?: KiePricingApiRecord[]
  }
  msg?: string
}

type CachedPricingEntry = {
  data: KiePricingResponse
  expiresAtMs: number
}

type SeedanceDurationPricing = {
  promptOnly: Record<VideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
  withReference: Record<VideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
}

type MotionControlPricing = Record<VideoResolution, GenerationCostRate>

function createUnavailableDurationRates() {
  return {
    ...Object.fromEntries(
      allVideoDurations.map((duration) => [
        duration,
        { credits: Number.NaN, usd: Number.NaN },
      ]),
    ),
    base: { credits: Number.NaN, usd: Number.NaN },
    extended: { credits: Number.NaN, usd: Number.NaN },
  } as Record<VideoDuration, GenerationCostRate>
}

function createDurationRates(
  model: 'kling-3.0' | 'seedance-1.5-pro',
  perSecondRate: GenerationCostRate,
) {
  const rates = createUnavailableDurationRates()

  for (const duration of getVideoDurationOptions(model)) {
    rates[duration] = {
      credits: Number((perSecondRate.credits * duration).toFixed(3)),
      usd: Number((perSecondRate.usd * duration).toFixed(3)),
    }
  }

  const baseDuration = normalizeVideoDurationForModel(model, 'base')
  const extendedDuration = normalizeVideoDurationForModel(model, 'extended')

  rates.base = rates[baseDuration]
  rates.extended = rates[extendedDuration]

  return rates
}

const SEEDANCE_15_HARDCODED_PRICING: SeedanceDurationPricing = {
  // Seedance 1.5 Pro has no dedicated row in KIE model-pricing API.
  // Keep this aligned with https://kie.ai/seedance-1-5-pro.
  promptOnly: {
    '720p': {
      'no-audio': createDurationRates('seedance-1.5-pro', { credits: 3.5, usd: 0.0175 }),
      'with-audio': createDurationRates('seedance-1.5-pro', { credits: 7, usd: 0.035 }),
    },
    '1080p': {
      'no-audio': createDurationRates('seedance-1.5-pro', { credits: 7.5, usd: 0.0375 }),
      'with-audio': createDurationRates('seedance-1.5-pro', { credits: 15, usd: 0.075 }),
    },
  },
  withReference: {
    '720p': {
      'no-audio': createDurationRates('seedance-1.5-pro', { credits: 3.5, usd: 0.0175 }),
      'with-audio': createDurationRates('seedance-1.5-pro', { credits: 7, usd: 0.035 }),
    },
    '1080p': {
      'no-audio': createDurationRates('seedance-1.5-pro', { credits: 7.5, usd: 0.0375 }),
      'with-audio': createDurationRates('seedance-1.5-pro', { credits: 15, usd: 0.075 }),
    },
  },
}

const KLING_30_HARDCODED_PRICING: SeedanceDurationPricing = {
  // Kling 3.0 pricing from https://kie.ai/kling-3-0
  // Standard (720p): no-audio 14 credits ($0.07)/s, with-audio 20 credits ($0.10)/s
  // Pro (1080p): no-audio 18 credits ($0.09)/s, with-audio 27 credits ($0.135)/s
  // 4K mode not supported
  promptOnly: {
    '720p': {
      'no-audio': createDurationRates('kling-3.0', { credits: 14, usd: 0.07 }),
      'with-audio': createDurationRates('kling-3.0', { credits: 20, usd: 0.1 }),
    },
    '1080p': {
      'no-audio': createDurationRates('kling-3.0', { credits: 18, usd: 0.09 }),
      'with-audio': createDurationRates('kling-3.0', { credits: 27, usd: 0.135 }),
    },
  },
  withReference: {
    '720p': {
      'no-audio': createDurationRates('kling-3.0', { credits: 14, usd: 0.07 }),
      'with-audio': createDurationRates('kling-3.0', { credits: 20, usd: 0.1 }),
    },
    '1080p': {
      'no-audio': createDurationRates('kling-3.0', { credits: 18, usd: 0.09 }),
      'with-audio': createDurationRates('kling-3.0', { credits: 27, usd: 0.135 }),
    },
  },
}

const KLING_30_MOTION_CONTROL_HARDCODED_PRICING: MotionControlPricing = {
  // Fallback only if KIE pricing API stops returning motion-control rows.
  '720p': { credits: 20, usd: 0.1 },
  '1080p': { credits: 27, usd: 0.135 },
}

const GROK_IMAGINE_VIDEO_15_HARDCODED_ROWS: KiePricingApiRecord[] = [
  {
    creditPrice: '1.6',
    modelDescription: 'grok-imagine-video-1-5-preview, image-to-video, 480p',
    usdPrice: '0.008',
  },
  {
    creditPrice: '3',
    modelDescription: 'grok-imagine-video-1-5-preview, image-to-video, 720p',
    usdPrice: '0.015',
  },
]

const SEEDANCE_2_MINI_HARDCODED_ROWS: KiePricingApiRecord[] = [
  {
    creditPrice: '6',
    modelDescription: 'bytedance/seedance-2-mini, 480p with video',
    usdPrice: '0.03',
  },
  {
    creditPrice: '9.5',
    modelDescription: 'bytedance/seedance-2-mini, 480p no video',
    usdPrice: '0.0475',
  },
  {
    creditPrice: '12.5',
    modelDescription: 'bytedance/seedance-2-mini, 720p with video',
    usdPrice: '0.0625',
  },
  {
    creditPrice: '20.5',
    modelDescription: 'bytedance/seedance-2-mini, 720p no video',
    usdPrice: '0.1025',
  },
]

let cachedPricingEntry: CachedPricingEntry | null = null

function normalizeDescription(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function deriveSupportedImageQualities(input: {
  gptImageRecords: KiePricingApiRecord[]
  grokRecords: KiePricingApiRecord[]
  nanoRecords: KiePricingApiRecord[]
}): Record<ImageModelOption, OutputQuality[]> {
  const nanoDescriptions = input.nanoRecords.map((record) =>
    normalizeDescription(record.modelDescription),
  )
  const nanoQualities: OutputQuality[] = []

  if (nanoDescriptions.some((value) => /\b1k\b/.test(value))) {
    nanoQualities.push('720p')
  }
  if (nanoDescriptions.some((value) => /\b2k\b/.test(value))) {
    nanoQualities.push('1080p')
  }
  if (nanoDescriptions.some((value) => /\b4k\b/.test(value))) {
    nanoQualities.push('4k')
  }

  return {
    'nano-banana':
      nanoQualities.length > 0 ? nanoQualities : ['720p', '1080p', '4k'],
  }
}

async function readPricingError(response: Response) {
  const text = await response.text()

  try {
    const payload = JSON.parse(text) as KiePricingPageResponse

    if (typeof payload.msg === 'string' && payload.msg.length > 0) {
      return payload.msg
    }
  } catch {
    return text
  }

  return text
}

async function fetchPricingRecords(modelDescription: string) {
  const response = await fetch(KIE_PRICING_API_URL, {
    body: JSON.stringify({
      interfaceType: '',
      modelDescription,
      pageNum: 1,
      pageSize: 100,
    }),
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(
      `Unable to read KIE pricing for "${modelDescription}": ${await readPricingError(response)}`,
    )
  }

  const payload = (await response.json()) as KiePricingPageResponse

  if (payload.code !== 200 || !Array.isArray(payload.data?.records)) {
    throw new Error(
      `KIE pricing for "${modelDescription}" did not include a usable records list.`,
    )
  }

  return payload.data.records
}

export function resetKiePricingCache() {
  cachedPricingEntry = null
}

export async function getKiePricing() {
  const now = Date.now()

  if (cachedPricingEntry && now < cachedPricingEntry.expiresAtMs) {
    return cachedPricingEntry.data
  }

  try {
    const [
      gptImageRecords,
      grokImageRecords,
      klingRecords,
      nanoRecords,
      seedanceRecords,
      veoRecords,
    ] = await Promise.all([
      fetchPricingRecords('gpt image 2'),
      fetchPricingRecords('grok'),
      fetchPricingRecords('kling'),
      fetchPricingRecords('nano banana'),
      fetchPricingRecords('seedance'),
      fetchPricingRecords('veo'),
    ])
    const grokRecords = [...grokImageRecords, ...GROK_IMAGINE_VIDEO_15_HARDCODED_ROWS]
    const mergedSeedanceRecords = [...seedanceRecords, ...SEEDANCE_2_MINI_HARDCODED_ROWS]

    const seedance15Override = SEEDANCE_15_HARDCODED_PRICING
    const kling30Override = KLING_30_HARDCODED_PRICING
    const kling30MotionControlOverride = KLING_30_MOTION_CONTROL_HARDCODED_PRICING

    const expiresAtMs = now + KIE_PRICING_TTL_MS
    const data: KiePricingResponse = {
      creditUsdRate: KIE_CREDIT_USD_RATE,
      expiresAt: new Date(expiresAtMs).toISOString(),
      fetchedAt: new Date(now).toISOString(),
      matrix: buildKiePricingMatrix({
        gptImageRecords,
        grokRecords,
        klingRecords,
        kling30Override,
        kling30MotionControlOverride,
        nanoRecords,
        seedance15Override,
        seedanceRecords: mergedSeedanceRecords,
        veoRecords,
      }),
      supportedImageQualities: deriveSupportedImageQualities({
        gptImageRecords,
        grokRecords,
        nanoRecords,
      }),
    }

    cachedPricingEntry = {
      data,
      expiresAtMs,
    }

    return data
  } catch (error) {
    if (cachedPricingEntry) {
      return cachedPricingEntry.data
    }

    throw error
  }
}
