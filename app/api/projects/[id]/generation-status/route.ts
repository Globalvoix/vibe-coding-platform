import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProject } from '@/lib/projects-db'
import { getActiveGenerationSession } from '@/lib/generation-sessions-db'

export async function GET(
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
        isActive: false,
        session: null,
      })
    }

    return NextResponse.json({
      isActive: session.status === 'active',
      session: {
        id: session.id,
        status: session.status,
        progress: session.progress,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
    })
  } catch (error) {
    console.error('Generation status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
