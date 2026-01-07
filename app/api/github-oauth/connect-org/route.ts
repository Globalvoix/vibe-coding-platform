import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createInstallationToken, getInstallation, githubInstallationRequest } from '@/lib/github-app'
import { upsertGithubInstallation, upsertGithubProject } from '@/lib/github-projects-db'

function sanitizeRepoName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    projectId?: string
    installationId?: number
  }

  if (!body.projectId || !body.installationId) {
    return NextResponse.json(
      { error: 'Missing projectId or installationId' },
      { status: 400 }
    )
  }

  const installationId = Number(body.installationId)
  if (!Number.isFinite(installationId) || installationId <= 0) {
    return NextResponse.json({ error: 'Invalid installationId' }, { status: 400 })
  }

  try {
    const installation = await getInstallation(installationId)
    const account = installation.account

    await upsertGithubInstallation({
      userId,
      projectId: body.projectId,
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      accountAvatarUrl: account.avatar_url ?? null,
    })

    const installationToken = await createInstallationToken(installationId)

    const repoName = sanitizeRepoName(`thinksoft-${body.projectId}`)

    const createBody = {
      name: repoName,
      private: true,
      auto_init: true,
      description: `Thinksoft project ${body.projectId}`,
    }

    let repo
    try {
      repo =
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
    } catch (repoError) {
      console.log('[Connect Org] Repository creation failed, checking if it exists:', repoError)

      // Try to get the existing repository
      try {
        repo = await githubInstallationRequest<{
          id: number
          name: string
          owner: { login: string }
          default_branch: string
          html_url: string
        }>({
          method: 'GET',
          path: `/repos/${encodeURIComponent(account.login)}/${encodeURIComponent(repoName)}`,
          installationToken,
        })
        console.log('[Connect Org] Using existing repository')
      } catch (getError) {
        console.error('[Connect Org] Failed to create or get repository:', getError)
        throw repoError
      }
    }

    await upsertGithubProject({
      userId,
      projectId: body.projectId,
      activeInstallationId: installationId,
      repoOwner: repo.owner.login,
      repoName: repo.name,
      repoId: repo.id,
      defaultBranch: repo.default_branch,
    })

    return NextResponse.json({
      success: true,
      repository: {
        owner: repo.owner.login,
        name: repo.name,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
      },
    })
  } catch (error) {
    console.error('Error connecting org', error)
    return NextResponse.json(
      { error: 'Failed to connect organization' },
      { status: 500 }
    )
  }
}
