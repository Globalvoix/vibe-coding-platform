import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

let initialized = false

async function ensureTable() {
  if (initialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  TEXT NOT NULL,
      task_type   TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      priority    INTEGER NOT NULL DEFAULT 5,
      input       JSONB,
      output      JSONB,
      error       TEXT,
      attempts    INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at  TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS agent_tasks_session_idx  ON agent_tasks(session_id);
    CREATE INDEX IF NOT EXISTS agent_tasks_status_idx   ON agent_tasks(status);
    CREATE INDEX IF NOT EXISTS agent_tasks_type_idx     ON agent_tasks(task_type);
  `)
  initialized = true
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'retrying'

export interface AgentTask<TInput = unknown, TOutput = unknown> {
  id: string
  sessionId: string
  taskType: string
  status: TaskStatus
  priority: number
  input: TInput
  output: TOutput | null
  error: string | null
  attempts: number
  maxAttempts: number
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export async function enqueueTask<TInput>(params: {
  sessionId: string
  taskType: string
  input: TInput
  priority?: number
  maxAttempts?: number
}): Promise<string> {
  await ensureTable()
  const taskId = randomUUID()
  await pool.query(
    `INSERT INTO agent_tasks (id, session_id, task_type, input, priority, max_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      taskId,
      params.sessionId,
      params.taskType,
      JSON.stringify(params.input),
      params.priority ?? 5,
      params.maxAttempts ?? 3,
    ]
  )
  return taskId
}

export async function markTaskRunning(taskId: string): Promise<void> {
  await ensureTable()
  await pool.query(
    `UPDATE agent_tasks
     SET status = 'running', started_at = NOW(), updated_at = NOW(), attempts = attempts + 1
     WHERE id = $1`,
    [taskId]
  )
}

export async function markTaskDone<TOutput>(
  taskId: string,
  output: TOutput
): Promise<void> {
  await ensureTable()
  await pool.query(
    `UPDATE agent_tasks
     SET status = 'done', output = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [taskId, JSON.stringify(output)]
  )
}

export async function markTaskFailed(
  taskId: string,
  error: string,
  canRetry: boolean
): Promise<void> {
  await ensureTable()
  const status = canRetry ? 'retrying' : 'failed'
  await pool.query(
    `UPDATE agent_tasks
     SET status = $2, error = $3, updated_at = NOW()
     WHERE id = $1`,
    [taskId, status, error]
  )
}

export async function getTask<TInput, TOutput>(
  taskId: string
): Promise<AgentTask<TInput, TOutput> | null> {
  await ensureTable()
  const result = await pool.query<{
    id: string
    session_id: string
    task_type: string
    status: TaskStatus
    priority: number
    input: TInput
    output: TOutput | null
    error: string | null
    attempts: number
    max_attempts: number
    created_at: string
    updated_at: string
    started_at: string | null
    completed_at: string | null
  }>(`SELECT * FROM agent_tasks WHERE id = $1`, [taskId])
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    sessionId: row.session_id,
    taskType: row.task_type,
    status: row.status,
    priority: row.priority,
    input: row.input,
    output: row.output,
    error: row.error,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

export async function getSessionTasks(sessionId: string): Promise<AgentTask[]> {
  await ensureTable()
  const result = await pool.query<{
    id: string
    session_id: string
    task_type: string
    status: TaskStatus
    priority: number
    input: unknown
    output: unknown
    error: string | null
    attempts: number
    max_attempts: number
    created_at: string
    updated_at: string
    started_at: string | null
    completed_at: string | null
  }>(`SELECT * FROM agent_tasks WHERE session_id = $1 ORDER BY priority DESC, created_at ASC`, [
    sessionId,
  ])
  return result.rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    taskType: row.task_type,
    status: row.status,
    priority: row.priority,
    input: row.input,
    output: row.output,
    error: row.error,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }))
}

export async function runWithQueue<TInput, TOutput>(params: {
  sessionId: string
  taskType: string
  input: TInput
  priority?: number
  fn: (input: TInput) => Promise<TOutput>
}): Promise<TOutput> {
  const taskId = await enqueueTask({
    sessionId: params.sessionId,
    taskType: params.taskType,
    input: params.input,
    priority: params.priority,
  })
  await markTaskRunning(taskId)
  try {
    const output = await params.fn(params.input)
    await markTaskDone(taskId, output)
    return output
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const task = await getTask(taskId)
    const canRetry = (task?.attempts ?? 1) < (task?.maxAttempts ?? 3)
    await markTaskFailed(taskId, message, canRetry)
    throw err
  }
}
