import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { listSavedOutputHistoryForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    outputs: await listSavedOutputHistoryForUser(user.id),
  })
}
