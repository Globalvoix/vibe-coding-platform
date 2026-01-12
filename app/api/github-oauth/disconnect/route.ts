import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { deleteGithubProject } from '@/lib/github-projects-db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { projectId?: string }
    if (!body.projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    await deleteGithubProject({ userId, projectId: body.projectId })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[GitHub Disconnect] Error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
