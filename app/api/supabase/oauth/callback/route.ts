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
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
  const oauthClientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET

  const requestUrl = new URL(req.url)

  const oauthRedirectUrlEnv =
    process.env.SUPABASE_OAUTH_REDIRECT_URL ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/supabase/oauth/callback`
      : undefined)

  const oauthRedirectUrl =
    oauthRedirectUrlEnv || `${requestUrl.origin}/api/supabase/oauth/callback`

  const cookieStore = await cookies()
  const storedState = cookieStore.get('sb_oauth_state')?.value ?? null
  const codeVerifier = cookieStore.get('sb_oauth_verifier')?.value ?? null
  const projectId = cookieStore.get('sb_oauth_project_id')?.value ?? null

  const redirectToWorkspace = (reason: string) => {
    const target = buildWorkspaceRedirect(requestUrl.origin, projectId, reason)
    return clearOauthCookies(NextResponse.redirect(target))
  }

  if (!supabaseUrl || !oauthClientId || !oauthClientSecret) {
    return redirectToWorkspace('missing_config')
  }

  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  if (!code) {
    return redirectToWorkspace('missing_code')
  }

  if (!storedState || state !== storedState) {
    return redirectToWorkspace('invalid_state')
  }

  if (!codeVerifier) {
    return redirectToWorkspace('missing_verifier')
  }

  const tokenUrl = new URL('/auth/v1/oauth/token', supabaseUrl)

  const tokenResponse = await fetch(tokenUrl.toString(), {
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

  if (!tokenResponse.ok) {
    return redirectToWorkspace('token_exchange_failed')
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const { userId } = await auth()

  if (!userId || !projectId) {
    const response = NextResponse.redirect(`${requestUrl.origin}/`)
    return clearOauthCookies(response)
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  await upsertSupabaseConnection({
    userId,
    projectId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    expiresAt,
  })

  await updateProjectCloudEnabled(userId, projectId, true)

  const workspaceRedirectUrl = `${requestUrl.origin}/workspace?projectId=${encodeURIComponent(projectId)}`

  const response = NextResponse.redirect(workspaceRedirectUrl)
  return clearOauthCookies(response)
}
