import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProject } from '@/lib/projects-db'
import { getActiveGenerationSession, cancelGenerationSession } from '@/lib/generation-sessions-db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify project ownership
    const project = await getProject(userId, projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get active generation session
    const session = await getActiveGenerationSession(projectId)

    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'No active generation session found',
      })
    }

    // Cancel the session
    await cancelGenerationSession(session.id)

    return NextResponse.json({
      success: true,
      message: 'Generation stopped',
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Generation stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
