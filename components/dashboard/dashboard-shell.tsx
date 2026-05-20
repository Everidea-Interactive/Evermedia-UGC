'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

import { MotionControlsSection } from '@/components/dashboard/manual-motion-controls-section'
import { ManualRunControlPanelShell } from '@/components/dashboard/manual-run-control-panel-shell'
import { ReferenceWorkspaceSection } from '@/components/dashboard/manual-reference-workspace-section'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  KiePricingResponse,
  KieStatusResponse,
  WorkspaceTab,
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

type ManualSection = 'references' | 'preset' | 'motion' | 'outputs'

export function normalizeManualSection(
  manualSection: ManualSection,
  activeTab: WorkspaceTab,
): ManualSection {
  if (activeTab !== 'video' && manualSection === 'motion') {
    return 'references'
  }

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
  const visibleManualSection = normalizeManualSection(manualSection, activeTab)

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
              className={cn(
                'w-full',
                activeTab === 'video' ? 'grid-cols-4' : 'grid-cols-3',
              )}
            >
              <TabsTrigger value="references">References</TabsTrigger>
              <TabsTrigger value="preset">Preset</TabsTrigger>
              {activeTab === 'video' ? (
                <TabsTrigger value="motion">Motion</TabsTrigger>
              ) : null}
              <TabsTrigger value="outputs">Outputs</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-w-0">
            {visibleManualSection === 'references' ? <ReferenceWorkspaceSection /> : null}
            {visibleManualSection === 'preset' ? <RefineRenderSection /> : null}
            {visibleManualSection === 'motion' ? <MotionControlsSection /> : null}
            {visibleManualSection === 'outputs' ? <OutputPanel /> : null}
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
