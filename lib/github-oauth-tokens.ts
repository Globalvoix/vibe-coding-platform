import crypto from 'node:crypto'
import { pool } from '@/lib/github-projects-db-internal'
import { decryptEnvVar, encryptEnvVar } from '@/lib/env-encryption'

export interface GithubOAuthTokenRecord {
  id: string
  user_id: string
  project_id: string
  access_token_encrypted: string
  token_type: string | null
  scope: string | null
  created_at: string
  updated_at: string
}

export async function upsertGithubOAuthToken(params: {
  userId: string
  projectId: string
  accessToken: string
  tokenType?: string | null
  scope?: string | null
}): Promise<GithubOAuthTokenRecord> {
  const id = crypto.randomUUID()

  const result = await pool.query<GithubOAuthTokenRecord>(
    `INSERT INTO github_oauth_tokens
      (id, user_id, project_id, access_token_encrypted, token_type, scope)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, project_id)
     DO UPDATE SET
       access_token_encrypted = EXCLUDED.access_token_encrypted,
       token_type = EXCLUDED.token_type,
       scope = EXCLUDED.scope,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      params.userId,
      params.projectId,
      encryptEnvVar(params.accessToken),
      params.tokenType ?? null,
      params.scope ?? null,
    ]
  )

  return result.rows[0]
}

export async function getGithubOAuthAccessToken(params: {
  userId: string
  projectId: string
}): Promise<string | null> {
  const result = await pool.query<GithubOAuthTokenRecord>(
    `SELECT *
     FROM github_oauth_tokens
     WHERE user_id = $1 AND project_id = $2
     ORDER BY updated_at DESC
     LIMIT 1`,
    [params.userId, params.projectId]
  )

  const row = result.rows[0]
  if (!row) return null

  try {
    return decryptEnvVar(row.access_token_encrypted)
  } catch {
    return null
  }
}

export async function deleteGithubOAuthToken(params: {
  userId: string
  projectId: string
}): Promise<void> {
  await pool.query(`DELETE FROM github_oauth_tokens WHERE user_id = $1 AND project_id = $2`, [
    params.userId,
    params.projectId,
  ])
}
