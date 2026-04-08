'use client'

import { createBrowserClient } from '@supabase/ssr'

import { getSupabaseEnv } from '@/lib/auth/supabase/shared'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const { anonKey, url } = getSupabaseEnv()
  browserClient = createBrowserClient(url, anonKey)

  return browserClient
}
