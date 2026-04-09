import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { requestGenerationRunCancellation } from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId } = await context.params
  const bundle = await requestGenerationRunCancellation({
    runId,
    userId: user.id,
  })

  if (!bundle) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  return NextResponse.json({
    run: createGenerationRunState(bundle.run, bundle.outputs),
  })
}
