export type SignInErrorCode =
  | 'invalid_credentials'
  | 'missing_fields'
  | 'recovery_expired'

export type SignInMode = 'signin' | 'reset'

type BuildSignInPathOptions = {
  email?: string | null
  error?: SignInErrorCode
  mode?: SignInMode | null
  next?: string | null
  passwordUpdated?: boolean
  reset?: boolean
}

export function resolveNextPath(
  value: FormDataEntryValue | string | string[] | null | undefined,
) {
  if (typeof value !== 'string' || value.length === 0) {
    return '/'
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  return value
}

export function resolveSignInMode(
  value: FormDataEntryValue | string | string[] | null | undefined,
): SignInMode {
  return value === 'reset' ? 'reset' : 'signin'
}

export function buildSignInPath({
  email,
  error,
  mode,
  next,
  passwordUpdated = false,
  reset = false,
}: BuildSignInPathOptions = {}) {
  const signInUrl = new URL('/sign-in', 'http://localhost')
  signInUrl.searchParams.set('mode', resolveSignInMode(mode))
  signInUrl.searchParams.set('next', resolveNextPath(next))

  if (email) {
    signInUrl.searchParams.set('email', email)
  }

  if (error) {
    signInUrl.searchParams.set('error', error)
  }

  if (reset) {
    signInUrl.searchParams.set('reset', '1')
  }

  if (passwordUpdated) {
    signInUrl.searchParams.set('passwordUpdated', '1')
  }

  return `${signInUrl.pathname}${signInUrl.search}`
}

export function buildSignInUrl(
  requestUrl: URL,
  options: BuildSignInPathOptions = {},
) {
  return new URL(buildSignInPath(options), requestUrl)
}

export function buildAuthCallbackUrl(
  requestUrl: URL,
  {
    flow,
    next,
  }: {
    flow?: 'recovery'
    next?: string | null
  } = {},
) {
  const configuredBase = process.env.SUPABASE_AUTH_REDIRECT_URL
  const callbackUrl = configuredBase
    ? new URL('/auth/callback', configuredBase)
    : new URL('/auth/callback', requestUrl.origin)

  callbackUrl.searchParams.set('next', resolveNextPath(next))

  if (flow) {
    callbackUrl.searchParams.set('flow', flow)
  }

  return callbackUrl.toString()
}
