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

export async function GET(req: NextRequest) {
  const installationIdRaw = req.nextUrl.searchParams.get('installation_id')
  const setupAction = req.nextUrl.searchParams.get('setup_action')
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
    return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 })
  }

  try {
    console.log('[GitHub Setup] Starting installation flow', {
      installationId,
      userId: verified.userId,
      projectId: verified.projectId,
    })

    const installation = await getInstallation(installationId)
    console.log('[GitHub Setup] Got installation:', {
      id: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
    })

    const account = installation.account

    await upsertGithubInstallation({
      userId: verified.userId,
      projectId: verified.projectId,
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      accountAvatarUrl: account.avatar_url ?? null,
    })

    console.log('[GitHub Setup] Saved installation to DB')

    if (setupAction === 'install') {
      console.log('[GitHub Setup] Creating installation token...')
      const installationToken = await createInstallationToken(installationId)
      console.log('[GitHub Setup] Installation token created')

      const repoName = sanitizeRepoName(`thinksoft-${verified.projectId}`)
      console.log('[GitHub Setup] Creating repository:', { repoName, owner: account.login, type: account.type })

      const createBody = {
        name: repoName,
        private: true,
        auto_init: true,
        description: `Thinksoft project ${verified.projectId}`,
      }

      const repo =
        account.type === 'Organization'
          ? await githubInstallationRequest<{
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
          : await githubInstallationRequest<{
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

      console.log('[GitHub Setup] Repository created:', {
        name: repo.name,
        owner: repo.owner.login,
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

      console.log('[GitHub Setup] Saved project to DB')
    }

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', verified.projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')

    console.log('[GitHub Setup] Redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GitHub Setup] Error in GitHub App setup callback:', errorMessage)
    if (error instanceof Error) {
      console.error('[GitHub Setup] Stack:', error.stack)
    }

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', verified.projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'error')

    return NextResponse.redirect(redirectUrl.toString())
  }
}
