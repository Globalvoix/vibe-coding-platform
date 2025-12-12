import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { saveSupabaseProject } from '@/lib/supabase-projects-db'

interface SaveRequest {
  appProjectId: string
  supabaseProjectRef: string
  supabaseProjectName: string
  supabaseOrgId: string
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as SaveRequest

    if (!body.appProjectId || !body.supabaseProjectRef || !body.accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const expiresAt = body.expiresIn
      ? new Date(Date.now() + body.expiresIn * 1000)
      : null

    const saved = await saveSupabaseProject({
      userId,
      projectId: body.appProjectId,
      supabaseProjectRef: body.supabaseProjectRef,
      supabaseProjectName: body.supabaseProjectName,
      supabaseOrgId: body.supabaseOrgId,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken || null,
      expiresAt,
    })

    return NextResponse.json({
      success: true,
      connection: {
        projectRef: saved.supabase_project_ref,
        projectName: saved.supabase_project_name,
      },
    })
  } catch (error) {
    console.error('Failed to save Supabase project:', error)
    return NextResponse.json(
      { error: 'Failed to save project connection' },
      { status: 500 }
    )
  }
}
