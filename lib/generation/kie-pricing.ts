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
const KIE_SEEDANCE_15_PAGE_URL = 'https://kie.ai/seedance-1-5-pro'

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

function parseSeedanceDurationRate(
  pricingDesc: string,
  resolution: '720' | '1080',
  duration: VideoDuration,
): GenerationCostRate | null {
  const lineMatch = pricingDesc.match(new RegExp(`${resolution}P\\s*:\\s*([^\\n]+)`, 'i'))

  if (!lineMatch) {
    return null
  }

  const seconds = duration === 'base' ? '8' : '12'
  const durationMatch = lineMatch[1].match(
    new RegExp(`${seconds}s\\s*:\\s*([\\d.]+)\\s*(?:credits)?\\s*\\(\\$([\\d.]+)\\)`, 'i'),
  )

  if (!durationMatch) {
    return null
  }

  const credits = Number.parseFloat(durationMatch[1])
  const usd = Number.parseFloat(durationMatch[2])

  if (!Number.isFinite(credits) || !Number.isFinite(usd)) {
    return null
  }

  return { credits, usd }
}

function doubleRate(rate: GenerationCostRate): GenerationCostRate {
  return {
    credits: Number((rate.credits * 2).toFixed(3)),
    usd: Number((rate.usd * 2).toFixed(3)),
  }
}

function extractSeedancePricingDescFromNextData(nextDataJson: string): string | null {
  let payload: unknown

  try {
    payload = JSON.parse(nextDataJson)
  } catch {
    return null
  }

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const props = (payload as { props?: unknown }).props
  if (!props || typeof props !== 'object') {
    return null
  }

  const pageProps = (props as { pageProps?: unknown }).pageProps
  if (!pageProps || typeof pageProps !== 'object') {
    return null
  }

  const pageInfo = (pageProps as { pageInfo?: unknown }).pageInfo
  if (!pageInfo || typeof pageInfo !== 'object') {
    return null
  }

  const groupData = (pageInfo as { groupData?: unknown }).groupData
  if (!Array.isArray(groupData)) {
    return null
  }

  for (const item of groupData) {
    if (!item || typeof item !== 'object') continue

    const path = (item as { path?: unknown }).path
    const pricingDesc = (item as { pricingDesc?: unknown }).pricingDesc

    if (path === 'seedance-1-5-pro' && typeof pricingDesc === 'string') {
      return pricingDesc
    }
  }

  return null
}

async function fetchSeedance15PricingOverride(): Promise<SeedanceDurationPricing | null> {
  const response = await fetch(KIE_SEEDANCE_15_PAGE_URL, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const html = await response.text()
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i,
  )

  if (!nextDataMatch) {
    return null
  }

  const pricingDesc = extractSeedancePricingDescFromNextData(nextDataMatch[1])

  if (!pricingDesc) {
    return null
  }

  const base720 = parseSeedanceDurationRate(pricingDesc, '720', 'base')
  const extended720 = parseSeedanceDurationRate(pricingDesc, '720', 'extended')
  const base1080 = parseSeedanceDurationRate(pricingDesc, '1080', 'base')
  const extended1080 = parseSeedanceDurationRate(pricingDesc, '1080', 'extended')

  if (!base720 || !extended720 || !base1080 || !extended1080) {
    return null
  }

  // Seedance 1.5 page pricing is presented by duration and audio toggle.
  return {
    promptOnly: {
      '720p': {
        'no-audio': { base: base720, extended: extended720 },
        'with-audio': { base: doubleRate(base720), extended: doubleRate(extended720) },
      },
      '1080p': {
        'no-audio': { base: base1080, extended: extended1080 },
        'with-audio': { base: doubleRate(base1080), extended: doubleRate(extended1080) },
      },
    },
    withReference: {
      '720p': {
        'no-audio': { base: base720, extended: extended720 },
        'with-audio': { base: doubleRate(base720), extended: doubleRate(extended720) },
      },
      '1080p': {
        'no-audio': { base: base1080, extended: extended1080 },
        'with-audio': { base: doubleRate(base1080), extended: doubleRate(extended1080) },
      },
    },
  }
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
