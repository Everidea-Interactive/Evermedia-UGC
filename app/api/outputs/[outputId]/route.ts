import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { deleteSavedOutputForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ outputId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { outputId } = await context.params
  const output = await deleteSavedOutputForUser({
    outputId,
    userId: user.id,
  })

  if (!output) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 })
  }

  return NextResponse.json({ outputId: output.id })
}
