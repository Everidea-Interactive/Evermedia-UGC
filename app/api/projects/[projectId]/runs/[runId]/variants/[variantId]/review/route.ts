import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  listProjectAssetsForUser,
  updateGenerationVariantReview,
} from '@/lib/persistence/repository'
import { createGenerationRunState } from '@/lib/persistence/serialization'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      projectId: string
      runId: string
      variantId: string
    }>
  },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, runId, variantId } = await context.params
  const body = (await request.json().catch(() => null)) as
    | {
        reviewNotes?: string | null
        reviewStatus?: 'pending' | 'approved' | 'rejected'
        selectedForDelivery?: boolean
        setHero?: boolean
      }
    | null
  const run = await updateGenerationVariantReview({
    projectId,
    reviewNotes: body?.reviewNotes,
    reviewStatus: body?.reviewStatus,
    runId,
    selectedForDelivery: body?.selectedForDelivery,
    setHero: body?.setHero,
    userId: user.id,
    variantId,
  })

  if (!run) {
    return NextResponse.json({ error: 'Run or variant not found' }, { status: 404 })
  }

  const assets = await listProjectAssetsForUser(user.id, projectId)

  return NextResponse.json({
    run: createGenerationRunState(
      run,
      assets.filter((asset) => asset.kind === 'output'),
    ),
  })
}
