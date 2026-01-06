import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGithubProject } from '@/lib/github-projects-db'

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
    const connection = await getGithubProject(userId, projectId)

    if (!connection) {
      return NextResponse.json({
        connected: false,
        projectId,
      })
    }

    return NextResponse.json({
      connected: true,
      projectId,
      username: connection.github_username,
      avatarUrl: connection.github_avatar_url,
      connectedAt: connection.created_at,
    })
  } catch (error) {
    console.error('Error checking GitHub connection status', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
