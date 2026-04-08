'use client'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { StudioProjectProvider } from '@/components/dashboard/studio-project-context'
import type {
  ProjectRecord,
  StudioProjectRecord,
} from '@/lib/persistence/types'

export function StudioWorkspace({
  initialProject,
  initialProjects,
}: {
  initialProject: StudioProjectRecord | null
  initialProjects: ProjectRecord[]
}) {
  return (
    <StudioProjectProvider
      initialProject={initialProject}
      initialProjects={initialProjects}
    >
      <DashboardShell />
    </StudioProjectProvider>
  )
}
