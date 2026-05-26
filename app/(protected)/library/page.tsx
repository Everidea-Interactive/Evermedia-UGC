import { LibraryPage } from '@/components/library/library-page'
import { listManagedAccountEmailsByUserId } from '@/lib/auth/access-repository'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import {
  applyOwnerEmailsToIdeations,
  applyOwnerEmailsToOutputs,
} from '@/lib/persistence/library-owner-emails'
import {
  listSavedIdeationHistory,
  listSavedOutputHistory,
} from '@/lib/persistence/repository'

export const dynamic = 'force-dynamic'

export default async function LibraryRoutePage() {
  await requireAuthenticatedUser('/library')
  const [outputs, ideations, ownerEmailsByUserId] = await Promise.all([
    listSavedOutputHistory(),
    listSavedIdeationHistory(),
    listManagedAccountEmailsByUserId(),
  ])

  return (
    <LibraryPage
      ideations={applyOwnerEmailsToIdeations(ideations, ownerEmailsByUserId)}
      outputs={applyOwnerEmailsToOutputs(outputs, ownerEmailsByUserId)}
    />
  )
}
