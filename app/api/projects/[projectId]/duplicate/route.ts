import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { duplicateProjectForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await context.params
  const project = await duplicateProjectForUser(user.id, projectId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project }, { status: 201 })
}
