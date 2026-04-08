import Link from 'next/link'

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
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              className="font-display text-lg font-semibold text-foreground"
              href="/"
            >
              Evermedia UGC
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              Authenticated studio with project history and reusable assets.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex items-center gap-2">
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

            <div className="flex items-center gap-3">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.email ?? 'Signed in'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supabase magic-link session
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
