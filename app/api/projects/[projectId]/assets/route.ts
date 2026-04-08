import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  clearProjectReferenceAssets,
  getMediaUrl,
  getProjectForUser,
  replaceProjectReferenceAsset,
} from '@/lib/persistence/repository'
import type { ProjectSlotKey } from '@/lib/persistence/types'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await context.params
  const project = await getProjectForUser(user.id, projectId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const slotKey = formData.get('slotKey')
  const label = formData.get('label')
  const file = formData.get('file')

  if (typeof slotKey !== 'string' || typeof label !== 'string' || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing slotKey, label, or file.' },
      { status: 400 },
    )
  }

  const asset = await replaceProjectReferenceAsset({
    file,
    label,
    projectId,
    slotKey: slotKey as ProjectSlotKey,
    userId: user.id,
  })

  return NextResponse.json({
    asset,
    mediaUrl: getMediaUrl(asset.id),
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await context.params
  await clearProjectReferenceAssets(user.id, projectId)

  return NextResponse.json({ ok: true })
}
