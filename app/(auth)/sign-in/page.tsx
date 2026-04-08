import type { Metadata } from 'next'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { redirectIfAuthenticated } from '@/lib/auth/session'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'

export const metadata: Metadata = {
  title: 'Sign In | Evermedia UGC',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const next =
    typeof resolvedSearchParams.next === 'string'
      ? resolvedSearchParams.next
      : '/'

  await redirectIfAuthenticated(next)

  const sent =
    typeof resolvedSearchParams.sent === 'string'
      ? resolvedSearchParams.sent === '1'
      : false
  const email =
    typeof resolvedSearchParams.email === 'string'
      ? resolvedSearchParams.email
      : ''

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/10">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Phase 4 Access
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold">
            Sign in to your studio
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use your email to receive a magic link. Studio and library access are
            both protected in this phase.
          </p>
        </div>

        {!isSupabaseConfigured() ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Configure <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code>{' '}
            before using authentication.
          </div>
        ) : null}

        {sent ? (
          <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
            Magic link sent{email ? ` to ${email}` : ''}. Open the email and
            return through the callback route to complete sign-in.
          </div>
        ) : null}

        <form
          action="/api/auth/magic-link"
          className="mt-6 flex flex-col gap-4"
          method="post"
        >
          <input name="next" type="hidden" value={next} />
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <Input
              autoComplete="email"
              defaultValue={email}
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <Button disabled={!isSupabaseConfigured()} type="submit">
            Send Magic Link
          </Button>
        </form>
      </div>
    </main>
  )
}
