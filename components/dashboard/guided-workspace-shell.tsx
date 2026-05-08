'use client'

import { GuidedWorkspace } from '@/components/dashboard/guided-workspace'
import { useKiePricing } from '@/lib/generation/use-kie-pricing'
import { useKieStatus } from '@/lib/generation/use-kie-status'
import { useGenerationStore } from '@/store/use-generation-store'

export function GuidedWorkspaceShell() {
  const generationRun = useGenerationStore((state) => state.generationRun)
  const kiePricingState = useKiePricing()
  const kieStatusState = useKieStatus(generationRun)

  return (
    <GuidedWorkspace
      isPricingLoading={kiePricingState.isLoading}
      kiePricing={kiePricingState.pricing}
      kiePricingError={kiePricingState.error}
      kieStatus={kieStatusState.status}
    />
  )
}
