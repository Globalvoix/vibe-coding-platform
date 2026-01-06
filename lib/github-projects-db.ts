import { Pool } from 'pg'
import crypto from 'node:crypto'
import { decryptEnvVar, encryptEnvVar } from '@/lib/env-encryption'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureGithubProjectsTable() {
  if (initialized) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS github_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      github_user_id TEXT,
      github_username TEXT,
      github_avatar_url TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, project_id)
    );
    CREATE INDEX IF NOT EXISTS github_projects_user_project_idx
      ON github_projects(user_id, project_id);
  `)

  initialized = true
}

export interface GithubProjectRecord {
  id: string
  user_id: string
  project_id: string
  github_user_id: string | null
  github_username: string | null
  github_avatar_url: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

function decryptIfNeeded(value: string) {
  try {
    return decryptEnvVar(value)
  } catch {
    return value
  }
}

function normalizeRecord(record: GithubProjectRecord): GithubProjectRecord {
  return {
    ...record,
    access_token: decryptIfNeeded(record.access_token),
    refresh_token: record.refresh_token ? decryptIfNeeded(record.refresh_token) : null,
  }
}

export async function saveGithubProject(params: {
  userId: string
  projectId: string
  githubUserId?: string | null
  githubUsername?: string | null
  githubAvatarUrl?: string | null
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
}): Promise<GithubProjectRecord> {
  await ensureGithubProjectsTable()

  const id = crypto.randomUUID()

  const encryptedAccessToken = encryptEnvVar(params.accessToken)
  const encryptedRefreshToken = params.refreshToken
    ? encryptEnvVar(params.refreshToken)
    : null

  const result = await pool.query<GithubProjectRecord>(
    `INSERT INTO github_projects
      (id, user_id, project_id, github_user_id, github_username,
       github_avatar_url, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, project_id)
     DO UPDATE SET
       github_user_id = COALESCE(EXCLUDED.github_user_id, github_projects.github_user_id),
       github_username = COALESCE(EXCLUDED.github_username, github_projects.github_username),
       github_avatar_url = COALESCE(EXCLUDED.github_avatar_url, github_projects.github_avatar_url),
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, github_projects.refresh_token),
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      params.userId,
      params.projectId,
      params.githubUserId ?? null,
      params.githubUsername ?? null,
      params.githubAvatarUrl ?? null,
      encryptedAccessToken,
      encryptedRefreshToken,
      params.expiresAt ? params.expiresAt.toISOString() : null,
    ]
  )

  return normalizeRecord(result.rows[0])
}

export async function getGithubProject(
  userId: string,
  projectId: string
): Promise<GithubProjectRecord | null> {
  await ensureGithubProjectsTable()

  const result = await pool.query<GithubProjectRecord>(
    `SELECT * FROM github_projects 
     WHERE user_id = $1 AND project_id = $2`,
    [userId, projectId]
  )

  const record = result.rows[0]
  return record ? normalizeRecord(record) : null
}

export async function deleteGithubProject(
  userId: string,
  projectId: string
): Promise<void> {
  await ensureGithubProjectsTable()

  await pool.query(
    `DELETE FROM github_projects
     WHERE user_id = $1 AND project_id = $2`,
    [userId, projectId]
  )
}
