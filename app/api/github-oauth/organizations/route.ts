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

  const [project, installations] = await Promise.all([
    getGithubProject({ userId, projectId }),
    listGithubInstallations({ userId, projectId }),
  ])

  const activeInstallationId = project?.active_installation_id ?? null

  return NextResponse.json({
    organizations: installations.map((i) => ({
      installationId: i.installation_id,
      login: i.account_login,
      type: i.account_type,
      avatarUrl: i.account_avatar_url,
      active: activeInstallationId === i.installation_id,
    })),
  })
}
