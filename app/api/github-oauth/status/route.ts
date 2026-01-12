import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGithubProject, listGithubInstallations } from '@/lib/github-projects-db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  try {
    const [project, installations] = await Promise.all([
      getGithubProject({ userId, projectId }),
      listGithubInstallations({ userId, projectId }),
    ])

    const activeInstallationId = project?.active_installation_id || null

    const organizations = installations.map((inst) => ({
      installationId: inst.installation_id,
      login: inst.account_login,
      type: inst.account_type,
      avatarUrl: inst.account_avatar_url,
      active: inst.installation_id === activeInstallationId,
    }))

    const repository = project?.repo_owner && project?.repo_name
      ? {
          owner: project.repo_owner,
          name: project.repo_name,
          url: `https://github.com/${project.repo_owner}/${project.repo_name}`,
          defaultBranch: project.default_branch || 'main',
        }
      : null

    return NextResponse.json({
      connected: organizations.length > 0,
      projectId,
      username: organizations.find((o) => o.active)?.login || null,
      avatarUrl: organizations.find((o) => o.active)?.avatarUrl || null,
      installationId: activeInstallationId,
      organizations,
      repository,
      canUpdatePr: Boolean(repository && activeInstallationId),
    })
  } catch (error) {
    console.error('[GitHub Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
