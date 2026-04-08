import type { Metadata } from 'next'

import {
  resolveNextPath,
  resolveSignInMode,
  type SignInErrorCode,
} from '@/lib/auth/navigation'
import { getSignInViewState } from '@/lib/auth/sign-in-view'
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
  const next = resolveNextPath(resolvedSearchParams.next)
  const mode = resolveSignInMode(resolvedSearchParams.mode)

  await redirectIfAuthenticated(next)

  const error =
    typeof resolvedSearchParams.error === 'string'
      ? (resolvedSearchParams.error as SignInErrorCode)
      : null
  const email =
    typeof resolvedSearchParams.email === 'string'
      ? resolvedSearchParams.email
      : ''
  const reset =
    typeof resolvedSearchParams.reset === 'string'
      ? resolvedSearchParams.reset === '1'
      : false
  const passwordUpdated =
    typeof resolvedSearchParams.passwordUpdated === 'string'
      ? resolvedSearchParams.passwordUpdated === '1'
      : false
  const view = getSignInViewState({
    email,
    error,
    mode,
    passwordUpdated,
    reset,
  })
  const isSupabaseReady = isSupabaseConfigured()

  return (
    <main
      className="auth-screen"
      style={{
        backgroundColor: '#101217',
        color: '#ebedf2',
        minHeight: '100vh',
      }}
    >
      <section className="auth-shell">
        <input
          className="auth-mode-input"
          defaultChecked={view.initialMode === 'signin'}
          id="auth-mode-signin"
          name="auth-mode"
          type="radio"
        />
        <input
          className="auth-mode-input"
          defaultChecked={view.initialMode === 'reset'}
          id="auth-mode-reset"
          name="auth-mode"
          type="radio"
        />

        <div className="auth-card">
          <div>
            <p className="auth-eyebrow auth-signin-only">Phase 4 Access</p>
            <p className="auth-eyebrow auth-reset-only">Password Recovery</p>

            <h1 className="auth-title auth-signin-only">
              Sign in to your studio
            </h1>
            <h1 className="auth-title auth-reset-only">Reset your password</h1>

            <p className="auth-copy auth-signin-only">
              Use your Supabase email and password to access the protected studio
              and library.
            </p>
            <p className="auth-copy auth-reset-only">
              Request a password reset email for your Supabase account. You can
              return to sign in any time.
            </p>
          </div>

          {!isSupabaseReady ? (
            <div className="auth-banner auth-banner-error" role="alert">
              Configure <code className="auth-inline-code">SUPABASE_URL</code> and{' '}
              <code className="auth-inline-code">SUPABASE_ANON_KEY</code> before
              using authentication.
            </div>
          ) : null}

          {view.signInMessage ? (
            <div
              className={`auth-banner ${
                view.signInMessage.tone === 'error'
                  ? 'auth-banner-error'
                  : 'auth-banner-info'
              } auth-signin-only`}
              role={view.signInMessage.tone === 'error' ? 'alert' : 'status'}
            >
              {view.signInMessage.text}
            </div>
          ) : null}

          {view.resetMessage ? (
            <div
              className={`auth-banner ${
                view.resetMessage.tone === 'error'
                  ? 'auth-banner-error'
                  : 'auth-banner-info'
              } auth-reset-only`}
              role={view.resetMessage.tone === 'error' ? 'alert' : 'status'}
            >
              {view.resetMessage.text}
            </div>
          ) : null}

          <form
            action="/api/auth/sign-in"
            className="auth-panel auth-panel-signin"
            method="post"
          >
            <input name="next" type="hidden" value={next} />

            <div className="auth-field">
              <label className="auth-label" htmlFor="sign-in-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="auth-input"
                defaultValue={view.signInEmail}
                id="sign-in-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="sign-in-password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className="auth-input"
                id="sign-in-password"
                name="password"
                placeholder="Enter your password"
                required
                type="password"
              />
            </div>

            <button className="auth-button" disabled={!isSupabaseReady} type="submit">
              Sign In
            </button>

            <label className="auth-switch-link" htmlFor="auth-mode-reset">
              Forgot password?
            </label>
          </form>

          <form
            action="/api/auth/reset-password"
            className="auth-panel auth-panel-reset"
            method="post"
          >
            <input name="next" type="hidden" value={next} />

            <div className="auth-banner auth-banner-info">
              If an account exists for the email you enter, we&apos;ll send a reset
              link with instructions to create a new password.
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reset-email">
                Email
              </label>
              <input
                autoComplete="email"
                className="auth-input"
                defaultValue={view.resetEmail}
                id="reset-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>

            <button className="auth-button" disabled={!isSupabaseReady} type="submit">
              Send Reset Email
            </button>

            <label className="auth-switch-link" htmlFor="auth-mode-signin">
              Back to sign in
            </label>
          </form>
        </div>
      </section>
    </main>
  )
}
