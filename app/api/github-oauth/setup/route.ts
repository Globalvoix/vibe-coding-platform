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
  console.log('[GitHub Setup] Received callback:', {
    searchParams: Object.fromEntries(req.nextUrl.searchParams),
  })

  const installationIdRaw = req.nextUrl.searchParams.get('installation_id')
  const setupAction = req.nextUrl.searchParams.get('setup_action')
  const state = req.nextUrl.searchParams.get('state')

  if (!installationIdRaw || !state) {
    console.error('[GitHub Setup] Missing params:', { installationIdRaw, state: state ? 'present' : 'missing' })
    return NextResponse.json(
      { error: 'Missing installation_id or state' },
      { status: 400 }
    )
  }

  const installationId = Number(installationIdRaw)
  if (!Number.isFinite(installationId) || installationId <= 0) {
    console.error('[GitHub Setup] Invalid installation_id:', installationIdRaw)
    return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 })
  }

  const verified = verifyGithubInstallState(state)
  if (!verified) {
    console.error('[GitHub Setup] Failed to verify state')
    return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 })
  }

  console.log('[GitHub Setup] State verified:', { userId: verified.userId, projectId: verified.projectId })

  try {
    console.log('[GitHub Setup] Starting installation flow', {
      installationId,
      userId: verified.userId,
      projectId: verified.projectId,
    })

    console.log('[GitHub Setup] Fetching installation details...')
    const installation = await getInstallation(installationId)
    console.log('[GitHub Setup] Got installation:', {
      id: installation.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
    })

    const account = installation.account

    try {
      await upsertGithubInstallation({
        userId: verified.userId,
        projectId: verified.projectId,
        installationId,
        accountLogin: account.login,
        accountType: account.type,
        accountAvatarUrl: account.avatar_url ?? null,
      })
      console.log('[GitHub Setup] Saved installation to DB')
    } catch (dbError) {
      console.error('[GitHub Setup] Failed to save installation to DB:', dbError)
      throw dbError
    }

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

      try {
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
      } catch (repoError) {
        console.error('[GitHub Setup] Failed to create repository:', repoError)
        throw repoError
      }
    }

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', verified.projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')

    console.log('[GitHub Setup] Setup successful, redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    const errorCode =
      error instanceof Error && 'code' in error ? (error.code as string) : 'UNKNOWN'
    const errorDetails =
      error instanceof Error && 'detail' in error ? (error.detail as string) : ''
    console.error('[GitHub Setup] EXCEPTION in GitHub App setup:', {
      message: errorMessage,
      code: errorCode,
      detail: errorDetails,
      stack: errorStack,
      installationId: installationIdRaw,
      verified: verified ? { userId: verified.userId, projectId: verified.projectId } : null,
    })

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    if (verified) {
      redirectUrl.searchParams.set('projectId', verified.projectId)
      redirectUrl.searchParams.set('openSettings', '1')
      redirectUrl.searchParams.set('settingsTab', 'github')
      redirectUrl.searchParams.set('githubInstall', 'error')
      console.log('[GitHub Setup] Redirecting with error to:', redirectUrl.toString())
      return NextResponse.redirect(redirectUrl.toString())
    }

    return NextResponse.json(
      { error: 'Failed to complete GitHub App installation', details: errorMessage },
      { status: 500 }
    )
  }
}
