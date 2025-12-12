import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { upsertSupabaseConnection } from '@/lib/supabase-connections-db'
import { updateProjectCloudEnabled } from '@/lib/projects-db'

function buildWorkspaceRedirect(origin: string, projectId: string | null, reason: string) {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  params.set('supabaseOauth', reason)
  return `${origin}/workspace?${params.toString()}`
}

function clearOauthCookies(response: NextResponse) {
  response.cookies.set('sb_oauth_verifier', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_oauth_state', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_oauth_project_id', '', { maxAge: 0, path: '/' })
  return response
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const cookieStore = await cookies()

  const projectId = cookieStore.get('sb_oauth_project_id')?.value ?? null

  const redirectToWorkspace = (reason: string) => {
    const target = buildWorkspaceRedirect(requestUrl.origin, projectId, reason)
    return clearOauthCookies(NextResponse.redirect(target))
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
  const oauthClientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET

  if (!supabaseUrl || !oauthClientId || !oauthClientSecret) {
    console.error('Supabase OAuth configuration missing', {
      hasUrl: !!supabaseUrl,
      hasClientId: !!oauthClientId,
      hasClientSecret: !!oauthClientSecret,
    })
    return redirectToWorkspace('missing_config')
  }

  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('Supabase OAuth error:', error, errorDescription)
    return redirectToWorkspace('oauth_error')
  }

  if (!code) {
    console.error('No authorization code received')
    return redirectToWorkspace('missing_code')
  }

  const storedState = cookieStore.get('sb_oauth_state')?.value ?? null
  const codeVerifier = cookieStore.get('sb_oauth_verifier')?.value ?? null

  if (!storedState || !state || state !== storedState) {
    console.error('State mismatch or missing', { hasStoredState: !!storedState, hasState: !!state })
    return redirectToWorkspace('invalid_state')
  }

  if (!codeVerifier) {
    console.error('Code verifier missing from cookies')
    return redirectToWorkspace('missing_verifier')
  }

  if (!projectId) {
    console.error('Project ID missing from cookies')
    return redirectToWorkspace('missing_project')
  }

  const oauthRedirectUrlEnv =
    process.env.SUPABASE_OAUTH_REDIRECT_URL ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/supabase/oauth/callback`
      : undefined)

  const oauthRedirectUrl =
    oauthRedirectUrlEnv || `${requestUrl.origin}/api/supabase/oauth/callback`

  const tokenUrl = new URL('/auth/v1/oauth/token', supabaseUrl)

  let tokenResponse: Response

  try {
    tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: oauthClientId,
        client_secret: oauthClientSecret,
        redirect_uri: oauthRedirectUrl,
        code_verifier: codeVerifier,
      }),
    })
  } catch (err) {
    console.error('Token exchange request failed:', err)
    return redirectToWorkspace('token_exchange_failed')
  }

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error('Token exchange failed', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      error: errorText,
    })
    return redirectToWorkspace('token_exchange_failed')
  }

  let tokenData: { access_token: string; refresh_token?: string; expires_in?: number }

  try {
    tokenData = (await tokenResponse.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }
  } catch (err) {
    console.error('Failed to parse token response:', err)
    return redirectToWorkspace('token_parse_failed')
  }

  const { userId } = await auth()

  if (!userId) {
    console.error('User not authenticated')
    const response = NextResponse.redirect(`${requestUrl.origin}/`)
    return clearOauthCookies(response)
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  let supabaseProjectRef: string | null = null
  let supabaseOrgId: string | null = null
  let supabaseProjectName: string | null = null

  try {
    const projectsUrl = new URL('/v1/projects', supabaseUrl)
    const projectsResponse = await fetch(projectsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (projectsResponse.ok) {
      const projectsData = (await projectsResponse.json()) as unknown

      if (Array.isArray(projectsData) && projectsData.length > 0) {
        const firstProject = projectsData[0]

        if (firstProject && typeof firstProject === 'object') {
          const firstProjectRecord = firstProject as Record<string, unknown>

          const ref = firstProjectRecord.ref
          const name = firstProjectRecord.name
          const organizationId = firstProjectRecord.organization_id

          supabaseProjectRef = typeof ref === 'string' ? ref : null
          supabaseProjectName = typeof name === 'string' ? name : null
          supabaseOrgId = typeof organizationId === 'string' ? organizationId : null

          console.log('Supabase project info fetched:', {
            ref: supabaseProjectRef,
            name: supabaseProjectName,
          })
        }
      }
    } else {
      console.warn('Failed to fetch Supabase projects:', projectsResponse.status)
    }
  } catch (err) {
    console.error('Failed to fetch Supabase projects:', err)
  }

  try {
    await upsertSupabaseConnection({
      userId,
      projectId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      supabaseProjectRef,
      supabaseOrgId,
      supabaseProjectName,
    })

    await updateProjectCloudEnabled(userId, projectId, true)

    const workspaceRedirectUrl = `${requestUrl.origin}/workspace?projectId=${encodeURIComponent(projectId)}`
    const response = NextResponse.redirect(workspaceRedirectUrl)
    return clearOauthCookies(response)
  } catch (err) {
    console.error('Failed to save Supabase connection:', err)
    return redirectToWorkspace('connection_save_failed')
  }
}
