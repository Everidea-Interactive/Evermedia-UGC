import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  listSavedIdeationHistoryForUser,
  listSavedOutputHistoryForUser,
} from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [ideations, outputs] = await Promise.all([
    listSavedIdeationHistoryForUser(user.id),
    listSavedOutputHistoryForUser(user.id),
  ])

  return NextResponse.json({
    ideations,
    outputs,
  })
}
