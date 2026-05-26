import { NextResponse } from 'next/server'

import { listManagedAccountEmailsByUserId } from '@/lib/auth/access-repository'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  applyOwnerEmailsToIdeations,
  applyOwnerEmailsToOutputs,
} from '@/lib/persistence/library-owner-emails'
import {
  listSavedIdeationHistory,
  listSavedOutputHistory,
} from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [ideations, outputs, ownerEmailsByUserId] = await Promise.all([
    listSavedIdeationHistory(),
    listSavedOutputHistory(),
    listManagedAccountEmailsByUserId(),
  ])

  return NextResponse.json({
    ideations: applyOwnerEmailsToIdeations(ideations, ownerEmailsByUserId),
    outputs: applyOwnerEmailsToOutputs(outputs, ownerEmailsByUserId),
  })
}
