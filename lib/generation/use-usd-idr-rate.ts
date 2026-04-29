'use client'

import { useEffect, useState } from 'react'

const DEFAULT_USD_TO_IDR_RATE = 17_000

type FxRateResponse = {
  fallback?: boolean
  rate?: number
}

let cachedUsdToIdrRate: number | null = null
let inflightRateRequest: Promise<number> | null = null

async function fetchUsdToIdrRate() {
  if (cachedUsdToIdrRate !== null) {
    return cachedUsdToIdrRate
  }

  if (!inflightRateRequest) {
    inflightRateRequest = fetch('/api/fx/usd-idr')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`FX route returned ${response.status}.`)
        }

        const payload = (await response.json()) as FxRateResponse

        if (
          typeof payload.rate !== 'number' ||
          !Number.isFinite(payload.rate) ||
          payload.rate <= 0
        ) {
          throw new Error('FX route returned an invalid rate.')
        }

        return payload.rate
      })
      .catch(() => DEFAULT_USD_TO_IDR_RATE)
      .finally(() => {
        inflightRateRequest = null
      })
  }

  const rate = await inflightRateRequest
  cachedUsdToIdrRate = rate

  return rate
}

export function useUsdToIdrRate() {
  const [rate, setRate] = useState(cachedUsdToIdrRate ?? DEFAULT_USD_TO_IDR_RATE)
  const [isLoading, setIsLoading] = useState(cachedUsdToIdrRate === null)

  useEffect(() => {
    let isSubscribed = true

    void fetchUsdToIdrRate().then((nextRate) => {
      if (!isSubscribed) {
        return
      }

      setRate(nextRate)
      setIsLoading(false)
    })

    return () => {
      isSubscribed = false
    }
  }, [])

  return {
    isLoading,
    rate,
  }
}
