import { cookies } from 'next/headers'

import { defaultLocale, localeCookieName, normalizeLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies()

    return normalizeLocale(cookieStore.get(localeCookieName)?.value)
  } catch {
    return defaultLocale
  }
}
