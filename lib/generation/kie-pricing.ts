import {
  buildKiePricingMatrix,
  KIE_CREDIT_USD_RATE,
  KIE_PRICING_TTL_MS,
  type KiePricingApiRecord,
} from '@/lib/generation/pricing'
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

const SEEDANCE_15_HARDCODED_PRICING: SeedanceDurationPricing = {
  // Seedance 1.5 Pro has no dedicated row in KIE model-pricing API.
  // Keep this aligned with https://kie.ai/seedance-1-5-pro.
  promptOnly: {
    '720p': {
      'no-audio': {
        base: { credits: 14, usd: 0.07 },
        extended: { credits: 42, usd: 0.21 },
      },
      'with-audio': {
        base: { credits: 28, usd: 0.14 },
        extended: { credits: 84, usd: 0.42 },
      },
    },
    '1080p': {
      'no-audio': {
        base: { credits: 30, usd: 0.15 },
        extended: { credits: 90, usd: 0.45 },
      },
      'with-audio': {
        base: { credits: 60, usd: 0.3 },
        extended: { credits: 180, usd: 0.9 },
      },
    },
  },
  withReference: {
    '720p': {
      'no-audio': {
        base: { credits: 14, usd: 0.07 },
        extended: { credits: 42, usd: 0.21 },
      },
      'with-audio': {
        base: { credits: 28, usd: 0.14 },
        extended: { credits: 84, usd: 0.42 },
      },
    },
    '1080p': {
      'no-audio': {
        base: { credits: 30, usd: 0.15 },
        extended: { credits: 90, usd: 0.45 },
      },
      'with-audio': {
        base: { credits: 60, usd: 0.3 },
        extended: { credits: 180, usd: 0.9 },
      },
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
      'no-audio': {
        base: { credits: 70, usd: 0.35 },
        extended: { credits: 140, usd: 0.70 },
      },
      'with-audio': {
        base: { credits: 100, usd: 0.50 },
        extended: { credits: 200, usd: 1.00 },
      },
    },
    '1080p': {
      'no-audio': {
        base: { credits: 90, usd: 0.45 },
        extended: { credits: 180, usd: 0.90 },
      },
      'with-audio': {
        base: { credits: 135, usd: 0.675 },
        extended: { credits: 270, usd: 1.35 },
      },
    },
  },
  withReference: {
    '720p': {
      'no-audio': {
        base: { credits: 70, usd: 0.35 },
        extended: { credits: 140, usd: 0.70 },
      },
      'with-audio': {
        base: { credits: 100, usd: 0.50 },
        extended: { credits: 200, usd: 1.00 },
      },
    },
    '1080p': {
      'no-audio': {
        base: { credits: 90, usd: 0.45 },
        extended: { credits: 180, usd: 0.90 },
      },
      'with-audio': {
        base: { credits: 135, usd: 0.675 },
        extended: { credits: 270, usd: 1.35 },
      },
    },
  },
}

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
      grokRecords,
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

    const seedance15Override = SEEDANCE_15_HARDCODED_PRICING
    const kling30Override = KLING_30_HARDCODED_PRICING

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
        nanoRecords,
        seedance15Override,
        seedanceRecords,
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
