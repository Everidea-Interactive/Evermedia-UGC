'use client'

import { useCallback, useEffect, useState } from 'react'

import { KIE_PRICING_TTL_MS } from '@/lib/generation/pricing'
import type { KiePricingResponse } from '@/lib/generation/types'

export function useKiePricing() {
  const [pricing, setPricing] = useState<KiePricingResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshPricing = useCallback(async () => {
    try {
      const response = await fetch('/api/kie/pricing', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as KiePricingResponse

      if (!response.ok || !payload.matrix) {
        throw new Error(payload.error ?? 'Unable to read KIE pricing.')
      }

      setPricing(payload)
      setError(null)
    } catch (refreshError) {
      setPricing(null)
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to read KIE pricing.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshPricing()

    const interval = window.setInterval(() => {
      void refreshPricing()
    }, KIE_PRICING_TTL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [refreshPricing])

  return {
    error,
    isLoading,
    pricing,
  }
}
