import { Pool } from 'pg'
import { encryptEnvVar, decryptEnvVar } from './env-encryption'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureEnvVarsTable() {
  if (initialized) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_env_vars (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      is_sensitive BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(project_id, key),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS project_env_vars_project_id_idx ON project_env_vars(project_id);
    CREATE INDEX IF NOT EXISTS project_env_vars_user_id_idx ON project_env_vars(user_id);
  `)

  initialized = true
}

export interface EnvVarRecord {
  id: string
  project_id: string
  user_id: string
  key: string
  encrypted_value: string
  is_sensitive: boolean
  created_at: string
  updated_at: string
}

export interface EnvVar {
  id: string
  key: string
  value: string
  is_sensitive: boolean
}

export async function createOrUpdateEnvVar(
  projectId: string,
  userId: string,
  key: string,
  value: string,
  isSensitive: boolean = true
): Promise<EnvVar> {
  await ensureEnvVarsTable()

  const encryptedValue = encryptEnvVar(value)

  const result = await pool.query<EnvVarRecord>(
    `INSERT INTO project_env_vars (project_id, user_id, key, encrypted_value, is_sensitive)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id, key)
     DO UPDATE SET
       encrypted_value = EXCLUDED.encrypted_value,
       is_sensitive = EXCLUDED.is_sensitive,
       updated_at = NOW()
     RETURNING *`,
    [projectId, userId, key, encryptedValue, isSensitive]
  )

  const record = result.rows[0]
  return {
    id: record.id,
    key: record.key,
    value: decryptEnvVar(record.encrypted_value),
    is_sensitive: record.is_sensitive,
  }
}

export async function getEnvVar(
  projectId: string,
  key: string
): Promise<EnvVar | null> {
  await ensureEnvVarsTable()

  const result = await pool.query<EnvVarRecord>(
    `SELECT * FROM project_env_vars WHERE project_id = $1 AND key = $2`,
    [projectId, key]
  )

  if (!result.rows[0]) return null

  const record = result.rows[0]
  return {
    id: record.id,
    key: record.key,
    value: decryptEnvVar(record.encrypted_value),
    is_sensitive: record.is_sensitive,
  }
}

export async function listEnvVars(projectId: string): Promise<EnvVar[]> {
  await ensureEnvVarsTable()

  const result = await pool.query<EnvVarRecord>(
    `SELECT * FROM project_env_vars WHERE project_id = $1 ORDER BY key ASC`,
    [projectId]
  )

  return result.rows.map((record) => ({
    id: record.id,
    key: record.key,
    value: decryptEnvVar(record.encrypted_value),
    is_sensitive: record.is_sensitive,
  }))
}

export async function deleteEnvVar(projectId: string, key: string): Promise<void> {
  await ensureEnvVarsTable()

  await pool.query(
    `DELETE FROM project_env_vars WHERE project_id = $1 AND key = $2`,
    [projectId, key]
  )
}

export async function getEnvVarsForChat(projectId: string): Promise<Record<string, string>> {
  await ensureEnvVarsTable()

  const result = await pool.query<EnvVarRecord>(
    `SELECT * FROM project_env_vars WHERE project_id = $1`,
    [projectId]
  )

  const envVars: Record<string, string> = {}
  for (const record of result.rows) {
    envVars[record.key] = decryptEnvVar(record.encrypted_value)
  }

  return envVars
}
