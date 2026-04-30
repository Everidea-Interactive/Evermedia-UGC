import Link from 'next/link'

import { KieCreditsChip } from '@/components/layout/kie-credits-chip'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

export function AuthenticatedShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: AuthenticatedUserSummary
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-3 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-5">
            <Link
              className="font-display text-lg font-semibold text-foreground"
              href="/"
            >
              Evermedia UGC
            </Link>
            <nav className="flex items-center gap-2.5">
              <Link
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                href="/"
              >
                Studio
              </Link>
              <Link
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                href="/library"
              >
                Library
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-5">
            <KieCreditsChip />

            <div className="flex items-center gap-3.5 pl-0 sm:border-l sm:border-border/70 sm:pl-4">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.email ?? 'Signed in'}
                </p>
              </div>
              <form action="/api/auth/sign-out" method="post">
                <button
                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  type="submit"
                >
                  Sign out
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
