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
    console.log('[GitHub Status] Querying for userId:', userId, 'projectId:', projectId)

    const [project, installations] = await Promise.all([
      getGithubProject({ userId, projectId }),
      listGithubInstallations({ userId, projectId }),
    ])

    console.log('[GitHub Status] Query results:', {
      projectFound: !!project,
      installationsCount: installations.length,
      activeInstallationId: project?.active_installation_id,
    })

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

    console.log('[GitHub Status] Response:', {
      connected: orgs.length > 0,
      repoCreated: !!repo,
      orgsCount: orgs.length,
    })

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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('[GitHub Status] Error checking GitHub connection status:', {
      message: errorMessage,
      stack: errorStack,
      userId,
      projectId,
    })
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
