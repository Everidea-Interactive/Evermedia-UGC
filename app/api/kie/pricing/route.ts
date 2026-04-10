import { NextResponse } from 'next/server'

import { getKiePricing } from '@/lib/generation/kie-pricing'
import { KIE_CREDIT_USD_RATE, KIE_PRICING_TTL_MS } from '@/lib/generation/pricing'

export const runtime = 'nodejs'

const pricingCacheControl = `public, max-age=${Math.floor(
  KIE_PRICING_TTL_MS / 1000,
)}, stale-while-revalidate=60`

export async function GET() {
  try {
    const pricing = await getKiePricing()

    return NextResponse.json(pricing, {
      headers: {
        'Cache-Control': pricingCacheControl,
      },
    })
  } catch (error) {
    const now = new Date().toISOString()

    return NextResponse.json(
      {
        creditUsdRate: KIE_CREDIT_USD_RATE,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to read KIE pricing.',
        expiresAt: now,
        fetchedAt: now,
        matrix: null,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
        status: 503,
      },
    )
  }
}
