import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { deleteSavedIdeationForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ ideationId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ideationId } = await context.params
  const ideation = await deleteSavedIdeationForUser({
    ideationId,
    userId: user.id,
  })

  if (!ideation) {
    return NextResponse.json({ error: 'Ideation brief not found' }, { status: 404 })
  }

  return NextResponse.json({ ideationId: ideation.id })
}
