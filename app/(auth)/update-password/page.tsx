import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { UpdatePasswordForm } from '@/components/auth/update-password-form'
import { buildSignInPath } from '@/lib/auth/navigation'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Update Password | Evermedia UGC',
}

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const recovery =
    typeof resolvedSearchParams.recovery === 'string'
      ? resolvedSearchParams.recovery === '1'
      : false
  const user = await getOptionalAuthenticatedUser()

  if (!recovery || !user) {
    redirect(
      buildSignInPath({
        error: 'recovery_expired',
        mode: 'reset',
      }),
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/10">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Password Recovery
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold">
            Create a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Set a new password for {user.email ?? 'your account'} before returning
            to the studio.
          </p>
        </div>

        <UpdatePasswordForm />
      </div>
    </main>
  )
}
