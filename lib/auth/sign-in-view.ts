import type { SignInErrorCode, SignInMode } from '@/lib/auth/navigation'

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
  mode: SignInMode
  passwordUpdated: boolean
  reset: boolean
}

function buildResetSuccessMessage(email: string) {
  return `If an account exists for ${email || 'that email'}, a password reset email has been sent.`
}

export function getSignInViewState({
  email,
  error,
  mode,
  passwordUpdated,
  reset,
}: GetSignInViewStateOptions): SignInViewState {
  let signInMessage: SignInMessage | null = null
  let resetMessage: SignInMessage | null = null

  if (mode === 'signin') {
    if (error === 'invalid_credentials') {
      signInMessage = {
        text: 'Email or password is incorrect. Try again or reset your password.',
        tone: 'error',
      }
    } else if (error === 'missing_fields') {
      signInMessage = {
        text: 'Enter both your email and password and try again.',
        tone: 'error',
      }
    } else if (passwordUpdated) {
      signInMessage = {
        text: 'Password updated. Sign in with your new password.',
        tone: 'info',
      }
    }
  }

  if (mode === 'reset') {
    if (error === 'missing_fields') {
      resetMessage = {
        text: 'Enter the email address for your account and try again.',
        tone: 'error',
      }
    } else if (error === 'recovery_expired') {
      resetMessage = {
        text: 'Your password reset link is invalid or expired. Request a new reset email.',
        tone: 'error',
      }
    } else if (reset) {
      resetMessage = {
        text: buildResetSuccessMessage(email),
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
