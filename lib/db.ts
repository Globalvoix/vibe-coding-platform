import { Pool } from 'pg'

const rawConnectionString = process.env.DATABASE_URL

if (!rawConnectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const connectionString: string = rawConnectionString

let pool: Pool | null = null

export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString })
  }
  return pool
}
