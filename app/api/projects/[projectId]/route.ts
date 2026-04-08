import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  deleteProjectForUser,
  getStudioProjectForUser,
  updateProjectForUser,
} from '@/lib/persistence/repository'
import { defaultProjectConfigSnapshot } from '@/lib/persistence/serialization'
import type { ProjectConfigSnapshot } from '@/lib/persistence/types'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await context.params
  const project = await getStudioProjectForUser(user.id, projectId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await context.params
  const body = (await request.json().catch(() => null)) as
    | {
        configSnapshot?: Partial<ProjectConfigSnapshot>
        name?: string
      }
    | null
  const project = await updateProjectForUser({
    configSnapshot: body?.configSnapshot
      ? {
          ...defaultProjectConfigSnapshot,
          ...body.configSnapshot,
        }
      : undefined,
    name: body?.name,
    projectId,
    userId: user.id,
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project })
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
  const project = await deleteProjectForUser(user.id, projectId)

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project })
}
