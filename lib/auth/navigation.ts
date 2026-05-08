export type SignInErrorCode =
  | 'account_disabled'
  | 'account_not_provisioned'
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
  return new URL(buildSignInPath(options), getConfiguredAppBaseUrl(requestUrl))
}

export function getConfiguredAppBaseUrl(requestUrl: URL) {
  const configuredBase = process.env.SUPABASE_AUTH_REDIRECT_URL

  return configuredBase ? new URL(configuredBase) : requestUrl
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
  const callbackUrl = new URL('/auth/callback', getConfiguredAppBaseUrl(requestUrl))

  callbackUrl.searchParams.set('next', resolveNextPath(next))

  if (flow) {
    callbackUrl.searchParams.set('flow', flow)
  }

  return callbackUrl.toString()
}
