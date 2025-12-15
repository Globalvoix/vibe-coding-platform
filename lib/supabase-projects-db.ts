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

export async function listUserSupabaseProjects(
  userId: string
): Promise<SupabaseProjectRecord[]> {
  await ensureSupabaseProjectsTable()

  const result = await pool.query<SupabaseProjectRecord>(
    `SELECT * FROM supabase_projects
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  )

  return result.rows
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) <= new Date()
}

export async function refreshSupabaseToken(
  connection: SupabaseProjectRecord,
  supabaseUrl: string,
  oauthClientId: string,
  oauthClientSecret: string
): Promise<SupabaseProjectRecord | null> {
  if (!connection.refresh_token) {
    return null // Cannot refresh without refresh token
  }

  try {
    const tokenResponse = await fetch(
      new URL('/auth/v1/oauth/token', supabaseUrl).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: oauthClientId,
          client_secret: oauthClientSecret,
        }),
      }
    )

    if (!tokenResponse.ok) {
      console.error('Token refresh failed', {
        status: tokenResponse.status,
        userId: connection.user_id,
        projectId: connection.project_id,
      })
      return null
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    const expiresIn = tokenData.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Update token in database
    const result = await pool.query<SupabaseProjectRecord>(
      `UPDATE supabase_projects
       SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
       WHERE user_id = $4 AND project_id = $5
       RETURNING *`,
      [
        tokenData.access_token,
        tokenData.refresh_token || connection.refresh_token,
        expiresAt.toISOString(),
        connection.user_id,
        connection.project_id,
      ]
    )

    return result.rows[0] ?? null
  } catch (error) {
    console.error('Error refreshing Supabase token', {
      error: error instanceof Error ? error.message : String(error),
      userId: connection.user_id,
      projectId: connection.project_id,
    })
    return null
  }
}

export async function getSupabaseProjectWithRefresh(
  userId: string,
  projectId: string,
  supabaseUrl?: string,
  oauthClientId?: string,
  oauthClientSecret?: string
): Promise<SupabaseProjectRecord | null> {
  let connection = await getSupabaseProject(userId, projectId)
  if (!connection) return null

  // Check if token is expired and refresh if possible
  if (
    isTokenExpired(connection.expires_at) &&
    supabaseUrl &&
    oauthClientId &&
    oauthClientSecret
  ) {
    const refreshed = await refreshSupabaseToken(
      connection,
      supabaseUrl,
      oauthClientId,
      oauthClientSecret
    )
    if (refreshed) {
      connection = refreshed
    } else {
      // Token refresh failed, return stale connection
      console.warn('Token refresh failed, returning stale connection', {
        userId,
        projectId,
      })
    }
  }

  return connection
}
