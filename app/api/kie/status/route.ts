import { NextResponse } from 'next/server'

import { getKieStatus } from '@/lib/generation/kie'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const status = await getKieStatus()

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        credits: null,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to read KIE status.',
        fetchedAt: new Date().toISOString(),
        source: null,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}
