import Image from 'next/image'
import Link from 'next/link'

import { LanguageSelector } from '@/components/i18n/language-selector'
import { KieCreditsChip } from '@/components/layout/kie-credits-chip'
import { getDictionary, type Locale } from '@/lib/i18n'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

export function AuthenticatedShell({
  children,
  locale,
  user,
}: {
  children: React.ReactNode
  locale: Locale
  user: AuthenticatedUserSummary
}) {
  const copy = getDictionary(locale).shared

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-3 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-5">
            <Link
              className="inline-flex items-center gap-2.5 font-display text-lg font-semibold text-foreground"
              href="/"
            >
              <Image
                alt="Evermedia Studio logo"
                className="h-6 w-6"
                height={24}
                priority
                src="/favicon.svg"
                width={24}
              />
              <span>Evermedia Studio</span>
            </Link>
            <nav className="flex items-center gap-2.5">
              <Link
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                href="/"
              >
                {copy.nav.studio}
              </Link>
              <Link
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                href="/library"
              >
                {copy.nav.library}
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-5">
            <KieCreditsChip />
            <div className="flex items-center sm:border-l sm:border-border/70 sm:pl-4">
              <LanguageSelector />
            </div>

            <div className="flex items-center gap-3.5 pl-0 sm:border-l sm:border-border/70 sm:pl-4">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.email ?? copy.nav.signedIn}
                </p>
              </div>
              <form action="/api/auth/sign-out" method="post">
                <button
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  type="submit"
                >
                  {copy.nav.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}
