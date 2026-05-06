import { createClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from '@/lib/auth/supabase/shared'

export type ManagedAuthUser = {
  createdAt: string | null
  email: string | null
  id: string
  lastSignInAt: string | null
}

function createSupabaseAdminClient() {
  const { serviceRoleKey, url } = getSupabaseEnv()

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for account management.')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function mapManagedAuthUser(user: {
  created_at?: string | null
  email?: string | null
  id: string
  last_sign_in_at?: string | null
}): ManagedAuthUser {
  return {
    createdAt: user.created_at ?? null,
    email: user.email ?? null,
    id: user.id,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}

export async function createManagedAuthUser(input: {
  email: string
  password: string
}) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    password: input.password,
  })

  if (error || !data.user) {
    throw error ?? new Error('Unable to create auth user.')
  }

  return {
    email: data.user.email ?? input.email,
    id: data.user.id,
  }
}

export async function updateManagedAuthUserPassword(input: {
  password: string
  userId: string
}) {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    password: input.password,
  })

  if (error) {
    throw error
  }
}

export async function listManagedAuthUsers() {
  const admin = createSupabaseAdminClient()
  const users: ManagedAuthUser[] = []
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw error
    }

    users.push(...data.users.map(mapManagedAuthUser))

    if (!data.nextPage) {
      break
    }

    page = data.nextPage
  }

  return users
}
