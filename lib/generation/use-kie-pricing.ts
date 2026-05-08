'use client'

import { useKiePricingRuntime } from '@/lib/generation/use-kie-runtime'

export function useKiePricing() {
  const runtime = useKiePricingRuntime()

  return {
    error: runtime.error,
    isLoading: runtime.isLoading,
    pricing: runtime.data,
  }
}
