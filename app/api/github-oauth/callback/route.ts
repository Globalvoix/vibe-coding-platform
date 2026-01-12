import { NextRequest, NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { exchangeGithubOAuthCode } from '@/lib/github-oauth'
import { upsertGithubOAuthToken } from '@/lib/github-projects-db'
import { ensureGithubRepoForInstallation } from '@/lib/github-installation-flow'
import { pushProjectToGithubMain } from '@/lib/github-repo-sync'

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state')
  if (!state) {
    return NextResponse.json({ error: 'Missing state' }, { status: 400 })
  }

  const verified = verifyGithubInstallState(state)
  if (!verified) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const { userId, projectId } = verified

  const code = req.nextUrl.searchParams.get('code')
  const installationIdStr = req.nextUrl.searchParams.get('installation_id')

  const redirectUri =
    process.env.GITHUB_OAUTH_REDIRECT_URL || `${req.nextUrl.origin}/api/github-oauth/callback`

  try {
    // OAuth callback: exchange code and store token, then proceed to App installation
    if (code) {
      const token = await exchangeGithubOAuthCode({ code, redirectUri })

      await upsertGithubOAuthToken({
        userId,
        projectId,
        accessToken: token.access_token,
        tokenType: token.token_type,
        scope: token.scope,
      })

      const appSlug = process.env.GITHUB_APP_SLUG
      if (!appSlug) {
        throw new Error('GITHUB_APP_SLUG is not configured')
      }

      const githubUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`)
      githubUrl.searchParams.set('state', state)
      return NextResponse.redirect(githubUrl.toString())
    }

    // Installation callback
    if (!installationIdStr) {
      return NextResponse.json({ error: 'Missing installation_id' }, { status: 400 })
    }

    const installationId = Number(installationIdStr)
    if (!Number.isFinite(installationId)) {
      return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 })
    }

    const repo = await ensureGithubRepoForInstallation({ userId, projectId, installationId })

    const branch = repo.default_branch || 'main'

    await pushProjectToGithubMain({
      installationId,
      owner: repo.owner.login,
      repo: repo.name,
      branch,
      commitMessage: `Initial sync from Thinksoft (${new Date().toISOString()})`,
    })

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
