import { Pool } from 'pg'

const supabaseDbUrl = process.env.SUPABASE_DB_URL

if (!supabaseDbUrl) {
  throw new Error('SUPABASE_DB_URL is not set')
}

export const supabasePool = new Pool({
  connectionString: supabaseDbUrl,
})

supabasePool.on('error', (err) => {
  console.error('Unexpected error on Supabase pool:', err)
})

export async function closeSupabasePool() {
  await supabasePool.end()
}
