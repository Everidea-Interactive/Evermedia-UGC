type SupabaseEnv = {
  anonKey: string
  redirectUrl: string | null
  serviceRoleKey: string | null
  url: string
}

function readRequiredEnv(key: string) {
  const value = process.env[key]

  if (!value) {
    throw new Error(`${key} is not configured on the server.`)
  }

  return value
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    anonKey: readRequiredEnv('SUPABASE_ANON_KEY'),
    redirectUrl: process.env.SUPABASE_AUTH_REDIRECT_URL ?? null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
    url: readRequiredEnv('SUPABASE_URL'),
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}
