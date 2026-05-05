'use client'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import type {
  KiePricingResponse,
  KieStatusResponse,
} from '@/lib/generation/types'

export function ManualWorkspace({
  isPricingLoading,
  kiePricing,
  kiePricingError,
  kieStatus,
}: {
  isPricingLoading: boolean
  kiePricing: KiePricingResponse | null
  kiePricingError: string | null
  kieStatus: KieStatusResponse
}) {
  return (
    <DashboardShell
      isPricingLoading={isPricingLoading}
      kiePricing={kiePricing}
      kiePricingError={kiePricingError}
      kieStatus={kieStatus}
    />
  )
}
