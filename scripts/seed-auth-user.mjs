import { randomInt } from 'node:crypto'
import process from 'node:process'

import { createClient } from '@supabase/supabase-js'

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function readRequiredEnv(key) {
  const value = process.env[key]

  if (!value) {
    throw new Error(`${key} is required to seed a Supabase auth user.`)
  }

  return value
}

function readArg(name) {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)

  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function resolveEmail() {
  const email = readArg('email') ?? process.argv[2] ?? null

  if (!email) {
    throw new Error('Pass the target email as --email <address>.')
  }

  return email.trim().toLowerCase()
}

function generatePassword(length = 24) {
  return Array.from({ length }, () =>
    PASSWORD_ALPHABET[randomInt(0, PASSWORD_ALPHABET.length)],
  ).join('')
}

async function findUserByEmail(supabase, email) {
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw error
    }

    const existingUser = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    )

    if (existingUser) {
      return existingUser
    }

    if (!data.nextPage) {
      return null
    }

    page = data.nextPage
  }
}

async function upsertPasswordUser({ email, password, serviceRoleKey, url }) {
  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const existingUser = await findUserByEmail(adminClient, email)

  if (existingUser) {
    const { data, error } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      {
        email,
        email_confirm: true,
        password,
      },
    )

    if (error) {
      throw error
    }

    return {
      action: 'updated',
      user: data.user,
    }
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  })

  if (error) {
    throw error
  }

  return {
    action: 'created',
    user: data.user,
  }
}

async function verifyPasswordLogin({ anonKey, email, password, url }) {
  if (!anonKey) {
    return false
  }

  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  await client.auth.signOut()

  return true
}

async function main() {
  const email = resolveEmail()
  const password = readArg('password') ?? generatePassword()
  const url = readRequiredEnv('SUPABASE_URL')
  const serviceRoleKey = readRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = process.env.SUPABASE_ANON_KEY ?? null

  const result = await upsertPasswordUser({
    email,
    password,
    serviceRoleKey,
    url,
  })

  const verifiedLogin = await verifyPasswordLogin({
    anonKey,
    email,
    password,
    url,
  })

  console.log(`Seed account ${result.action}: ${email}`)
  console.log(`User ID: ${result.user.id}`)
  console.log(`Password: ${password}`)
  console.log(`Password login verified: ${verifiedLogin ? 'yes' : 'no'}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
