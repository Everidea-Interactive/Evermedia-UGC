import { LibraryPage } from '@/components/library/library-page'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import {
  listSavedIdeationHistoryForUser,
  listSavedOutputHistoryForUser,
} from '@/lib/persistence/repository'

export const dynamic = 'force-dynamic'

export default async function LibraryRoutePage() {
  const user = await requireAuthenticatedUser('/library')
  const [outputs, ideations] = await Promise.all([
    listSavedOutputHistoryForUser(user.id),
    listSavedIdeationHistoryForUser(user.id),
  ])

  return <LibraryPage ideations={ideations} outputs={outputs} />
}
