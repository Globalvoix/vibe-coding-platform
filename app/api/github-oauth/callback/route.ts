import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { getInstallation, createInstallationToken, githubInstallationRequest } from '@/lib/github-app'
import { upsertGithubInstallation, upsertGithubProject } from '@/lib/github-projects-db'

function sanitizeRepoName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

async function createRepoForInstallation(params: {
  installationId: number
  projectId: string
  defaultRepoName: string
}) {
  const installation = await getInstallation(params.installationId)
  const account = installation.account

  const installationToken = await createInstallationToken(params.installationId)

  const repoName = sanitizeRepoName(params.defaultRepoName)

  const createBody = {
    name: repoName,
    private: true,
    auto_init: true,
    description: `Thinksoft project ${params.projectId}`,
  }

  if (account.type === 'Organization') {
    return githubInstallationRequest<{
      id: number
      name: string
      owner: { login: string }
      default_branch: string
      html_url: string
    }>({
      method: 'POST',
      path: `/orgs/${encodeURIComponent(account.login)}/repos`,
      installationToken,
      body: createBody,
    })
  }

  return githubInstallationRequest<{
    id: number
    name: string
    owner: { login: string }
    default_branch: string
    html_url: string
  }>({
    method: 'POST',
    path: `/user/repos`,
    installationToken,
    body: createBody,
  })
}

export async function GET(req: NextRequest) {
  const installationIdRaw = req.nextUrl.searchParams.get('installation_id')
  const state = req.nextUrl.searchParams.get('state')

  if (!installationIdRaw || !state) {
    return NextResponse.json(
      { error: 'Missing installation_id or state' },
      { status: 400 }
    )
  }

  const installationId = Number(installationIdRaw)
  if (!Number.isFinite(installationId) || installationId <= 0) {
    return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 })
  }

  const verified = verifyGithubInstallState(state)
  if (!verified) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  try {
    const installation = await getInstallation(installationId)
    const account = installation.account

    await upsertGithubInstallation({
      userId: verified.userId,
      projectId: verified.projectId,
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      accountAvatarUrl: account.avatar_url ?? null,
    })

    const repo = await createRepoForInstallation({
      installationId,
      projectId: verified.projectId,
      defaultRepoName: `thinksoft-${verified.projectId}`,
    })

    await upsertGithubProject({
      userId: verified.userId,
      projectId: verified.projectId,
      activeInstallationId: installationId,
      repoOwner: repo.owner.login,
      repoName: repo.name,
      repoId: repo.id,
      defaultBranch: repo.default_branch,
    })

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', verified.projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Error in GitHub App callback', error)

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', verified.projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'error')

    return NextResponse.redirect(redirectUrl.toString())
  }
}
