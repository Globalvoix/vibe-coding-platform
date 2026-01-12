import { createInstallationToken, getInstallation, githubRequest } from '@/lib/github-app'
import {
  getGithubOAuthAccessToken,
  upsertGithubInstallation,
  upsertGithubProject,
} from '@/lib/github-projects-db'
import type { GithubRepository } from '@/lib/github-types'

function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function isGithubAlreadyExistsError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes('GitHub API error (422)')
}

export function getDefaultRepoNameForProject(projectId: string): string {
  return sanitizeRepoName(`thinksoft-${projectId}`)
}

export async function ensureGithubRepoForInstallation(params: {
  userId: string
  projectId: string
  installationId: number
}): Promise<GithubRepository> {
  const installation = await getInstallation(params.installationId)
  const account = installation.account

  await upsertGithubInstallation({
    userId: params.userId,
    projectId: params.projectId,
    installationId: params.installationId,
    accountLogin: account.login,
    accountType: account.type,
    accountAvatarUrl: account.avatar_url || null,
  })

  const repoName = getDefaultRepoNameForProject(params.projectId)

  const { token, createPath } = await (async () => {
    if (account.type === 'Organization') {
      const installationToken = await createInstallationToken(params.installationId)
      return {
        token: installationToken,
        createPath: `/orgs/${encodeURIComponent(account.login)}/repos`,
      }
    }

    const oauthToken = await getGithubOAuthAccessToken({
      userId: params.userId,
      projectId: params.projectId,
    })

    if (!oauthToken) {
      throw new Error(
        'GitHub OAuth is required to create repositories in a personal account. Please reconnect GitHub.'
      )
    }

    return {
      token: oauthToken,
      createPath: '/user/repos',
    }
  })()

  const owner = account.login

  const repo = await (async () => {
    try {
      return await githubRequest<GithubRepository>('POST', createPath, token, {
        name: repoName,
        private: true,
        auto_init: true,
        description: `Thinksoft project ${params.projectId}`,
      })
    } catch (error) {
      if (!isGithubAlreadyExistsError(error)) throw error
      return await githubRequest<GithubRepository>(
        'GET',
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`,
        token
      )
    }
  })()

  await upsertGithubProject({
    userId: params.userId,
    projectId: params.projectId,
    activeInstallationId: params.installationId,
    repoOwner: repo.owner.login,
    repoName: repo.name,
    repoId: repo.id,
    defaultBranch: repo.default_branch,
  })

  return repo
}
