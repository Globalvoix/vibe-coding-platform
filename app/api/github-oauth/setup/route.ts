import { NextRequest, NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { ensureGithubRepoForInstallation } from '@/lib/github-installation-flow'


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
    await ensureGithubRepoForInstallation({ userId, projectId, installationId })

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
    redirectUrl.searchParams.set('githubInstall', 'error')
    redirectUrl.searchParams.set('githubError', encodeURIComponent(msg))

    return NextResponse.redirect(redirectUrl.toString())
  }
}
