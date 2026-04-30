import {
  buildKiePricingMatrix,
  KIE_CREDIT_USD_RATE,
  KIE_PRICING_TTL_MS,
  type KiePricingApiRecord,
} from '@/lib/generation/pricing'
import type {
  ImageModelOption,
  KiePricingResponse,
  OutputQuality,
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

  const normalizedGrokDescriptions = input.grokRecords.map((record) =>
    normalizeDescription(record.modelDescription),
  )
  const grokQualities: OutputQuality[] = []

  if (normalizedGrokDescriptions.some((value) => /text-to-image.*\b4k\b/.test(value))) {
    grokQualities.push('4k')
  }
  if (normalizedGrokDescriptions.some((value) => /text-to-image.*\b(2k|1080p)\b/.test(value))) {
    grokQualities.push('1080p')
  }
  if (normalizedGrokDescriptions.some((value) => /text-to-image.*\b(1k|720p)\b/.test(value))) {
    grokQualities.push('720p')
  }
  const normalizedGptImageDescriptions = input.gptImageRecords.map((record) =>
    normalizeDescription(record.modelDescription),
  )
  const gptImageQualities: OutputQuality[] = []

  if (normalizedGptImageDescriptions.some((value) => /text-to-image.*\b1k\b/.test(value))) {
    gptImageQualities.push('720p')
  }
  if (normalizedGptImageDescriptions.some((value) => /text-to-image.*\b2k\b/.test(value))) {
    gptImageQualities.push('1080p')
  }
  if (normalizedGptImageDescriptions.some((value) => /text-to-image.*\b4k\b/.test(value))) {
    gptImageQualities.push('4k')
  }

  return {
    'gpt-image-2':
      gptImageQualities.length > 0 ? gptImageQualities : ['720p', '1080p', '4k'],
    'grok-imagine': grokQualities.length > 0 ? grokQualities : ['1080p'],
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
    const expiresAtMs = now + KIE_PRICING_TTL_MS
    const data: KiePricingResponse = {
      creditUsdRate: KIE_CREDIT_USD_RATE,
      expiresAt: new Date(expiresAtMs).toISOString(),
      fetchedAt: new Date(now).toISOString(),
      matrix: buildKiePricingMatrix({
        gptImageRecords,
        grokRecords,
        klingRecords,
        nanoRecords,
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
