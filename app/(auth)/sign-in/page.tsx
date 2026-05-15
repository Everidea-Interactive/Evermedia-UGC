import type { Metadata } from 'next'

import { PasswordVisibilityInput } from '@/components/auth/password-visibility-input'
import { LanguageSelector } from '@/components/i18n/language-selector'
import {
  resolveNextPath,
  resolveSignInMode,
  type SignInErrorCode,
} from '@/lib/auth/navigation'
import { getSignInViewState } from '@/lib/auth/sign-in-view'
import { redirectIfAuthenticated } from '@/lib/auth/session'
import { isSupabaseConfigured } from '@/lib/auth/supabase/shared'
import { getDictionary } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'

export const metadata: Metadata = {
  title: 'Sign In | Evermedia Studio',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const next = resolveNextPath(resolvedSearchParams.next)
  const mode = resolveSignInMode(resolvedSearchParams.mode)
  const locale = await getLocale()
  const copy = getDictionary(locale).auth

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
    locale,
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
          <div className="mb-5 flex justify-end">
            <LanguageSelector />
          </div>
          <div>
            <p className="auth-eyebrow auth-reset-only">{copy.passwordRecovery}</p>

            <h1 className="auth-title auth-signin-only">
              {copy.signInTitle}
            </h1>
            <h1 className="auth-title auth-reset-only">{copy.resetPassword}</h1>

            <p className="auth-copy auth-reset-only">
              {copy.resetCopy}
            </p>
          </div>

          {!isSupabaseReady ? (
            <div className="auth-banner auth-banner-error" role="alert">
              {copy.configureSupabase}
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
                {copy.email}
              </label>
              <input
                autoComplete="email"
                className="auth-input"
                defaultValue={view.signInEmail}
                id="sign-in-email"
                name="email"
                placeholder={copy.email}
                required
                type="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="sign-in-password">
                {copy.password}
              </label>
              <PasswordVisibilityInput
                autoComplete="current-password"
                className="auth-input"
                id="sign-in-password"
                name="password"
                placeholder={copy.password}
                required
              />
            </div>

            <button className="auth-button" disabled={!isSupabaseReady} type="submit">
              {copy.signIn}
            </button>

            <label className="auth-switch-link" htmlFor="auth-mode-reset">
              {copy.forgotPassword}
            </label>
          </form>

          <form
            action="/api/auth/reset-password"
            className="auth-panel auth-panel-reset"
            method="post"
          >
            <input name="next" type="hidden" value={next} />

            <div className="auth-banner auth-banner-info">
              {copy.resetInfo}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reset-email">
                {copy.email}
              </label>
              <input
                autoComplete="email"
                className="auth-input"
                defaultValue={view.resetEmail}
                id="reset-email"
                name="email"
                placeholder={copy.email}
                required
                type="email"
              />
            </div>

            <button className="auth-button" disabled={!isSupabaseReady} type="submit">
              {copy.sendResetEmail}
            </button>

            <label className="auth-switch-link" htmlFor="auth-mode-signin">
              {copy.backToSignIn}
            </label>
          </form>
        </div>
      </section>
    </main>
  )
}
