import { StudioWorkspace } from '@/components/dashboard/studio-workspace'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import {
  getStudioProjectForUser,
  listProjectsForUser,
  touchProjectForUser,
} from '@/lib/persistence/repository'

export const dynamic = 'force-dynamic'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireAuthenticatedUser('/')
  const resolvedSearchParams = await searchParams
  const requestedProjectId =
    typeof resolvedSearchParams.project === 'string'
      ? resolvedSearchParams.project
      : null
  const projects = await listProjectsForUser(user.id)
  const requestedProject = requestedProjectId
    ? await getStudioProjectForUser(user.id, requestedProjectId)
    : null
  const fallbackProjectId =
    requestedProject?.project.id ?? projects[0]?.id ?? null
  const activeProject =
    requestedProject ??
    (fallbackProjectId ? await getStudioProjectForUser(user.id, fallbackProjectId) : null)

  if (activeProject?.project.id) {
    await touchProjectForUser(user.id, activeProject.project.id)
  }

  return (
    <StudioWorkspace
      initialProject={activeProject}
      initialProjects={projects}
    />
  )
}
