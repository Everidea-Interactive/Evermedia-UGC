import { LibraryPage } from '@/components/library/library-page'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import { getLibraryRecordForUser } from '@/lib/persistence/repository'

export const dynamic = 'force-dynamic'

export default async function ProjectLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireAuthenticatedUser('/library')
  const resolvedSearchParams = await searchParams
  const selectedProjectId =
    typeof resolvedSearchParams.project === 'string'
      ? resolvedSearchParams.project
      : null
  const libraryData = await getLibraryRecordForUser(user.id, selectedProjectId)

  return (
    <LibraryPage
      projects={libraryData.projects}
      selectedProject={libraryData.selectedProject}
    />
  )
}
