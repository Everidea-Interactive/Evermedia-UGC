import {
  buildKiePricingMatrix,
  KIE_CREDIT_USD_RATE,
  KIE_PRICING_TTL_MS,
  type KiePricingApiRecord,
} from '@/lib/generation/pricing'
import type { KiePricingResponse } from '@/lib/generation/types'

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
      grokRecords,
      klingRecords,
      nanoRecords,
      seedanceRecords,
      veoRecords,
    ] = await Promise.all([
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
        grokRecords,
        klingRecords,
        nanoRecords,
        seedanceRecords,
        veoRecords,
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
