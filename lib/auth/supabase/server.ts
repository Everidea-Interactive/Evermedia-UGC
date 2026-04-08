import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getSupabaseEnv } from '@/lib/auth/supabase/shared'

function isReadonlyCookiesError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(
      'Cookies can only be modified in a Server Action or Route Handler',
    )
  )
}

export async function createSupabaseServerClient() {
  const { anonKey, url } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: Array<{
          name: string
          options?: Parameters<typeof cookieStore.set>[2]
          value: string
        }>,
      ) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options)
          }
        } catch (error) {
          // Supabase can attempt a refresh during server component reads, but
          // Next.js only allows cookie writes in actions and route handlers.
          if (!isReadonlyCookiesError(error)) {
            throw error
          }
        }
      },
    },
  })
}
