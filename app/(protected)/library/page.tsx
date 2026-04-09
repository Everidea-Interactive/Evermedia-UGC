import { LibraryPage } from '@/components/library/library-page'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import { listSavedOutputHistoryForUser } from '@/lib/persistence/repository'

export const dynamic = 'force-dynamic'

export default async function LibraryRoutePage() {
  const user = await requireAuthenticatedUser('/library')
  const outputs = await listSavedOutputHistoryForUser(user.id)

  return <LibraryPage outputs={outputs} />
}
