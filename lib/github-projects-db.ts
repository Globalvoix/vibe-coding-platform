import { Pool } from 'pg'
import crypto from 'node:crypto'
import { decryptEnvVar, encryptEnvVar } from '@/lib/env-encryption'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString })

let initialized = false

async function ensureGithubTables() {
  if (initialized) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS github_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      active_installation_id BIGINT,
      repo_owner TEXT,
      repo_name TEXT,
      repo_id BIGINT,
      default_branch TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS github_project_installations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      installation_id BIGINT NOT NULL,
      account_login TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, project_id, installation_id)
    );

    CREATE TABLE IF NOT EXISTS github_oauth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      token_type TEXT,
      scope TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, project_id)
    );

    ALTER TABLE github_projects ADD COLUMN IF NOT EXISTS active_installation_id BIGINT;
    ALTER TABLE github_projects ADD COLUMN IF NOT EXISTS repo_owner TEXT;
    ALTER TABLE github_projects ADD COLUMN IF NOT EXISTS repo_name TEXT;
    ALTER TABLE github_projects ADD COLUMN IF NOT EXISTS repo_id BIGINT;
    ALTER TABLE github_projects ADD COLUMN IF NOT EXISTS default_branch TEXT;

    CREATE INDEX IF NOT EXISTS github_projects_user_project_idx
      ON github_projects(user_id, project_id);

    CREATE INDEX IF NOT EXISTS github_project_installations_user_project_idx
      ON github_project_installations(user_id, project_id);

    CREATE INDEX IF NOT EXISTS github_oauth_tokens_user_project_idx
      ON github_oauth_tokens(user_id, project_id);
  `)

  initialized = true
}

export interface GithubProjectRecord {
  id: string
  user_id: string
  project_id: string
  active_installation_id: number | null
  repo_owner: string | null
  repo_name: string | null
  repo_id: number | null
  default_branch: string | null
  created_at: string
  updated_at: string
}

export interface GithubInstallationRecord {
  id: string
  user_id: string
  project_id: string
  installation_id: number
  account_login: string
  account_type: 'User' | 'Organization'
  account_avatar_url: string | null
  created_at: string
  updated_at: string
}

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

export async function upsertGithubInstallation(params: {
  userId: string
  projectId: string
  installationId: number
  accountLogin: string
  accountType: 'User' | 'Organization'
  accountAvatarUrl?: string | null
}): Promise<GithubInstallationRecord> {
  await ensureGithubTables()

  const id = crypto.randomUUID()

  const result = await pool.query<GithubInstallationRecord>(
    `INSERT INTO github_project_installations
      (id, user_id, project_id, installation_id, account_login, account_type, account_avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, project_id, installation_id)
     DO UPDATE SET
       account_login = EXCLUDED.account_login,
       account_type = EXCLUDED.account_type,
       account_avatar_url = EXCLUDED.account_avatar_url,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      params.userId,
      params.projectId,
      params.installationId,
      params.accountLogin,
      params.accountType,
      params.accountAvatarUrl ?? null,
    ]
  )

  return result.rows[0]
}

export async function listGithubInstallations(params: {
  userId: string
  projectId: string
}): Promise<GithubInstallationRecord[]> {
  await ensureGithubTables()

  const result = await pool.query<GithubInstallationRecord>(
    `SELECT *
     FROM github_project_installations
     WHERE user_id = $1 AND project_id = $2
     ORDER BY updated_at DESC`,
    [params.userId, params.projectId]
  )

  return result.rows
}

export async function upsertGithubProject(params: {
  userId: string
  projectId: string
  activeInstallationId?: number | null
  repoOwner?: string | null
  repoName?: string | null
  repoId?: number | null
  defaultBranch?: string | null
}): Promise<GithubProjectRecord> {
  await ensureGithubTables()

  const id = crypto.randomUUID()

  const result = await pool.query<GithubProjectRecord>(
    `INSERT INTO github_projects
      (id, user_id, project_id, active_installation_id, repo_owner, repo_name, repo_id, default_branch)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, project_id)
     DO UPDATE SET
       active_installation_id = COALESCE(EXCLUDED.active_installation_id, github_projects.active_installation_id),
       repo_owner = COALESCE(EXCLUDED.repo_owner, github_projects.repo_owner),
       repo_name = COALESCE(EXCLUDED.repo_name, github_projects.repo_name),
       repo_id = COALESCE(EXCLUDED.repo_id, github_projects.repo_id),
       default_branch = COALESCE(EXCLUDED.default_branch, github_projects.default_branch),
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      params.userId,
      params.projectId,
      params.activeInstallationId ?? null,
      params.repoOwner ?? null,
      params.repoName ?? null,
      params.repoId ?? null,
      params.defaultBranch ?? null,
    ]
  )

  return result.rows[0]
}

export async function getGithubProject(params: {
  userId: string
  projectId: string
}): Promise<GithubProjectRecord | null> {
  await ensureGithubTables()

  const result = await pool.query<GithubProjectRecord>(
    `SELECT *
     FROM github_projects
     WHERE user_id = $1 AND project_id = $2`,
    [params.userId, params.projectId]
  )

  return result.rows[0] ?? null
}

export async function deleteGithubProject(params: {
  userId: string
  projectId: string
}): Promise<void> {
  await ensureGithubTables()

  await pool.query(`DELETE FROM github_oauth_tokens WHERE user_id = $1 AND project_id = $2`, [
    params.userId,
    params.projectId,
  ])

  await pool.query(
    `DELETE FROM github_project_installations
     WHERE user_id = $1 AND project_id = $2`,
    [params.userId, params.projectId]
  )

  await pool.query(
    `DELETE FROM github_projects
     WHERE user_id = $1 AND project_id = $2`,
    [params.userId, params.projectId]
  )
}

/**
 * Find all project-user combinations linked to a specific GitHub installation
 * Used for webhook uninstall cleanup
 */
export async function findProjectsByInstallation(params: {
  installationId: number
}): Promise<Array<{ userId: string; projectId: string }>> {
  await ensureGithubTables()

  const result = await pool.query<{ user_id: string; project_id: string }>(
    `SELECT DISTINCT user_id, project_id
     FROM github_project_installations
     WHERE installation_id = $1`,
    [params.installationId]
  )

  return result.rows.map((row) => ({
    userId: row.user_id,
    projectId: row.project_id,
  }))
}

/**
 * Delete all GitHub connection records for a specific installation
 * Used for webhook uninstall cleanup
 */
export async function deleteGithubProjectsByInstallation(params: {
  installationId: number
}): Promise<number> {
  await ensureGithubTables()

  // First, find how many projects are affected
  const projectsResult = await pool.query<{ user_id: string; project_id: string }>(
    `SELECT DISTINCT user_id, project_id
     FROM github_project_installations
     WHERE installation_id = $1`,
    [params.installationId]
  )

  const affectedCount = projectsResult.rows.length

  // Delete from github_project_installations
  await pool.query(
    `DELETE FROM github_project_installations
     WHERE installation_id = $1`,
    [params.installationId]
  )

  // Clear active installation and repo details from github_projects
  await pool.query(
    `UPDATE github_projects
     SET active_installation_id = NULL,
         repo_owner = NULL,
         repo_name = NULL,
         repo_id = NULL,
         default_branch = NULL,
         updated_at = NOW()
     WHERE active_installation_id = $1`,
    [params.installationId]
  )

  return affectedCount
}
