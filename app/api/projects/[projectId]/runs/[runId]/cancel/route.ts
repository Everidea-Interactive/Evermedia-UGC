import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  listProjectAssetsForUser,
  requestGenerationRunCancellation,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, runId } = await context.params
  const run = await requestGenerationRunCancellation({
    projectId,
    runId,
    userId: user.id,
  })

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const assets = await listProjectAssetsForUser(user.id, projectId)

  return NextResponse.json({
    run: createGenerationRunState(
      run,
      assets.filter((asset) => asset.kind === 'output'),
    ),
  })
}
