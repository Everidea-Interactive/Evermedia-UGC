import { after, NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { runGenerationWorkerCycleForRun } from '@/lib/generation/worker'
import {
  getProjectGenerationRunForUser,
  listProjectAssetsForUser,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

const runKickCooldownMs = 5_000
const lastRunKickAt = new Map<string, number>()

function shouldScheduleRunRecovery(runId: string) {
  const now = Date.now()
  const lastKickAt = lastRunKickAt.get(runId) ?? 0

  if (now - lastKickAt < runKickCooldownMs) {
    return false
  }

  lastRunKickAt.set(runId, now)

  return true
}

function canAutoRecoverRun(run: Awaited<ReturnType<typeof getProjectGenerationRunForUser>>) {
  if (!run) {
    return false
  }

  return (
    run.status === 'queued' ||
    run.status === 'uploading' ||
    run.status === 'submitting' ||
    run.status === 'rendering'
  )
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, runId } = await context.params
  const run = await getProjectGenerationRunForUser({
    projectId,
    runId,
    userId: user.id,
  })

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  if (canAutoRecoverRun(run) && shouldScheduleRunRecovery(runId)) {
    after(async () => {
      await runGenerationWorkerCycleForRun(runId, `web-status-${runId}`).catch(
        () => undefined,
      )
    })
  }

  const assets = await listProjectAssetsForUser(user.id, projectId)

  return NextResponse.json({
    run: createGenerationRunState(
      run,
      assets.filter((asset) => asset.kind === 'output'),
    ),
  })
}
