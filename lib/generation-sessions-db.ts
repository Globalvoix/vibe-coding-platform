import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureGenerationSessionsTable() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS generation_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sandbox_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      progress JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS generation_sessions_project_id_idx ON generation_sessions(project_id);
    CREATE INDEX IF NOT EXISTS generation_sessions_user_id_idx ON generation_sessions(user_id);
    CREATE INDEX IF NOT EXISTS generation_sessions_status_idx ON generation_sessions(status);
  `)
  initialized = true
}

export interface GenerationSessionRecord {
  id: string
  project_id: string
  user_id: string
  sandbox_id: string | null
  status: 'active' | 'completed' | 'error' | 'cancelled'
  progress: unknown | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export async function createGenerationSession(
  sessionId: string,
  projectId: string,
  userId: string,
  sandboxId: string | null = null
): Promise<GenerationSessionRecord> {
  await ensureGenerationSessionsTable()
  const result = await pool.query<GenerationSessionRecord>(
    `INSERT INTO generation_sessions (id, project_id, user_id, sandbox_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING *`,
    [sessionId, projectId, userId, sandboxId]
  )
  return result.rows[0]!
}

export async function getGenerationSession(
  sessionId: string
): Promise<GenerationSessionRecord | null> {
  await ensureGenerationSessionsTable()
  const result = await pool.query<GenerationSessionRecord>(
    `SELECT * FROM generation_sessions WHERE id = $1`,
    [sessionId]
  )
  return result.rows[0] ?? null
}

export async function getActiveGenerationSession(
  projectId: string
): Promise<GenerationSessionRecord | null> {
  await ensureGenerationSessionsTable()
  const result = await pool.query<GenerationSessionRecord>(
    `SELECT * FROM generation_sessions 
     WHERE project_id = $1 AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId]
  )
  return result.rows[0] ?? null
}

export async function updateGenerationSessionProgress(
  sessionId: string,
  progress: unknown
): Promise<GenerationSessionRecord | null> {
  await ensureGenerationSessionsTable()
  const result = await pool.query<GenerationSessionRecord>(
    `UPDATE generation_sessions
     SET progress = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId, JSON.stringify(progress)]
  )
  return result.rows[0] ?? null
}

export async function completeGenerationSession(
  sessionId: string,
  status: 'completed' | 'error' | 'cancelled' = 'completed'
): Promise<GenerationSessionRecord | null> {
  await ensureGenerationSessionsTable()
  const result = await pool.query<GenerationSessionRecord>(
    `UPDATE generation_sessions
     SET status = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId, status]
  )
  return result.rows[0] ?? null
}

export async function cancelGenerationSession(sessionId: string): Promise<void> {
  await ensureGenerationSessionsTable()
  await pool.query(
    `UPDATE generation_sessions
     SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [sessionId]
  )
}

export async function cleanupOldSessions(hoursOld: number = 24): Promise<number> {
  await ensureGenerationSessionsTable()
  const result = await pool.query<{ count: number }>(
    `DELETE FROM generation_sessions
     WHERE status IN ('completed', 'error', 'cancelled')
     AND completed_at < NOW() - INTERVAL '${hoursOld} hours'
     RETURNING COUNT(*) as count`
  )
  return result.rows[0]?.count ?? 0
}
