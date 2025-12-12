import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseConnection } from '@/lib/supabase-connections-db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  try {
    const connection = await getSupabaseConnection(userId, projectId)

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      projectRef: connection.supabase_project_ref,
      projectName: connection.supabase_project_name,
      orgId: connection.supabase_org_id,
    })
  } catch (error) {
    console.error('Failed to fetch Supabase connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    )
  }
}
