import { NextResponse } from 'next/server'

const FRANKFURTER_ENDPOINT =
  'https://api.frankfurter.dev/v2/latest?base=USD&symbols=IDR'
const FALLBACK_USD_TO_IDR_RATE = 17_000

type FrankfurterResponse = {
  date?: string
  rates?: {
    IDR?: number
  }
}

export const runtime = 'nodejs'

export async function GET() {
  try {
    const response = await fetch(FRANKFURTER_ENDPOINT, {
      next: { revalidate: 60 * 60 },
    })

    if (!response.ok) {
      throw new Error(`Frankfurter returned ${response.status}.`)
    }

    const payload = (await response.json()) as FrankfurterResponse
    const rate = payload.rates?.IDR

    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      throw new Error('Frankfurter response did not include a valid USD/IDR rate.')
    }

    return NextResponse.json({
      asOf: payload.date ?? null,
      base: 'USD',
      fallback: false,
      provider: 'frankfurter',
      quote: 'IDR',
      rate,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to fetch FX rate.'

    return NextResponse.json({
      asOf: null,
      base: 'USD',
      fallback: true,
      message,
      provider: 'fallback',
      quote: 'IDR',
      rate: FALLBACK_USD_TO_IDR_RATE,
    })
  }
}
