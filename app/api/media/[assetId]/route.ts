import { NextResponse } from 'next/server'

import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { readStoredFileBuffer } from '@/lib/media/storage'
import { getProjectAssetForUser } from '@/lib/persistence/repository'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { assetId } = await context.params
  const asset = await getProjectAssetForUser(user.id, assetId)

  if (!asset) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const body = await readStoredFileBuffer(asset.storagePath)

  return new NextResponse(body, {
    headers: {
      'Cache-Control': 'private, max-age=60',
      'Content-Length': String(body.byteLength),
      'Content-Type': asset.mimeType,
      'Content-Disposition': `inline; filename="${asset.originalName}"`,
    },
  })
}
