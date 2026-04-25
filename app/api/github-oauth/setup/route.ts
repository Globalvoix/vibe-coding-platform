import { NextRequest, NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { getInstallation } from '@/lib/github-app'
import { ensureGithubRepoForInstallation } from '@/lib/github-installation-flow'
import { upsertGithubInstallation, upsertGithubProject } from '@/lib/github-projects-db'
import { pushPersistedProjectToGithubMain } from '@/lib/github-repo-sync'

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

  const { userId, projectId, mode } = verified

  try {
    if (mode === 'import') {
      const installation = await getInstallation(installationId)

      await upsertGithubInstallation({
        userId,
        projectId,
        installationId,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        accountAvatarUrl: installation.account.avatar_url || null,
      })

      await upsertGithubProject({
        userId,
        projectId,
        activeInstallationId: installationId,
      })

      const redirectUrl = new URL('/workspace', req.nextUrl.origin)
      redirectUrl.searchParams.set('projectId', projectId)
      redirectUrl.searchParams.set('openSettings', '1')
      redirectUrl.searchParams.set('settingsTab', 'github')
      redirectUrl.searchParams.set('githubInstall', 'success')
      redirectUrl.searchParams.set('githubImport', '1')

      return NextResponse.redirect(redirectUrl.toString())
    }

    const repo = await ensureGithubRepoForInstallation({ userId, projectId, installationId })

    const branch = repo.default_branch || 'main'

    await pushPersistedProjectToGithubMain({
      userId,
      projectId,
      installationId,
      owner: repo.owner.login,
      repo: repo.name,
      branch,
      commitMessage: `Initial sync from Thinksoft (${new Date().toISOString()})`,
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
    console.error('[GitHub Setup] Error:', msg)

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    if (mode === 'import') redirectUrl.searchParams.set('githubImport', '1')
    redirectUrl.searchParams.set('githubInstall', 'error')
    redirectUrl.searchParams.set('githubError', encodeURIComponent(msg))

    return NextResponse.redirect(redirectUrl.toString())
  }
}
