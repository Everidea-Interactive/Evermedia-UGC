'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

import { ManualRunControlPanelShell } from '@/components/dashboard/manual-run-control-panel-shell'
import { ReferenceWorkspaceSection } from '@/components/dashboard/manual-reference-workspace-section'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  KiePricingResponse,
  KieStatusResponse,
} from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const RefineRenderSection = dynamic(() =>
  import('@/components/dashboard/manual-refine-render-section').then(
    (module) => module.RefineRenderSection,
  ),
)

const OutputPanel = dynamic(() =>
  import('@/components/dashboard/manual-output-panel').then(
    (module) => module.OutputPanel,
  ),
)

const ManualCarouselSetupSection = dynamic(() =>
  import('@/components/dashboard/manual-carousel-setup-section').then(
    (module) => module.ManualCarouselSetupSection,
  ),
)

const ManualCarouselOutputPanel = dynamic(() =>
  import('@/components/dashboard/manual-carousel-output-panel').then(
    (module) => module.ManualCarouselOutputPanel,
  ),
)

type ManualSection = 'references' | 'preset' | 'setup' | 'outputs'

export function normalizeManualSection(
  manualSection: ManualSection,
): ManualSection {
  return manualSection
}

export function DashboardShell({
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
  const activeTab = useGenerationStore((state) => state.activeTab)
  const generationRun = useGenerationStore((state) => state.generationRun)
  const experience = useGenerationStore((state) => state.experience)
  const manualVideoStageEventId = useGenerationStore(
    (state) => state.manualVideoStageEventId,
  )
  const [manualSection, setManualSection] = useState<ManualSection>('references')
  const lastManualRenderingRunIdRef = useRef<string | null>(null)
  const lastManualTerminalRunKeyRef = useRef<string | null>(null)
  const visibleManualSection = normalizeManualSection(manualSection)

  const renderManualSection = () => {
    if (activeTab === 'carousel') {
      if (visibleManualSection === 'setup') return <ManualCarouselSetupSection />
      if (visibleManualSection === 'outputs') return <ManualCarouselOutputPanel />
      // Carousel ignores references/preset — redirect to setup
      return null
    }

    if (visibleManualSection === 'references') return <ReferenceWorkspaceSection />
    if (visibleManualSection === 'preset') return <RefineRenderSection />
    return <OutputPanel />
  }

  useEffect(() => {
    if (experience !== 'manual' || activeTab !== 'video' || manualVideoStageEventId === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setManualSection('references')
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeTab, experience, manualVideoStageEventId])

  useEffect(() => {
    if (experience !== 'manual' || activeTab !== 'carousel') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setManualSection('setup')
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeTab, experience])

  useEffect(() => {
    if (generationRun.experience !== 'manual' || generationRun.status !== 'rendering' || !generationRun.runId) {
      return
    }

    if (lastManualRenderingRunIdRef.current === generationRun.runId) {
      return
    }

    lastManualRenderingRunIdRef.current = generationRun.runId
    const timeoutId = window.setTimeout(() => {
      setManualSection('outputs')
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [generationRun.experience, generationRun.runId, generationRun.status])

  useEffect(() => {
    const isTerminalStatus =
      generationRun.experience === 'manual' &&
      (generationRun.status === 'success' ||
        generationRun.status === 'partial-success' ||
        generationRun.status === 'error' ||
        generationRun.status === 'cancelled')
    const terminalRunKey =
      generationRun.runId && isTerminalStatus
        ? `${generationRun.runId}:${generationRun.status}`
        : null

    if (!terminalRunKey || lastManualTerminalRunKeyRef.current === terminalRunKey) {
      return
    }

    lastManualTerminalRunKeyRef.current = terminalRunKey
    const timeoutId = window.setTimeout(() => {
      setManualSection('outputs')
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [generationRun.experience, generationRun.runId, generationRun.status])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.95fr)] lg:items-start xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.92fr)]">
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-1">
          <Tabs
            className="flex flex-col gap-3"
            onValueChange={(value) => setManualSection(value as ManualSection)}
            value={visibleManualSection}
          >
            <TabsList
              aria-label="Workspace Sections"
              className={cn("w-full", activeTab === 'carousel' ? "grid-cols-2" : "grid-cols-3")}
            >
              {activeTab === 'carousel' ? (
                <>
                  <TabsTrigger value="setup">Setup</TabsTrigger>
                  <TabsTrigger value="outputs">Outputs</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="references">References</TabsTrigger>
                  <TabsTrigger value="preset">Preset</TabsTrigger>
                  <TabsTrigger value="outputs">Outputs</TabsTrigger>
                </>
              )}
            </TabsList>
          </Tabs>

          <div className="min-w-0">
            {renderManualSection()}
          </div>
        </div>

        <ManualRunControlPanelShell
          className="lg:col-start-2 lg:sticky lg:top-6 lg:self-start"
          isPricingLoading={isPricingLoading}
          kiePricing={kiePricing}
          kiePricingError={kiePricingError}
          kieStatus={kieStatus}
        />
      </div>
    </div>
  )
}
