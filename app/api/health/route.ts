import { access } from 'node:fs/promises'

import { NextResponse } from 'next/server'

import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const runtime = 'nodejs'

async function isMediaStorageWritable(storageRoot: string | null) {
  if (!storageRoot) {
    return false
  }

  try {
    await access(storageRoot, 2)
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const mediaStorageRoot = process.env.MEDIA_STORAGE_DIR ?? null
  const checks = {
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    kieApiKeyConfigured: Boolean(process.env.KIE_API_KEY),
    mediaStorageConfigured: Boolean(mediaStorageRoot),
    mediaStorageWritable: await isMediaStorageWritable(mediaStorageRoot),
    supabaseConfigured: isSupabaseConfigured(),
  }
  const ok =
    checks.databaseUrlConfigured &&
    checks.mediaStorageConfigured &&
    checks.mediaStorageWritable &&
    checks.supabaseConfigured

  return NextResponse.json(
    {
      checks,
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
      status: ok ? 200 : 503,
    },
  )
}
