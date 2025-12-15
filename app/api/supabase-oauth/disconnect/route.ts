import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { deleteSupabaseProject } from '@/lib/supabase-projects-db'
import { getProject } from '@/lib/projects-db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { projectId: string }

    if (!body.projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      )
    }

    // Verify the project belongs to the user
    const project = await getProject(userId, body.projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete the Supabase project connection
    await deleteSupabaseProject(userId, body.projectId)

    return NextResponse.json({
      success: true,
      message: 'Supabase project disconnected',
    })
  } catch (error) {
    console.error('Failed to disconnect Supabase project', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    })
    return NextResponse.json(
      { error: 'Failed to disconnect Supabase project' },
      { status: 500 }
    )
  }
}
