'use client'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { useKiePricing } from '@/lib/generation/use-kie-pricing'
import { useKieStatus } from '@/lib/generation/use-kie-status'
import { useGenerationStore } from '@/store/use-generation-store'

export function ManualWorkspace() {
  const generationRun = useGenerationStore((state) => state.generationRun)
  const kiePricingState = useKiePricing()
  const kieStatusState = useKieStatus(generationRun)

  return (
    <DashboardShell
      isPricingLoading={kiePricingState.isLoading}
      kiePricing={kiePricingState.pricing}
      kiePricingError={kiePricingState.error}
      kieStatus={kieStatusState.status}
    />
  )
}
