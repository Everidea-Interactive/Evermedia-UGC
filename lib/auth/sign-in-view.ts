import type { SignInErrorCode, SignInMode } from '@/lib/auth/navigation'
import { getDictionary, type Locale } from '@/lib/i18n'

type SignInMessage = {
  text: string
  tone: 'error' | 'info'
}

export type SignInViewState = {
  initialMode: SignInMode
  resetEmail: string
  resetMessage: SignInMessage | null
  signInEmail: string
  signInMessage: SignInMessage | null
}

type GetSignInViewStateOptions = {
  email: string
  error: SignInErrorCode | null
  locale?: Locale
  mode: SignInMode
  passwordUpdated: boolean
  reset: boolean
}

export function getSignInViewState({
  email,
  error,
  locale = 'en',
  mode,
  passwordUpdated,
  reset,
}: GetSignInViewStateOptions): SignInViewState {
  const messages = getDictionary(locale).auth.messages
  let signInMessage: SignInMessage | null = null
  let resetMessage: SignInMessage | null = null

  if (mode === 'signin') {
    if (error === 'invalid_credentials') {
      signInMessage = {
        text: messages.invalidCredentials,
        tone: 'error',
      }
    } else if (error === 'missing_fields') {
      signInMessage = {
        text: messages.missingCredentials,
        tone: 'error',
      }
    } else if (passwordUpdated) {
      signInMessage = {
        text: messages.passwordUpdated,
        tone: 'info',
      }
    }
  }

  if (mode === 'reset') {
    if (error === 'missing_fields') {
      resetMessage = {
        text: messages.missingAccountEmail,
        tone: 'error',
      }
    } else if (error === 'recovery_expired') {
      resetMessage = {
        text: messages.recoveryExpired,
        tone: 'error',
      }
    } else if (reset) {
      resetMessage = {
        text: messages.resetSent(email),
        tone: 'info',
      }
    }
  }

  return {
    initialMode: mode,
    resetEmail: mode === 'reset' ? email : '',
    resetMessage,
    signInEmail: mode === 'signin' ? email : '',
    signInMessage,
  }
}
