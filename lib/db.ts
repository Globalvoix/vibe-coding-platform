import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

let pool: Pool | null = null

export function getDb() {
  if (!pool) {
    pool = new Pool({ connectionString })
  }
  return pool
}
