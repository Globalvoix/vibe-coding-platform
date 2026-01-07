import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifyGithubInstallState } from '@/lib/github-install-state'
import { githubAppClient } from '@/lib/github-api-client'
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
  const requestId = Math.random().toString(36).substring(7)
  
  console.log(`[GitHub Setup:${requestId}] Received installation callback`, {
    searchParams: Object.fromEntries(req.nextUrl.searchParams),
  })

  const installationIdRaw = req.nextUrl.searchParams.get('installation_id')
  const setupAction = req.nextUrl.searchParams.get('setup_action')
  const state = req.nextUrl.searchParams.get('state')

  // Validate required parameters
  if (!installationIdRaw || !state) {
    console.error(`[GitHub Setup:${requestId}] Missing required parameters`, {
      hasInstallationId: !!installationIdRaw,
      hasState: !!state,
    })
    return NextResponse.json(
      {
        error: 'Missing installation_id or state parameter',
        requestId,
      },
      { status: 400 }
    )
  }

  const installationId = Number(installationIdRaw)
  if (!Number.isFinite(installationId) || installationId <= 0) {
    console.error(`[GitHub Setup:${requestId}] Invalid installation ID format`, {
      provided: installationIdRaw,
    })
    return NextResponse.json(
      {
        error: 'Invalid installation_id format',
        requestId,
      },
      { status: 400 }
    )
  }

  // Verify and decode state
  const verified = verifyGithubInstallState(state)
  if (!verified) {
    console.error(`[GitHub Setup:${requestId}] State verification failed`)
    return NextResponse.json(
      {
        error: 'Invalid or expired state token',
        requestId,
      },
      { status: 400 }
    )
  }

  const { userId, projectId } = verified

  console.log(`[GitHub Setup:${requestId}] State verified successfully`, {
    userId,
    projectId,
    installationId,
    setupAction,
  })

  // ====================================================================
  // MAIN INSTALLATION FLOW
  // ====================================================================

  try {
    // STEP 1: Fetch installation details from GitHub
    // ================================================
    console.log(`[GitHub Setup:${requestId}] STEP 1: Fetching installation details`)

    let installation
    try {
      installation = await githubAppClient.getInstallation(installationId)
      console.log(`[GitHub Setup:${requestId}] STEP 1 SUCCESS: Installation fetched`, {
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        accountAvatar: installation.account.avatar_url?.substring(0, 50),
      })
    } catch (stepError) {
      console.error(`[GitHub Setup:${requestId}] STEP 1 FAILED: Could not fetch installation`, {
        error: stepError instanceof Error ? stepError.message : String(stepError),
        installationId,
      })
      throw new Error(
        `Failed to fetch installation details: ${stepError instanceof Error ? stepError.message : String(stepError)}`
      )
    }

    const account = installation.account

    // STEP 2: Save installation to database
    // =====================================
    console.log(`[GitHub Setup:${requestId}] STEP 2: Saving installation to database`)

    try {
      await upsertGithubInstallation({
        userId,
        projectId,
        installationId,
        accountLogin: account.login,
        accountType: account.type,
        accountAvatarUrl: account.avatar_url ?? null,
      })
      console.log(`[GitHub Setup:${requestId}] STEP 2 SUCCESS: Installation saved to database`)
    } catch (stepError) {
      console.error(`[GitHub Setup:${requestId}] STEP 2 FAILED: Could not save installation to database`, {
        error: stepError instanceof Error ? stepError.message : String(stepError),
      })
      throw new Error(
        `Failed to save installation to database: ${stepError instanceof Error ? stepError.message : String(stepError)}`
      )
    }

    // STEP 3: Create repository
    // ==========================
    console.log(`[GitHub Setup:${requestId}] STEP 3: Creating repository`)

    const repoName = sanitizeRepoName(`thinksoft-${projectId}`)

    console.log(`[GitHub Setup:${requestId}] STEP 3: Repository details`, {
      repoName,
      owner: account.login,
      ownerType: account.type,
    })

    let repo
    try {
      repo = await githubAppClient.createOrGetRepository({
        installationId,
        owner: account.login,
        ownerType: account.type,
        repoName,
        isPrivate: true,
        autoInit: true,
        description: `Thinksoft project ${projectId}`,
      })

      console.log(`[GitHub Setup:${requestId}] STEP 3 SUCCESS: Repository created or fetched`, {
        repoId: repo.id,
        repoName: repo.name,
        repoOwner: repo.owner.login,
        defaultBranch: repo.default_branch,
        htmlUrl: repo.html_url,
      })
    } catch (stepError) {
      console.error(`[GitHub Setup:${requestId}] STEP 3 FAILED: Could not create or fetch repository`, {
        error: stepError instanceof Error ? stepError.message : String(stepError),
        repoName,
        owner: account.login,
      })
      throw new Error(
        `Failed to create repository: ${stepError instanceof Error ? stepError.message : String(stepError)}`
      )
    }

    // STEP 4: Save project to database
    // =================================
    console.log(`[GitHub Setup:${requestId}] STEP 4: Saving project to database`)

    try {
      await upsertGithubProject({
        userId,
        projectId,
        activeInstallationId: installationId,
        repoOwner: repo.owner.login,
        repoName: repo.name,
        repoId: repo.id,
        defaultBranch: repo.default_branch,
      })

      console.log(`[GitHub Setup:${requestId}] STEP 4 SUCCESS: Project saved to database`, {
        projectId,
        repoName: repo.name,
        activeInstallationId: installationId,
      })
    } catch (stepError) {
      console.error(`[GitHub Setup:${requestId}] STEP 4 FAILED: Could not save project to database`, {
        error: stepError instanceof Error ? stepError.message : String(stepError),
      })
      throw new Error(
        `Failed to save project to database: ${stepError instanceof Error ? stepError.message : String(stepError)}`
      )
    }

    // STEP 5: Redirect to workspace with success
    // ============================================
    console.log(`[GitHub Setup:${requestId}] STEP 5: All steps completed successfully, redirecting to workspace`)

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'success')

    console.log(`[GitHub Setup:${requestId}] SUCCESS: Redirecting to`, {
      redirectPath: redirectUrl.pathname + redirectUrl.search,
    })

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    // Error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''

    console.error(`[GitHub Setup:${requestId}] INSTALLATION FAILED: Exception caught`, {
      message: errorMessage,
      stack: errorStack,
      userId,
      projectId,
      installationId,
    })

    const redirectUrl = new URL('/workspace', req.nextUrl.origin)
    redirectUrl.searchParams.set('projectId', projectId)
    redirectUrl.searchParams.set('openSettings', '1')
    redirectUrl.searchParams.set('settingsTab', 'github')
    redirectUrl.searchParams.set('githubInstall', 'error')
    redirectUrl.searchParams.set('githubError', encodeURIComponent(errorMessage))
    redirectUrl.searchParams.set('requestId', requestId)

    console.log(`[GitHub Setup:${requestId}] Redirecting with error`, {
      redirectPath: redirectUrl.pathname + redirectUrl.search,
    })

    return NextResponse.redirect(redirectUrl.toString())
  }
}
