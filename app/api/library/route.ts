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

const OWNER_EMAIL_LOOKUP_TIMEOUT_MS = 3_000

async function resolveOwnerEmailsWithTimeout() {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      listManagedAccountEmailsByUserId(),
      new Promise<Map<string, string>>((resolve) => {
        timeoutId = setTimeout(() => resolve(new Map()), OWNER_EMAIL_LOOKUP_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

export async function GET() {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [ideations, outputs, ownerEmailsByUserId] = await Promise.all([
    listSavedIdeationHistory(),
    listSavedOutputHistory(),
    resolveOwnerEmailsWithTimeout(),
  ])

  return NextResponse.json({
    ideations: applyOwnerEmailsToIdeations(ideations, ownerEmailsByUserId),
    outputs: applyOwnerEmailsToOutputs(outputs, ownerEmailsByUserId),
  })
}
