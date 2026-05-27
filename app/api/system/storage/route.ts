import { NextResponse } from 'next/server'

import { getDiskSpaceStats } from '@/lib/media/storage'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const stats = await getDiskSpaceStats()

    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Disk space unavailable.' }, { status: 503 })
  }
}
