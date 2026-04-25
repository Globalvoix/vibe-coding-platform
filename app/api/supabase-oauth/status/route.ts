import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseProjectWithRefresh } from '@/lib/supabase-projects-db'

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
    const oauthClientId =
      process.env.SUPABASE_OAUTH_CLIENT_ID ||
      process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
    const oauthClientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET

    const connection = await getSupabaseProjectWithRefresh(
      userId,
      projectId,
      oauthClientId,
      oauthClientSecret
    )

    if (!connection) {
      return NextResponse.json({
        connected: false,
        projectId,
      })
    }

    return NextResponse.json({
      connected: true,
      projectId,
      projectRef: connection.supabase_project_ref,
      projectName: connection.supabase_project_name,
      organizationId: connection.supabase_org_id,
      accessToken: connection.access_token,
      expiresAt: connection.expires_at,
      connectedAt: connection.created_at,
      lastUpdated: connection.updated_at,
    })
  } catch (error) {
    console.error('Error checking Supabase connection status', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      projectId,
    })
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
