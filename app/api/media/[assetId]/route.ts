import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { readStoredFileBuffer } from '@/lib/media/storage'
import { getSavedOutputForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { assetId } = await context.params
  const output = await getSavedOutputForUser(user.id, assetId)

  if (!output) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const body = await readStoredFileBuffer(output.storagePath)
  const { searchParams } = new URL(request.url)
  const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline'

  return new NextResponse(body, {
    headers: {
      'Cache-Control': 'private, max-age=60',
      'Content-Disposition': `${disposition}; filename="${output.originalName}"`,
      'Content-Length': String(body.byteLength),
      'Content-Type': output.mimeType,
    },
  })
}
