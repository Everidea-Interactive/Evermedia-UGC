'use client'

import dynamic from 'next/dynamic'
import type { LucideIcon } from 'lucide-react'
import { Film, ImageIcon, Images } from 'lucide-react'

import { GenerationErrorNoticeDialog } from '@/components/dashboard/generation-error-notice-dialog'
import { ManualWorkspace } from '@/components/dashboard/manual-workspace'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  GenerationExperience,
  WorkspaceTab,
} from '@/lib/generation/types'
import { cn } from '@/lib/utils'
import { useGenerationStore } from '@/store/use-generation-store'

const GuidedWorkspaceShell = dynamic(() =>
  import('@/components/dashboard/guided-workspace-shell').then(
    (module) => module.GuidedWorkspaceShell,
  ),
)
const IdeationWorkspace = dynamic(() =>
  import('@/components/dashboard/ideation-workspace').then(
    (module) => module.IdeationWorkspace,
  ),
)

const workspaceTabs: Array<{
  helper: string
  icon: LucideIcon
  label: string
  value: WorkspaceTab
}> = [
  {
    helper: 'Still renders',
    icon: ImageIcon,
    label: 'Image',
    value: 'image',
  },
  {
    helper: 'Motion renders',
    icon: Film,
    label: 'Video',
    value: 'video',
  },
  {
    helper: 'Multi-image panel posts',
    icon: Images,
    label: 'Carousel',
    value: 'carousel',
  },
  {
    helper: 'Reference image plus motion-video replacement',
    icon: Film,
    label: 'Motion Control',
    value: 'motion-control',
  },
]

const experienceTabs: Array<{
  helper: string
  label: string
  value: GenerationExperience
}> = [
  {
    helper: 'Reference board, presets, and manual batch generation',
    label: 'Manual',
    value: 'manual',
  },
  {
    helper: 'Analyze one product image, edit the shot list, then render it',
    label: 'Guided',
    value: 'guided',
  },
  {
    helper: 'LLM-assisted content strategy and concept planning',
    label: 'Ideation',
    value: 'ideation',
  },
]

const panelClassName = 'rounded-2xl border border-border bg-card'

export function StudioShell() {
  const activeTab = useGenerationStore((state) => state.activeTab)
  const experience = useGenerationStore((state) => state.experience)
  const setActiveTab = useGenerationStore((state) => state.setActiveTab)
  const setExperience = useGenerationStore((state) => state.setExperience)

  return (
    <div className="min-h-screen overflow-x-hidden">
      <GenerationErrorNoticeDialog />
      <a
        href="#dashboard-main"
        className="sr-only left-4 top-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed"
      >
        Skip to Main Content
      </a>

      <main
        className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5"
        id="dashboard-main"
      >
        <section className={cn(panelClassName, 'p-2.5 sm:p-3')}>
          <div className="grid gap-3">
            <Tabs
              onValueChange={(value) => setExperience(value as GenerationExperience)}
              value={experience}
            >
              <TabsList aria-label="Studio Experience" className="w-full grid-cols-3 p-1.5">
                {experienceTabs.map((tab) => (
                  <TabsTrigger
                    className="min-h-[3.15rem] px-3 py-2"
                    key={tab.value}
                    value={tab.value}
                  >
                    <span className="mx-auto text-sm font-semibold sm:text-base">
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {experience === 'manual' || experience === 'guided' ? (
              <Tabs
                onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
                value={activeTab}
              >
                <TabsList
                  aria-label="Workspace Tabs"
                  className={cn("w-full p-1.5", experience === 'manual' ? "grid-cols-4" : "grid-cols-2")}
                >
                  {workspaceTabs
                    .filter((tab) => experience !== 'guided' || tab.value !== 'carousel')
                    .map((tab) => {
                    const Icon = tab.icon

                    return (
                      <TabsTrigger
                        className="min-h-[3.15rem] px-3 py-2"
                        key={tab.value}
                        value={tab.value}
                      >
                        <span className="mx-auto flex items-center justify-center gap-2">
                          <Icon className="size-4.5 shrink-0" suppressHydrationWarning />
                          <span className="text-sm font-semibold sm:text-base">
                            {tab.label}
                          </span>
                        </span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            ) : null}
          </div>
        </section>

        {experience === 'guided' ? (
          <GuidedWorkspaceShell />
        ) : experience === 'ideation' ? (
          <IdeationWorkspace />
        ) : (
          <ManualWorkspace />
        )}
      </main>
    </div>
  )
}
