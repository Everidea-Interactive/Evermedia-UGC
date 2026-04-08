import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import {
  createProjectForUser,
  listProjectsForUser,
} from '@/lib/persistence/repository'
import { defaultProjectConfigSnapshot } from '@/lib/persistence/serialization'
import type { ProjectConfigSnapshot } from '@/lib/persistence/types'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    projects: await listProjectsForUser(user.id),
  })
}

export async function POST(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        configSnapshot?: Partial<ProjectConfigSnapshot>
        name?: string
      }
    | null
  const project = await createProjectForUser({
    configSnapshot: body?.configSnapshot
      ? {
          ...defaultProjectConfigSnapshot,
          ...body.configSnapshot,
        }
      : defaultProjectConfigSnapshot,
    name: body?.name,
    userId: user.id,
  })

  return NextResponse.json({ project }, { status: 201 })
}
