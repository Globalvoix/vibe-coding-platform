import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { saveSupabaseProject } from '@/lib/supabase-projects-db'
import { getProject } from '@/lib/projects-db'
import { createOrUpdateEnvVar } from '@/lib/env-vars-db'
import { getSupabasePlatformBaseUrl } from '@/lib/supabase-platform'

interface SelectRequest {
  appProjectId: string
  supabaseProjectRef: string
  supabaseProjectName: string
  supabaseOrgId: string
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

async function fetchProjectAnonKey(projectRef: string, accessToken: string): Promise<string | null> {
  try {
    const platformUrl = getSupabasePlatformBaseUrl()
    const response = await fetch(
      `${platformUrl}/v1/projects/${encodeURIComponent(projectRef)}/api-keys`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`Failed to fetch API keys for project ${projectRef}:`, {
        status: response.status,
        error: errorText,
      })
      return null
    }

    const data = (await response.json()) as Array<{ name: string; api_key: string }> | { api_keys?: Array<{ name: string; api_key: string }> }

    // Handle both response formats
    let apiKeys: Array<{ name: string; api_key: string }> = []
    if (Array.isArray(data)) {
      apiKeys = data
    } else if ('api_keys' in data && Array.isArray(data.api_keys)) {
      apiKeys = data.api_keys
    }

    // Find the anon key
    const anonKeyObj = apiKeys.find((key) => key.name === 'anon')
    if (anonKeyObj?.api_key) {
      return anonKeyObj.api_key
    }

    console.warn(`Anon key not found in API keys for project ${projectRef}`)
    return null
  } catch (error) {
    console.error(`Error fetching anon key for project ${projectRef}:`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as SelectRequest

    // Validate required fields
    if (
      !body.appProjectId ||
      !body.supabaseProjectRef ||
      !body.accessToken
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields: appProjectId, supabaseProjectRef, accessToken',
        },
        { status: 400 }
      )
    }

    // Verify the app project belongs to the user
    const appProject = await getProject(userId, body.appProjectId)
    if (!appProject) {
      return NextResponse.json(
        { error: 'App project not found or unauthorized' },
        { status: 404 }
      )
    }

    // Calculate token expiration
    const expiresAt = body.expiresIn
      ? new Date(Date.now() + body.expiresIn * 1000)
      : null

    // Fetch the anon key for the project
    const anonKey = await fetchProjectAnonKey(
      body.supabaseProjectRef,
      body.accessToken
    )

    // Save the Supabase project connection
    const saved = await saveSupabaseProject({
      userId,
      projectId: body.appProjectId,
      supabaseProjectRef: body.supabaseProjectRef,
      supabaseProjectName: body.supabaseProjectName,
      supabaseOrgId: body.supabaseOrgId,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken || null,
      anonKey: anonKey || undefined,
      expiresAt,
    })

    try {
      if (saved.supabase_project_ref) {
        const supabaseUrl = `https://${saved.supabase_project_ref}.supabase.co`
        await createOrUpdateEnvVar(
          body.appProjectId,
          userId,
          'NEXT_PUBLIC_SUPABASE_URL',
          supabaseUrl,
          false
        )
      }

      if (anonKey) {
        await createOrUpdateEnvVar(
          body.appProjectId,
          userId,
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          anonKey,
          false
        )
      }
    } catch (error) {
      console.warn('Failed to sync Supabase env vars to project env vars', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        projectId: body.appProjectId,
      })
    }

    return NextResponse.json({
      success: true,
      connection: {
        projectRef: saved.supabase_project_ref,
        projectName: saved.supabase_project_name,
        organizationId: saved.supabase_org_id,
      },
    })
  } catch (error) {
    console.error('Failed to save Supabase project selection', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    })
    return NextResponse.json(
      { error: 'Failed to save project selection' },
      { status: 500 }
    )
  }
}
