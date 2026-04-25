import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createOrUpdateEnvVar } from '@/lib/env-vars-db'
import { getProject } from '@/lib/projects-db'

interface RequestBody {
  projectId: string
  envVars: Record<string, string>
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId, envVars } = (await req.json()) as RequestBody

    if (!projectId || !envVars || Object.keys(envVars).length === 0) {
      return NextResponse.json(
        { message: 'Missing projectId or envVars' },
        { status: 400 }
      )
    }

    // Verify the user owns the project
    const project = await getProject(userId, projectId)
    if (!project) {
      return NextResponse.json(
        { message: 'Project not found or unauthorized' },
        { status: 403 }
      )
    }

    // Store encrypted env vars in database
    const savedVars: string[] = []
    for (const [key, value] of Object.entries(envVars)) {
      if (!value || !value.trim()) continue

      try {
        await createOrUpdateEnvVar(projectId, userId, key, value, true)
        savedVars.push(key)
      } catch (error) {
        console.error(`Failed to save env var ${key}:`, error)
      }
    }

    // Push to Supabase Edge Function Secrets (if configured)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await syncSecretsToEdgeFunctions(projectId, envVars)
      } catch (error) {
        console.warn('Failed to sync to Edge Function Secrets:', error)
        // Don't fail the request, just warn
      }
    }

    return NextResponse.json(
      {
        message: 'Environment variables saved successfully',
        savedVars,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to submit env vars:', error)
    return NextResponse.json(
      { message: 'Failed to save environment variables' },
      { status: 500 }
    )
  }
}

async function syncSecretsToEdgeFunctions(
  projectId: string,
  envVars: Record<string, string>
) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }

  // Call Supabase to sync secrets
  // This would typically call a custom endpoint or use the Supabase Admin API
  // For now, we'll make a request to sync the secrets
  const response = await fetch(`${supabaseUrl}/functions/v1/sync-env-secrets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      projectId,
      secrets: envVars,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to sync secrets: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
