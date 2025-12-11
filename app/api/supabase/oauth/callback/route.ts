import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { upsertSupabaseConnection } from '@/lib/supabase-connections-db'
import { updateProjectCloudEnabled } from '@/lib/projects-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
const OAUTH_CLIENT_SECRET = process.env.SUPABASE_OAUTH_CLIENT_SECRET
const OAUTH_REDIRECT_URL =
  process.env.SUPABASE_OAUTH_REDIRECT_URL ||
  (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/supabase/oauth/callback`
    : undefined)

export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URL) {
    return NextResponse.json(
      { error: 'Supabase OAuth configuration is missing' },
      { status: 500 }
    )
  }

  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('sb_oauth_state')?.value
  const codeVerifier = cookieStore.get('sb_oauth_verifier')?.value
  const projectId = cookieStore.get('sb_oauth_project_id')?.value

  if (!storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  if (!codeVerifier) {
    return NextResponse.json({ error: 'Missing PKCE verifier' }, { status: 400 })
  }

  const tokenUrl = new URL('/auth/v1/oauth/token', SUPABASE_URL)

  const tokenResponse = await fetch(tokenUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: OAUTH_REDIRECT_URL,
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text().catch(() => '')
    return NextResponse.json(
      { error: 'Failed to exchange code for tokens', details: errorText },
      { status: 500 }
    )
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const { userId } = await auth()

  if (!userId || !projectId) {
    const redirectBack = `${requestUrl.origin}/`
    const response = NextResponse.redirect(redirectBack)
    response.cookies.set('sb_oauth_verifier', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_oauth_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_oauth_project_id', '', { maxAge: 0, path: '/' })
    return response
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

  const redirectPath = `/workspace?projectId=${encodeURIComponent(projectId)}`
  const redirectUrl = `${requestUrl.origin}${redirectPath}`

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set('sb_oauth_verifier', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_oauth_state', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_oauth_project_id', '', { maxAge: 0, path: '/' })

  return response
}
