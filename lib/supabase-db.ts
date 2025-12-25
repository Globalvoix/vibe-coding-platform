import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

export const pool = new Pool({ connectionString })

export interface DatabaseSchema {
  name: string
  description: string
  sql: string
}

const DATABASE_KEYWORDS = [
  'database',
  'sql',
  'postgres',
  'postgresql',
  'storage',
  'data',
  'backend',
  'api',
  'users',
  'save',
  'store',
  'persistent',
  'mongodb',
  'firestore',
]

export function detectNeedsDatabase(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase()
  return DATABASE_KEYWORDS.some((keyword) => lowerPrompt.includes(keyword))
}

export async function createProjectDatabase(
  projectId: string,
  appName?: string
): Promise<{
  success: boolean
  error?: string
  schema?: {
    id: string
    name: string
  }
}> {
  try {
    void appName
    const projectResult = await pool.query<{ cloud_enabled: boolean }>(
      `SELECT cloud_enabled FROM projects WHERE id = $1`,
      [projectId]
    )

    const cloudEnabled = projectResult.rows[0]?.cloud_enabled ?? false

    if (!cloudEnabled) {
      return {
        success: false,
        error: 'Cloud is not enabled for this project',
      }
    }

    const tableName = `${projectId}_app_data`.replace(/[^a-z0-9_]/g, '_')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${tableName}_created_at_idx" ON "${tableName}"(created_at DESC)`
    )

    await pool.query(
      `CREATE INDEX IF NOT EXISTS "${tableName}_updated_at_idx" ON "${tableName}"(updated_at DESC)`
    )

    return {
      success: true,
      schema: {
        id: projectId,
        name: tableName,
      },
    }
  } catch (error) {
    console.error('Failed to create database:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export interface SupabaseConnectionParams {
  projectRef?: string
  anonKey?: string
}

export function generateSupabaseClientCode(
  projectId: string,
  connection?: SupabaseConnectionParams
): string {
  const projectRef = connection?.projectRef?.trim()
  const anonKey = connection?.anonKey?.trim()

  const tableName = `${projectId}_app_data`

  if (projectRef && anonKey) {
    const supabaseUrl = `https://${projectRef}.supabase.co`

    return `import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = '${supabaseUrl}'
const supabaseKey = '${anonKey}'

let _client: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client
  _client = createClient(supabaseUrl, supabaseKey)
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient() as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export async function fetchAppData() {
  const { data, error } = await getSupabaseClient()
    .from('${tableName}')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching data:', error)
    return []
  }

  return data || []
}

export async function insertAppData(data: Record<string, unknown>) {
  const { data: result, error } = await getSupabaseClient()
    .from('${tableName}')
    .insert([{ data }])
    .select()

  if (error) {
    console.error('Error inserting data:', error)
    return null
  }

  return result?.[0] || null
}

export function subscribeToAppData(callback: (payload: unknown) => void) {
  return getSupabaseClient()
    .channel('${tableName}')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: '${tableName}' },
      (payload) => callback(payload)
    )
    .subscribe()
}
`
  }

  return `import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  _client = createClient(supabaseUrl, supabaseKey)
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient() as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export async function fetchAppData() {
  const { data, error } = await getSupabaseClient()
    .from('${tableName}')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching data:', error)
    return []
  }

  return data || []
}

export async function insertAppData(data: Record<string, unknown>) {
  const { data: result, error } = await getSupabaseClient()
    .from('${tableName}')
    .insert([{ data }])
    .select()

  if (error) {
    console.error('Error inserting data:', error)
    return null
  }

  return result?.[0] || null
}

export function subscribeToAppData(callback: (payload: unknown) => void) {
  return getSupabaseClient()
    .channel('${tableName}')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: '${tableName}' },
      (payload) => callback(payload)
    )
    .subscribe()
}
`
}

export function generateSupabaseEnvFile(connection?: SupabaseConnectionParams): string {
  const projectRef = connection?.projectRef?.trim()
  const anonKey = connection?.anonKey?.trim()

  if (projectRef && anonKey) {
    const supabaseUrl = `https://${projectRef}.supabase.co`
    return `# Supabase Configuration (Connected Project)
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  const lines: string[] = ['# Supabase Configuration']
  if (url) lines.push(`NEXT_PUBLIC_SUPABASE_URL=${url}`)
  if (key) lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${key}`)

  return lines.join('\n') + '\n'
}
