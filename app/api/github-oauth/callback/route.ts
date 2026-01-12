import { NextRequest, NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { getInstallation, createInstallationToken, githubRequest } from '@/lib/github-app'
import { upsertGithubInstallation, upsertGithubProject } from '@/lib/github-projects-db'
import type { GithubRepository } from '@/lib/github-types'

function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export async function GET(req: NextRequest) {
  const installationIdStr = req.nextUrl.searchParams.get('installation_id')
  const state = req.nextUrl.searchParams.get('state')

  if (!installationIdStr || !state) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const installationId = Number(installationIdStr)
  if (!Number.isFinite(installationId)) {
    return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 })
  }

  const verified = verifyGithubInstallState(state)
  if (!verified) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const { userId, projectId } = verified

  try {
    // Fetch installation from GitHub
    const installation = await getInstallation(installationId)
    const account = installation.account

    // Save installation to DB
    await upsertGithubInstallation({
      userId,
      projectId,
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      accountAvatarUrl: account.avatar_url || null,
    })

    // Create installation token
    const token = await createInstallationToken(installationId)

    // Create repository
    const repoName = sanitizeRepoName(`thinksoft-${projectId}`)

    const repoPath =
      account.type === 'Organization'
        ? `/orgs/${encodeURIComponent(account.login)}/repos`
        : '/user/repos'

    const repo = await githubRequest<GithubRepository>('POST', repoPath, token, {
      name: repoName,
      private: true,
      auto_init: true,
      description: `Thinksoft project ${projectId}`,
    })

    // Save project to DB
    await upsertGithubProject({
      userId,
      projectId,
      activeInstallationId: installationId,
      repoOwner: repo.owner.login,
      repoName: repo.name,
      repoId: repo.id,
      defaultBranch: repo.default_branch,
    })

    // Redirect to workspace
    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'success')

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[GitHub Callback] Error:', msg)

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'error')
    redirectUrl.searchParams.set('githubError', encodeURIComponent(msg))

    return NextResponse.redirect(redirectUrl.toString())
  }
}
