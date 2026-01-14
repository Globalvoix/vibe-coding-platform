import { createInstallationToken, githubRequest } from '@/lib/github-app'
import { getGithubOAuthAccessToken, getGithubProject } from '@/lib/github-projects-db'
import type { SecurityIssue } from '@/lib/security/security-utils'

type GitHubDependabotAlert = {
  number: number
  html_url?: string
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
  html_url?: string
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
  html_url?: string
  secret_type_display_name?: string
  secret_type?: string
}

function normalizeRepoRef(owner: string, repo: string) {
  return `${owner}/${repo}`
}

async function tryFetchGithubIssuesWithToken(params: {
  token: string
  owner: string
  repo: string
}): Promise<SecurityIssue[]> {
  const repoRef = normalizeRepoRef(params.owner, params.repo)
  const issues: SecurityIssue[] = []

  try {
    const alerts = await githubRequest<GitHubDependabotAlert[]>(
      'GET',
      `/repos/${params.owner}/${params.repo}/dependabot/alerts?state=open&per_page=100`,
      params.token
    )

    for (const alert of Array.isArray(alerts) ? alerts : []) {
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
  } catch {
    // ignore if repo/app doesn't have permissions
  }

  try {
    const alerts = await githubRequest<GitHubCodeScanningAlert[]>(
      'GET',
      `/repos/${params.owner}/${params.repo}/code-scanning/alerts?state=open&per_page=100`,
      params.token
    )

    for (const alert of Array.isArray(alerts) ? alerts : []) {
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
  } catch {
    // ignore if repo/app doesn't have permissions
  }

  try {
    const alerts = await githubRequest<GitHubSecretScanningAlert[]>(
      'GET',
      `/repos/${params.owner}/${params.repo}/secret-scanning/alerts?state=open&per_page=100`,
      params.token
    )

    for (const alert of Array.isArray(alerts) ? alerts : []) {
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
  } catch {
    // ignore if repo/app doesn't have permissions
  }

  return issues
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
      const issues = await tryFetchGithubIssuesWithToken({ token, owner, repo })
      if (issues.length > 0) return issues
    } catch {
      // ignore and fallback to oauth token
    }
  }

  const oauthToken = await getGithubOAuthAccessToken({ userId: params.userId, projectId: params.projectId })
  if (oauthToken) {
    try {
      const issues = await tryFetchGithubIssuesWithToken({ token: oauthToken, owner, repo })
      if (issues.length > 0) return issues
    } catch {
      // ignore
    }
  }

  return [
    {
      id: `github:security-unavailable:${repoRef}`,
      level: 'Warning',
      title: 'GitHub security alerts are not available (missing permissions or alerts not enabled)',
      filePath: `github:${repoRef}`,
    },
  ]
}
