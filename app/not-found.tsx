import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getDictionary } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'

export default async function NotFound() {
  const locale = await getLocale()
  const copy = getDictionary(locale).notFound

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
          {copy.eyebrow}
        </p>
        <h1 className="text-balance font-display text-3xl font-semibold">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {copy.body}
        </p>
        <Button asChild>
          <Link href="/">{copy.cta}</Link>
        </Button>
      </div>
    </main>
  )
}
