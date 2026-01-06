import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGithubProject, listGithubInstallations } from '@/lib/github-projects-db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing projectId query parameter' },
      { status: 400 }
    )
  }

  try {
    const [project, installations] = await Promise.all([
      getGithubProject({ userId, projectId }),
      listGithubInstallations({ userId, projectId }),
    ])

    const activeInstallationId = project?.active_installation_id ?? null

    const orgs = installations.map((i) => ({
      installationId: i.installation_id,
      login: i.account_login,
      type: i.account_type,
      avatarUrl: i.account_avatar_url,
      active: activeInstallationId === i.installation_id,
    }))

    const activeOrg = orgs.find((o) => o.active) ?? null

    const repo =
      project?.repo_owner && project?.repo_name
        ? {
            owner: project.repo_owner,
            name: project.repo_name,
            url: `https://github.com/${project.repo_owner}/${project.repo_name}`,
            defaultBranch: project.default_branch ?? 'main',
          }
        : null

    return NextResponse.json({
      connected: orgs.length > 0,
      projectId,
      username: activeOrg?.login,
      avatarUrl: activeOrg?.avatarUrl,
      installationId: activeInstallationId ?? undefined,
      organizations: orgs,
      repository: repo,
      canUpdatePr: Boolean(repo && activeInstallationId),
    })
  } catch (error) {
    console.error('Error checking GitHub connection status', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
