import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

let initialized = false

async function ensureTable() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_diffs (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pending_id    TEXT NOT NULL UNIQUE,
      session_id    TEXT NOT NULL,
      project_id    TEXT NOT NULL,
      sandbox_id    TEXT NOT NULL,
      diffs         JSONB NOT NULL,
      summary       TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at   TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS pending_diffs_session_idx   ON pending_diffs(session_id);
    CREATE INDEX IF NOT EXISTS pending_diffs_project_idx   ON pending_diffs(project_id);
    CREATE INDEX IF NOT EXISTS pending_diffs_pending_id_idx ON pending_diffs(pending_id);
  `)
  initialized = true
}

export interface PendingDiffFile {
  path: string
  action: 'create' | 'modify' | 'delete'
  content: string
  description: string
}

export interface PendingDiffRecord {
  pendingId: string
  sessionId: string
  projectId: string
  sandboxId: string
  diffs: PendingDiffFile[]
  summary: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  resolvedAt: string | null
}

/**
 * Store a set of pending diffs waiting for user approval.
 */
export async function storePendingDiffs(params: {
  sessionId: string
  projectId: string
  sandboxId: string
  diffs: PendingDiffFile[]
  summary: string
}): Promise<string> {
  await ensureTable()
  const pendingId = randomUUID()

  await pool.query(
    `INSERT INTO pending_diffs (pending_id, session_id, project_id, sandbox_id, diffs, summary)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      pendingId,
      params.sessionId,
      params.projectId,
      params.sandboxId,
      JSON.stringify(params.diffs),
      params.summary,
    ]
  )
  return pendingId
}

/**
 * Fetch a pending diff set by pendingId.
 */
export async function getPendingDiffs(pendingId: string): Promise<PendingDiffRecord | null> {
  await ensureTable()
  const result = await pool.query<{
    pending_id: string
    session_id: string
    project_id: string
    sandbox_id: string
    diffs: PendingDiffFile[]
    summary: string
    status: string
    created_at: string
    resolved_at: string | null
  }>(`SELECT * FROM pending_diffs WHERE pending_id = $1`, [pendingId])

  const row = result.rows[0]
  if (!row) return null

  return {
    pendingId: row.pending_id,
    sessionId: row.session_id,
    projectId: row.project_id,
    sandboxId: row.sandbox_id,
    diffs: row.diffs,
    summary: row.summary,
    status: row.status as 'pending' | 'approved' | 'rejected',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

/**
 * Mark a pending diff set as approved or rejected.
 */
export async function resolvePendingDiffs(
  pendingId: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  await ensureTable()
  await pool.query(
    `UPDATE pending_diffs
     SET status = $2, resolved_at = NOW()
     WHERE pending_id = $1`,
    [pendingId, decision]
  )
}

/**
 * Build a human-readable summary for a set of diffs.
 */
export function buildDiffSummary(diffs: PendingDiffFile[]): string {
  const creates = diffs.filter((d) => d.action === 'create').length
  const modifies = diffs.filter((d) => d.action === 'modify').length
  const deletes = diffs.filter((d) => d.action === 'delete').length
  const parts: string[] = []
  if (creates > 0) parts.push(`${creates} file${creates > 1 ? 's' : ''} to create`)
  if (modifies > 0) parts.push(`${modifies} file${modifies > 1 ? 's' : ''} to modify`)
  if (deletes > 0) parts.push(`${deletes} file${deletes > 1 ? 's' : ''} to delete`)
  return parts.join(', ') || 'No file changes'
}
