import { NextRequest, NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { getInstallation, createInstallationToken, githubInstallationRequest } from '@/lib/github-app'
import { upsertGithubInstallation, upsertGithubProject } from '@/lib/github-projects-db'

interface GithubInstallationFull {
  id: number
  account: {
    login: string
    type: 'User' | 'Organization'
    avatar_url?: string
  }
  repository_selection?: 'all' | 'selected'
  permissions?: Record<string, string>
}

/**
 * GitHub OAuth callback
 * Called after user completes installation on GitHub
 * Creates repository and stores connection in DB
 */
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
    return NextResponse.json(
      { error: 'Invalid installation_id' },
      { status: 400 }
    )
  }

  // Verify state to get userId and projectId
  const verified = verifyGithubInstallState(state)
  if (!verified) {
    return NextResponse.json(
      { error: 'Invalid or expired state' },
      { status: 400 }
    )
  }

  const { userId, projectId } = verified

  try {
    // Step 1: Get installation details from GitHub
    const installation = (await getInstallation(installationId)) as GithubInstallationFull
    const account = installation.account

    console.log('[GitHub Callback] Installation details:', {
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      repositorySelection: installation.repository_selection,
    })

    // Check if installation is restricted to specific repositories
    if (installation.repository_selection === 'selected') {
      throw new Error(
        `This GitHub App installation is restricted to specific repositories. To use this integration, reinstall the app and select "All repositories" instead of "Only select repositories" at ${account.type === 'Organization' ? 'https://github.com/settings/installations' : 'https://github.com/settings/apps/authorizations'}`
      )
    }

    // Step 2: Save installation to database
    await upsertGithubInstallation({
      userId,
      projectId,
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      accountAvatarUrl: account.avatar_url ?? null,
    })

    // Step 3: Create installation token
    const installationToken = await createInstallationToken(installationId)

    // Step 4: Create repository
    const repoName = sanitizeRepoName(`thinksoft-${projectId}`)
    const repo = await createRepository(
      installationToken,
      account.type,
      account.login,
      repoName,
      projectId
    )

    // Step 5: Save project connection to database
    await upsertGithubProject({
      userId,
      projectId,
      activeInstallationId: installationId,
      repoOwner: repo.owner.login,
      repoName: repo.name,
      repoId: repo.id,
      defaultBranch: repo.default_branch,
    })

    // Redirect back to workspace with success
    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'success')

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GitHub Callback] Error:', {
      installationId,
      projectId,
      error: errorMessage,
    })

    // Redirect back with error
    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'error')
    redirectUrl.searchParams.set('githubError', encodeURIComponent(errorMessage))

    return NextResponse.redirect(redirectUrl.toString())
  }
}

function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

async function createRepository(
  token: string,
  accountType: 'User' | 'Organization',
  accountLogin: string,
  repoName: string,
  projectId: string
) {
  const createBody = {
    name: repoName,
    private: true,
    auto_init: true,
    description: `Thinksoft project ${projectId}`,
  }

  try {
    // Different endpoints for user vs org
    const path =
      accountType === 'Organization'
        ? `/orgs/${encodeURIComponent(accountLogin)}/repos`
        : '/user/repos'

    const repo = await githubInstallationRequest<{
      id: number
      name: string
      owner: { login: string }
      default_branch: string
      html_url: string
    }>({
      method: 'POST',
      path,
      installationToken: token,
      body: createBody,
    })

    return repo
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create repository "${repoName}": ${errorMsg}`)
  }
}
