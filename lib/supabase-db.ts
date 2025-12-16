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
  appName: string
): Promise<{
  success: boolean
  error?: string
  schema?: {
    id: string
    name: string
  }
}> {
  try {
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

  if (projectRef && anonKey) {
    const supabaseUrl = `https://${projectRef}.supabase.co`
    return `import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with connected project
const supabaseUrl = '${supabaseUrl}'
const supabaseKey = '${anonKey}'
export const supabase = createClient(supabaseUrl, supabaseKey)

// Example: Fetch data from your app table
export async function fetchAppData() {
  const { data, error } = await supabase
    .from('${projectId}_app_data')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching data:', error)
    return []
  }

  return data || []
}

// Example: Insert data into your app table
export async function insertAppData(data: Record<string, any>) {
  const { data: result, error } = await supabase
    .from('${projectId}_app_data')
    .insert([{ data }])
    .select()

  if (error) {
    console.error('Error inserting data:', error)
    return null
  }

  return result?.[0] || null
}

// Example: Subscribe to real-time changes
export function subscribeToAppData(callback: (data: any) => void) {
  return supabase
    .channel('${projectId}_app_data')
    .on('postgres_changes', { event: '*', schema: 'public', table: '${projectId}_app_data' }, callback)
    .subscribe()
}
`
  }

  return `import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const supabase = createClient(supabaseUrl, supabaseKey)

// Example: Fetch data from your app table
export async function fetchAppData() {
  const { data, error } = await supabase
    .from('${projectId}_app_data')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching data:', error)
    return []
  }

  return data || []
}

// Example: Insert data into your app table
export async function insertAppData(data: Record<string, any>) {
  const { data: result, error } = await supabase
    .from('${projectId}_app_data')
    .insert([{ data }])
    .select()

  if (error) {
    console.error('Error inserting data:', error)
    return null
  }

  return result?.[0] || null
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

  return `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
`
}
