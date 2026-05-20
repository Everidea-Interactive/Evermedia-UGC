'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildSignInPath } from '@/lib/auth/navigation'
import { getSupabaseBrowserClient } from '@/lib/auth/supabase/browser'
import type { Dictionary } from '@/lib/i18n'

function isMissingSessionError(message: string) {
  return /auth session missing|session.*not found|invalid refresh token/i.test(
    message,
  )
}

export function UpdatePasswordForm({
  copy,
}: {
  copy: Dictionary['auth']
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const disabled = isPending || isSubmitting

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)
        const password = String(formData.get('password') ?? '')
        const confirmPassword = String(formData.get('confirmPassword') ?? '')

        if (password.trim().length === 0 || confirmPassword.trim().length === 0) {
          setError(copy.updatePasswordErrorEmpty)
          return
        }

        if (password !== confirmPassword) {
          setError(copy.updatePasswordErrorMismatch)
          return
        }

        setError(null)
        setIsSubmitting(true)

        void (async () => {
          const supabase = getSupabaseBrowserClient()
          const { error: updateError } = await supabase.auth.updateUser({
            password,
          })

          if (updateError) {
            if (isMissingSessionError(updateError.message)) {
              startTransition(() => {
                router.replace(
                  buildSignInPath({
                    error: 'recovery_expired',
                    mode: 'reset',
                  }),
                )
              })
              return
            }

            setError(updateError.message)
            setIsSubmitting(false)
            return
          }

          await supabase.auth.signOut()

          startTransition(() => {
            router.replace(
              buildSignInPath({
                mode: 'signin',
                passwordUpdated: true,
              }),
            )
          })
        })()
      }}
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          {copy.newPassword}
        </label>
        <Input
          autoComplete="new-password"
          id="password"
          name="password"
          placeholder={copy.newPasswordPlaceholder}
          required
          type="password"
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="confirmPassword"
        >
          {copy.confirmPassword}
        </label>
        <Input
          autoComplete="new-password"
          id="confirmPassword"
          name="confirmPassword"
          placeholder={copy.confirmPasswordPlaceholder}
          required
          type="password"
        />
      </div>

      {error ? (
        <div
          aria-live="assertive"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {disabled ? copy.updatePasswordBusy : ''}
      </p>

      <Button disabled={disabled} type="submit">
        {disabled ? copy.updatePasswordBusy : copy.updatePassword}
      </Button>
    </form>
  )
}
