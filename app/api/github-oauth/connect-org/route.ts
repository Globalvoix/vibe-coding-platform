import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getInstallation, createInstallationToken, githubRequest } from '@/lib/github-app'
import { upsertGithubInstallation, upsertGithubProject } from '@/lib/github-projects-db'

function sanitizeRepoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { projectId?: string; installationId?: number }

  if (!body.projectId || !body.installationId) {
    return NextResponse.json({ error: 'Missing projectId or installationId' }, { status: 400 })
  }

  try {
    const installationId = Number(body.installationId)
    if (!Number.isFinite(installationId)) {
      return NextResponse.json({ error: 'Invalid installationId' }, { status: 400 })
    }

    // Get installation details
    const installation = await getInstallation(installationId)
    const account = installation.account

    // Update installation in DB
    await upsertGithubInstallation({
      userId,
      projectId: body.projectId,
      installationId,
      accountLogin: account.login,
      accountType: account.type,
      accountAvatarUrl: account.avatar_url || null,
    })

    // Create installation token
    const token = await createInstallationToken(installationId)

    // Create repository
    const repoName = sanitizeRepoName(`thinksoft-${body.projectId}`)
    const repoPath =
      account.type === 'Organization'
        ? `/orgs/${encodeURIComponent(account.login)}/repos`
        : '/user/repos'

    const repo = await githubRequest<any>('POST', repoPath, token, {
      name: repoName,
      private: true,
      auto_init: true,
      description: `Thinksoft project ${body.projectId}`,
    })

    // Update project in DB
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
        url: `https://github.com/${repo.owner.login}/${repo.name}`,
        defaultBranch: repo.default_branch,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GitHub Connect Org] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
