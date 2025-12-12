import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureSupabaseProjectsTable() {
  if (initialized) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supabase_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      supabase_project_ref TEXT NOT NULL,
      supabase_org_id TEXT,
      supabase_project_name TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, project_id)
    );
    CREATE INDEX IF NOT EXISTS supabase_projects_user_project_idx 
      ON supabase_projects(user_id, project_id);
  `)

  initialized = true
}

export interface SupabaseProjectRecord {
  id: string
  user_id: string
  project_id: string
  supabase_project_ref: string
  supabase_org_id: string | null
  supabase_project_name: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export async function saveSupabaseProject(params: {
  userId: string
  projectId: string
  supabaseProjectRef: string
  supabaseOrgId?: string | null
  supabaseProjectName?: string | null
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
}): Promise<SupabaseProjectRecord> {
  await ensureSupabaseProjectsTable()

  const id = crypto.randomUUID()
  const result = await pool.query<SupabaseProjectRecord>(
    `INSERT INTO supabase_projects 
      (id, user_id, project_id, supabase_project_ref, supabase_org_id, 
       supabase_project_name, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, project_id)
     DO UPDATE SET
       supabase_project_ref = EXCLUDED.supabase_project_ref,
       supabase_org_id = COALESCE(EXCLUDED.supabase_org_id, supabase_projects.supabase_org_id),
       supabase_project_name = EXCLUDED.supabase_project_name,
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, supabase_projects.refresh_token),
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      params.userId,
      params.projectId,
      params.supabaseProjectRef,
      params.supabaseOrgId ?? null,
      params.supabaseProjectName ?? null,
      params.accessToken,
      params.refreshToken ?? null,
      params.expiresAt ? params.expiresAt.toISOString() : null,
    ]
  )

  return result.rows[0]
}

export async function getSupabaseProject(
  userId: string,
  projectId: string
): Promise<SupabaseProjectRecord | null> {
  await ensureSupabaseProjectsTable()

  const result = await pool.query<SupabaseProjectRecord>(
    `SELECT * FROM supabase_projects 
     WHERE user_id = $1 AND project_id = $2`,
    [userId, projectId]
  )

  return result.rows[0] ?? null
}

export async function deleteSupabaseProject(
  userId: string,
  projectId: string
): Promise<void> {
  await ensureSupabaseProjectsTable()

  await pool.query(
    `DELETE FROM supabase_projects 
     WHERE user_id = $1 AND project_id = $2`,
    [userId, projectId]
  )
}
