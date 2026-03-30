import { Pool } from 'pg'
import type { AgentName } from '../agents/types'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

let initialized = false

async function ensureTable() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  TEXT NOT NULL,
      project_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      event_type  TEXT NOT NULL,
      agent       TEXT,
      data        JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS agent_events_session_idx  ON agent_events(session_id);
    CREATE INDEX IF NOT EXISTS agent_events_project_idx  ON agent_events(project_id);
    CREATE INDEX IF NOT EXISTS agent_events_user_idx     ON agent_events(user_id);
    CREATE INDEX IF NOT EXISTS agent_events_type_idx     ON agent_events(event_type);
  `)
  initialized = true
}

export type EventType =
  | 'session_start'
  | 'agent_start'
  | 'agent_complete'
  | 'agent_error'
  | 'plan_produced'
  | 'diffs_produced'
  | 'problems_found'
  | 'synthesis_complete'
  | 'execution_start'
  | 'execution_result'
  | 'execution_retry'
  | 'execution_error'
  | 'execution_success'
  | 'execution_failed'
  | 'auto_fix_applied'
  | 'diff_rejected'
  | 'diff_applied'
  | 'session_complete'
  | 'session_cancelled'

export interface AgentEvent {
  id: string
  session_id: string
  project_id: string
  user_id: string
  event_type: EventType
  agent: AgentName | null
  data: unknown
  created_at: string
}

export async function appendEvent(params: {
  sessionId: string
  projectId: string
  userId: string
  eventType: EventType
  agent?: AgentName
  data?: unknown
}): Promise<void> {
  try {
    await ensureTable()
    await pool.query(
      `INSERT INTO agent_events (session_id, project_id, user_id, event_type, agent, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.sessionId,
        params.projectId,
        params.userId,
        params.eventType,
        params.agent ?? null,
        JSON.stringify(params.data ?? {}),
      ]
    )
  } catch (err) {
    console.warn('[event-log] Failed to append event:', err)
  }
}

export async function getSessionEvents(sessionId: string): Promise<AgentEvent[]> {
  try {
    await ensureTable()
    const result = await pool.query<AgentEvent>(
      `SELECT * FROM agent_events WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    )
    return result.rows
  } catch {
    return []
  }
}

export async function getProjectHistory(
  projectId: string,
  limit = 20
): Promise<AgentEvent[]> {
  try {
    await ensureTable()
    const result = await pool.query<AgentEvent>(
      `SELECT * FROM agent_events
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [projectId, limit]
    )
    return result.rows
  } catch {
    return []
  }
}

export async function getPastSessionSummaries(
  userId: string,
  limit = 10
): Promise<Array<{ sessionId: string; projectId: string; data: unknown; createdAt: string }>> {
  try {
    await ensureTable()
    const result = await pool.query<{
      session_id: string
      project_id: string
      data: unknown
      created_at: string
    }>(
      `SELECT session_id, project_id, data, created_at
       FROM agent_events
       WHERE user_id = $1
         AND event_type = 'session_complete'
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return result.rows.map((r) => ({
      sessionId: r.session_id,
      projectId: r.project_id,
      data: r.data,
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}

export async function getPastPlanEvents(
  userId: string,
  limit = 10
): Promise<Array<{ sessionId: string; data: unknown; createdAt: string }>> {
  try {
    await ensureTable()
    const result = await pool.query<{
      session_id: string
      data: unknown
      created_at: string
    }>(
      `SELECT session_id, data, created_at
       FROM agent_events
       WHERE user_id = $1
         AND event_type = 'plan_produced'
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return result.rows.map((r) => ({
      sessionId: r.session_id,
      data: r.data,
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}
