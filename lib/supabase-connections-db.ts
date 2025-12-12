import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureSupabaseConnectionsTable() {
  if (initialized) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supabase_connections (
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      supabase_project_ref TEXT,
      supabase_org_id TEXT,
      supabase_project_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, project_id)
    );
    CREATE INDEX IF NOT EXISTS supabase_connections_user_id_idx ON supabase_connections(user_id);
    CREATE INDEX IF NOT EXISTS supabase_connections_project_id_idx ON supabase_connections(project_id);
  `)

  initialized = true
}

export interface SupabaseConnectionRecord {
  user_id: string
  project_id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  supabase_project_ref: string | null
  supabase_org_id: string | null
  supabase_project_name: string | null
  created_at: string
  updated_at: string
}

export async function upsertSupabaseConnection(params: {
  userId: string
  projectId: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}): Promise<SupabaseConnectionRecord> {
  await ensureSupabaseConnectionsTable()

  const result = await pool.query<SupabaseConnectionRecord>(
    `INSERT INTO supabase_connections (user_id, project_id, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, project_id)
     DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING *`,
    [
      params.userId,
      params.projectId,
      params.accessToken,
      params.refreshToken,
      params.expiresAt ? params.expiresAt.toISOString() : null,
    ]
  )

  return result.rows[0]
}

export async function getSupabaseConnection(
  userId: string,
  projectId: string
): Promise<SupabaseConnectionRecord | null> {
  await ensureSupabaseConnectionsTable()

  const result = await pool.query<SupabaseConnectionRecord>(
    `SELECT * FROM supabase_connections WHERE user_id = $1 AND project_id = $2`,
    [userId, projectId]
  )

  return result.rows[0] ?? null
}
