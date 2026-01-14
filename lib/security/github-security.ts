import { createInstallationToken } from '@/lib/github-app'
import { getGithubOAuthAccessToken, getGithubProject } from '@/lib/github-projects-db'
import type { SecurityIssue } from '@/lib/security/security-utils'

type GitHubDependabotAlert = {
  number: number
  security_advisory?: {
    summary?: string
    severity?: string
  }
  dependency?: {
    package?: {
      name?: string
    }
  }
}

type GitHubCodeScanningAlert = {
  number: number
  rule?: {
    description?: string
  }
  most_recent_instance?: {
    location?: {
      path?: string
      start_line?: number
    }
  }
}

type GitHubSecretScanningAlert = {
  number: number
  secret_type_display_name?: string
  secret_type?: string
}

type GitHubApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string }

const GITHUB_API_BASE = 'https://api.github.com'

function normalizeRepoRef(owner: string, repo: string) {
  return `${owner}/${repo}`
}

async function githubFetchJson<T>(params: {
  path: string
  token: string
  timeoutMs?: number
}): Promise<GitHubApiResult<T>> {
  const token = params.token.trim()
  if (!token) {
    return { ok: false, status: 0, error: 'Missing GitHub token' }
  }

  const controller = new AbortController()
  const timeoutMs =
    typeof params.timeoutMs === 'number' && params.timeoutMs > 0 ? Math.min(20_000, params.timeoutMs) : 12_000

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  async function fetchOnce(authHeader: string): Promise<GitHubApiResult<T>> {
    const res = await fetch(`${GITHUB_API_BASE}${params.path}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'thinksoft-security-scan',
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        status: res.status,
        error: text.trim() ? text.trim().slice(0, 600) : `GitHub API error (${res.status})`,
      }
    }

    if (res.status === 204) {
      return { ok: true, status: res.status, data: undefined as T }
    }

    return { ok: true, status: res.status, data: (await res.json()) as T }
  }

  try {
    // Some GitHub APIs behave differently depending on the auth scheme.
    // Try the canonical OAuth/PAT scheme first, then fallback.
    const tokenResult = await fetchOnce(`token ${token}`)
    if (tokenResult.ok || tokenResult.status !== 401) return tokenResult

    return await fetchOnce(`Bearer ${token}`)
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `Request timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error)

    return { ok: false, status: 0, error: message.slice(0, 600) }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchGithubSecurityAlertsWithToken(params: {
  token: string
  owner: string
  repo: string
}): Promise<{ issues: SecurityIssue[]; successAny: boolean; errors: string[] }> {
  const repoRef = normalizeRepoRef(params.owner, params.repo)
  const issues: SecurityIssue[] = []
  const errors: string[] = []

  const dependabot = await githubFetchJson<GitHubDependabotAlert[]>({
    token: params.token,
    path: `/repos/${params.owner}/${params.repo}/dependabot/alerts?state=open&per_page=100`,
  })

  const codeScanning = await githubFetchJson<GitHubCodeScanningAlert[]>({
    token: params.token,
    path: `/repos/${params.owner}/${params.repo}/code-scanning/alerts?state=open&per_page=100`,
  })

  const secretScanning = await githubFetchJson<GitHubSecretScanningAlert[]>({
    token: params.token,
    path: `/repos/${params.owner}/${params.repo}/secret-scanning/alerts?state=open&per_page=100`,
  })

  const successAny = dependabot.ok || codeScanning.ok || secretScanning.ok

  if (!dependabot.ok) errors.push(`dependabot:${dependabot.status || 'ERR'}${dependabot.error ? `:${dependabot.error}` : ''}`)
  if (!codeScanning.ok) errors.push(`code-scanning:${codeScanning.status || 'ERR'}${codeScanning.error ? `:${codeScanning.error}` : ''}`)
  if (!secretScanning.ok) errors.push(`secret-scanning:${secretScanning.status || 'ERR'}${secretScanning.error ? `:${secretScanning.error}` : ''}`)

  if (dependabot.ok) {
    for (const alert of Array.isArray(dependabot.data) ? dependabot.data : []) {
      const pkg = alert.dependency?.package?.name
      const summary = alert.security_advisory?.summary
      const severity = alert.security_advisory?.severity

      const titleParts = [
        'Dependabot alert',
        typeof pkg === 'string' && pkg.trim() ? `(${pkg.trim()})` : null,
        typeof severity === 'string' && severity.trim() ? severity.trim().toLowerCase() : null,
        typeof summary === 'string' && summary.trim() ? `— ${summary.trim()}` : null,
      ].filter(Boolean)

      issues.push({
        id: `github:dependabot:${repoRef}:${alert.number}`,
        level: 'Error',
        title: titleParts.join(' '),
        filePath: `github:${repoRef}`,
      })
    }
  }

  if (codeScanning.ok) {
    for (const alert of Array.isArray(codeScanning.data) ? codeScanning.data : []) {
      const description = alert.rule?.description
      const path = alert.most_recent_instance?.location?.path
      const line = alert.most_recent_instance?.location?.start_line

      issues.push({
        id: `github:code-scanning:${repoRef}:${alert.number}`,
        level: 'Error',
        title:
          typeof description === 'string' && description.trim()
            ? `Code scanning alert — ${description.trim()}`
            : 'Code scanning alert',
        filePath: typeof path === 'string' && path.trim() ? path.trim() : `github:${repoRef}`,
        lineNumber: typeof line === 'number' && Number.isFinite(line) && line > 0 ? Math.trunc(line) : undefined,
      })
    }
  }

  if (secretScanning.ok) {
    for (const alert of Array.isArray(secretScanning.data) ? secretScanning.data : []) {
      const kind =
        (typeof alert.secret_type_display_name === 'string' && alert.secret_type_display_name.trim()
          ? alert.secret_type_display_name.trim()
          : null) ??
        (typeof alert.secret_type === 'string' && alert.secret_type.trim() ? alert.secret_type.trim() : null)

      issues.push({
        id: `github:secret-scanning:${repoRef}:${alert.number}`,
        level: 'Error',
        title: kind ? `Secret scanning alert — ${kind}` : 'Secret scanning alert',
        filePath: `github:${repoRef}`,
      })
    }
  }

  return { issues, successAny, errors }
}

export async function getGithubSecurityIssuesForProject(params: {
  userId: string
  projectId: string
}): Promise<SecurityIssue[]> {
  const githubProject = await getGithubProject({ userId: params.userId, projectId: params.projectId })

  const owner = githubProject?.repo_owner
  const repo = githubProject?.repo_name
  const installationId = githubProject?.active_installation_id

  if (!owner || !repo) return []

  const repoRef = normalizeRepoRef(owner, repo)

  if (typeof installationId === 'number' && Number.isFinite(installationId) && installationId > 0) {
    try {
      const token = await createInstallationToken(installationId)
      const result = await fetchGithubSecurityAlertsWithToken({ token, owner, repo })
      if (result.issues.length > 0) return result.issues
      if (result.successAny) return []
    } catch {
      // ignore and fallback to oauth token
    }
  }

  const oauthToken = await getGithubOAuthAccessToken({ userId: params.userId, projectId: params.projectId })
  if (oauthToken) {
    try {
      const result = await fetchGithubSecurityAlertsWithToken({ token: oauthToken, owner, repo })
      if (result.issues.length > 0) return result.issues
      if (result.successAny) return []
      return [
        {
          id: `github:security-api-unavailable:${repoRef}`,
          level: 'Warning',
          title: `GitHub security alert APIs unavailable (${result.errors.join(', ')})`,
          filePath: `github:${repoRef}`,
        },
      ]
    } catch {
      // ignore
    }
  }

  return [
    {
      id: `github:security-api-unavailable:${repoRef}`,
      level: 'Warning',
      title: 'GitHub security alert APIs unavailable (not connected or missing permissions)',
      filePath: `github:${repoRef}`,
    },
  ]
}
