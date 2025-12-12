import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseProject } from '@/lib/supabase-projects-db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing projectId' },
      { status: 400 }
    )
  }

  try {
    const connection = await getSupabaseProject(userId, projectId)

    if (!connection) {
      return NextResponse.json({
        connected: false,
      })
    }

    return NextResponse.json({
      connected: true,
      projectName: connection.supabase_project_name,
      projectRef: connection.supabase_project_ref,
    })
  } catch (error) {
    console.error('Failed to fetch Supabase status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
