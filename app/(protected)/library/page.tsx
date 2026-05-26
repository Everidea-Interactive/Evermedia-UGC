import { LibraryPage } from '@/components/library/library-page'
import { listManagedAccountEmailsByUserId } from '@/lib/auth/access-repository'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import {
  applyOwnerEmailsToIdeations,
  applyOwnerEmailsToOutputs,
} from '@/lib/persistence/library-owner-emails'
import {
  getLibraryStats,
  listSavedIdeationHistory,
  listSavedOutputHistory,
} from '@/lib/persistence/repository'

export const dynamic = 'force-dynamic'

const DEFAULT_LIBRARY_PAGE_SIZE = 12
function parsePositiveIntegerSearchParam(
  value: string | string[] | undefined,
  fallback: number,
) {
  if (typeof value !== 'string') {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

export default async function LibraryRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAuthenticatedUser('/library')

  const resolvedSearchParams = await searchParams
  const currentPage = parsePositiveIntegerSearchParam(
    resolvedSearchParams.page,
    1,
  )
  const view =
    typeof resolvedSearchParams.view === 'string' && ['outputs', 'ideations'].includes(resolvedSearchParams.view)
      ? (resolvedSearchParams.view as 'outputs' | 'ideations')
      : 'outputs'

  const [outputs, ideations, ownerEmailsByUserId, stats] = await Promise.all([
    listSavedOutputHistory(),
    listSavedIdeationHistory(),
    listManagedAccountEmailsByUserId(),
    getLibraryStats(),
  ])

  return (
    <LibraryPage
      initialOutputs={applyOwnerEmailsToOutputs(outputs, ownerEmailsByUserId)}
      initialIdeations={applyOwnerEmailsToIdeations(ideations, ownerEmailsByUserId)}
      currentPage={currentPage}
      currentPageSize={DEFAULT_LIBRARY_PAGE_SIZE}
      stats={{
        totalRuns: stats?.totalRuns ?? 0,
        totalOutputs: stats?.totalOutputs ?? 0,
        totalSizeBytes: stats?.totalSizeBytes ?? 0,
        totalIdeations: stats?.totalIdeations ?? 0,
      }}
      initialView={view}
    />
  )
}
