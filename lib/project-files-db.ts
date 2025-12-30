import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureProjectFilesTable() {
  if (initialized) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_files (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (project_id, path)
    );

    CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON project_files(project_id);
    CREATE INDEX IF NOT EXISTS project_files_user_id_idx ON project_files(user_id);
  `)

  initialized = true
}

export interface ProjectFileRecord {
  project_id: string
  user_id: string
  path: string
  content: string
  updated_at: string
}

export async function upsertProjectFiles(params: {
  userId: string
  projectId: string
  files: Array<{ path: string; content: string }>
}) {
  const { userId, projectId, files } = params
  await ensureProjectFilesTable()

  const normalized = files
    .filter((f) => typeof f?.path === 'string' && f.path && typeof f?.content === 'string')
    .map((f) => ({ path: f.path, content: f.content }))

  if (normalized.length === 0) return

  const values: unknown[] = []
  const placeholders: string[] = []

  for (let i = 0; i < normalized.length; i++) {
    const base = i * 4
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`)
    values.push(projectId, userId, normalized[i].path, normalized[i].content)
  }

  await pool.query(
    `INSERT INTO project_files (project_id, user_id, path, content)
     VALUES ${placeholders.join(',')}
     ON CONFLICT (project_id, path)
     DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
    values
  )
}

export async function listProjectFiles(params: { userId: string; projectId: string }) {
  const { userId, projectId } = params
  await ensureProjectFilesTable()

  const result = await pool.query<ProjectFileRecord>(
    `SELECT project_id, user_id, path, content, updated_at
     FROM project_files
     WHERE user_id = $1 AND project_id = $2
     ORDER BY path ASC`,
    [userId, projectId]
  )

  return result.rows
}

export async function listProjectFilePaths(params: { userId: string; projectId: string }) {
  const { userId, projectId } = params
  await ensureProjectFilesTable()

  const result = await pool.query<Pick<ProjectFileRecord, 'path'>>(
    `SELECT path
     FROM project_files
     WHERE user_id = $1 AND project_id = $2
     ORDER BY path ASC`,
    [userId, projectId]
  )

  return result.rows.map((r) => r.path)
}

export async function getProjectFile(params: { userId: string; projectId: string; path: string }) {
  const { userId, projectId, path } = params
  await ensureProjectFilesTable()

  const result = await pool.query<Pick<ProjectFileRecord, 'content'>>(
    `SELECT content
     FROM project_files
     WHERE user_id = $1 AND project_id = $2 AND path = $3
     LIMIT 1`,
    [userId, projectId, path]
  )

  return result.rows[0]?.content ?? null
}
