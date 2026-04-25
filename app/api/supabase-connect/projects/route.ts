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

  const token =
    req.headers.get('x-supabase-token') ||
    req.headers.get('x-supabase-access-token')

  if (!token) {
    return NextResponse.json(
      { error: 'Missing Supabase token' },
      { status: 400 }
    )
  }

  try {
    const projectsResponse = await fetch(getSupabaseProjectsListUrl(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!projectsResponse.ok) {
      console.error('Failed to fetch projects:', projectsResponse.status)
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
    console.error('Error fetching Supabase projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
