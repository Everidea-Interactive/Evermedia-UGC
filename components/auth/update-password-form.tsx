'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildSignInPath } from '@/lib/auth/navigation'
import { getSupabaseBrowserClient } from '@/lib/auth/supabase/browser'

function isMissingSessionError(message: string) {
  return /auth session missing|session.*not found|invalid refresh token/i.test(
    message,
  )
}

export function UpdatePasswordForm() {
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
          setError('Enter and confirm your new password.')
          return
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.')
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
          New password
        </label>
        <Input
          autoComplete="new-password"
          id="password"
          name="password"
          placeholder="Create a new password"
          required
          type="password"
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="confirmPassword"
        >
          Confirm password
        </label>
        <Input
          autoComplete="new-password"
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Confirm your new password"
          required
          type="password"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button disabled={disabled} type="submit">
        {disabled ? 'Updating Password...' : 'Update Password'}
      </Button>
    </form>
  )
}
