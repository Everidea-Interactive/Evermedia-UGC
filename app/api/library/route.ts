import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getLibraryRecordForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project')

  return NextResponse.json(await getLibraryRecordForUser(user.id, projectId))
}
