import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseProjectsListUrl } from '@/lib/supabase-platform'

interface SupabaseProjectItem {
  ref: string
  id: string
  name: string
  region: string
  organization_id: string
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = req.headers.get('x-supabase-access-token')
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing Supabase access token' },
      { status: 400 }
    )
  }


  try {
    const projectsResponse = await fetch(getSupabaseProjectsListUrl(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text()
      console.error('Failed to fetch Supabase projects', {
        status: projectsResponse.status,
        error: errorText,
        userId,
      })

      if (projectsResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired Supabase access token' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch Supabase projects' },
        { status: projectsResponse.status }
      )
    }

    const projects = (await projectsResponse.json()) as SupabaseProjectItem[]

    return NextResponse.json({
      projects: projects.map((p) => ({
        ref: p.ref,
        id: p.id,
        name: p.name,
        region: p.region,
        organizationId: p.organization_id,
      })),
    })
  } catch (error) {
    console.error('Error fetching Supabase projects', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    })
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
