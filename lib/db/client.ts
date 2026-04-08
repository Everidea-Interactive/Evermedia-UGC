import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from '@/lib/db/schema'

declare global {
  var __evermediaSql__: postgres.Sql | undefined
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured on the server.')
  }

  return databaseUrl
}

function getSqlClient() {
  if (!globalThis.__evermediaSql__) {
    globalThis.__evermediaSql__ = postgres(getDatabaseUrl(), {
      max: 1,
      prepare: false,
    })
  }

  return globalThis.__evermediaSql__
}

export function getDatabase() {
  return drizzle(getSqlClient(), { schema })
}
