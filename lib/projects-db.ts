import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureProjectsTable() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      initial_prompt TEXT,
      sandbox_state JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cloud_enabled BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
    CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);
    ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS cloud_enabled BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sandbox_state JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS project_versions_project_id_idx ON project_versions(project_id);
    CREATE INDEX IF NOT EXISTS project_versions_created_at_idx ON project_versions(created_at DESC);
  `)
  initialized = true
}

export interface ProjectRecord {
  id: string
  user_id: string
  name: string
  initial_prompt: string | null
  sandbox_state: unknown | null
  created_at: string
  updated_at: string
  cloud_enabled: boolean
}

export async function createProject(userId: string, prompt: string): Promise<ProjectRecord> {
  await ensureProjectsTable()
  const id = crypto.randomUUID()
  const trimmed = prompt.trim()
  const name = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed || 'Untitled project'

  const result = await pool.query<ProjectRecord>(
    `INSERT INTO projects (id, user_id, name, initial_prompt)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, userId, name, prompt]
  )

  return result.rows[0]
}

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
  await ensureProjectsTable()
  const result = await pool.query<ProjectRecord>(
    `SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  )
  return result.rows
}

export async function countProjectsCreatedSince(
  userId: string,
  periodStart: Date
): Promise<number> {
  await ensureProjectsTable()
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM projects
     WHERE user_id = $1 AND created_at >= $2`,
    [userId, periodStart.toISOString()]
  )
  return result.rows[0]?.count ?? 0
}

export async function getProject(userId: string, id: string): Promise<ProjectRecord | null> {
  await ensureProjectsTable()
  const result = await pool.query<ProjectRecord>(
    `SELECT * FROM projects WHERE user_id = $1 AND id = $2`,
    [userId, id]
  )
  return result.rows[0] ?? null
}

export async function renameProject(
  userId: string,
  id: string,
  name: string
): Promise<ProjectRecord | null> {
  await ensureProjectsTable()
  const result = await pool.query<ProjectRecord>(
    `UPDATE projects
     SET name = $3, updated_at = NOW()
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    [userId, id, name]
  )
  return result.rows[0] ?? null
}

export async function updateProjectSandboxState(
  userId: string,
  id: string,
  sandboxState: unknown
): Promise<ProjectRecord | null> {
  await ensureProjectsTable()
  const result = await pool.query<ProjectRecord>(
    `UPDATE projects
     SET sandbox_state = $3, updated_at = NOW()
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    [userId, id, sandboxState]
  )
  return result.rows[0] ?? null
}

export async function updateProjectCloudEnabled(
  userId: string,
  id: string,
  cloudEnabled: boolean
): Promise<ProjectRecord | null> {
  await ensureProjectsTable()
  const result = await pool.query<ProjectRecord>(
    `UPDATE projects
     SET cloud_enabled = $3, updated_at = NOW()
     WHERE user_id = $1 AND id = $2
     RETURNING *`,
    [userId, id, cloudEnabled]
  )
  return result.rows[0] ?? null
}

export async function deleteProject(userId: string, id: string): Promise<void> {
  await ensureProjectsTable()
  await pool.query(`DELETE FROM projects WHERE user_id = $1 AND id = $2`, [userId, id])
}
