import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function buildWorkspaceRedirect(origin: string, projectId: string | null, reason: string) {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  params.set('supabaseOauth', reason)
  return `${origin}/workspace?${params.toString()}`
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.redirect(buildWorkspaceRedirect(url.origin, null, 'missing_project'))
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID

  if (!supabaseUrl || !oauthClientId) {
    console.error(
      'Supabase OAuth misconfiguration:',
      { supabaseUrl: !!supabaseUrl, oauthClientId: !!oauthClientId }
    )
    return NextResponse.redirect(buildWorkspaceRedirect(url.origin, projectId, 'missing_config'))
  }

  const redirectUrlEnv =
    process.env.SUPABASE_OAUTH_REDIRECT_URL ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/supabase/oauth/callback`
      : undefined)

  const redirectUrl = redirectUrlEnv || `${url.origin}/api/supabase/oauth/callback`

  try {
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32))
    const codeChallenge = base64UrlEncode(
      crypto.createHash('sha256').update(codeVerifier).digest()
    )
    const state = base64UrlEncode(crypto.randomBytes(16))

    const authorizeUrl = new URL('/auth/v1/oauth/authorize', supabaseUrl)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('client_id', oauthClientId)
    authorizeUrl.searchParams.set('redirect_uri', redirectUrl)
    authorizeUrl.searchParams.set('code_challenge', codeChallenge)
    authorizeUrl.searchParams.set('code_challenge_method', 'S256')
    authorizeUrl.searchParams.set('state', state)
    authorizeUrl.searchParams.set('scope', 'openid email profile')

    const response = NextResponse.redirect(authorizeUrl.toString())

    const isProd = process.env.NODE_ENV === 'production'
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 10 * 60,
    }

    response.cookies.set('sb_oauth_verifier', codeVerifier, cookieOptions)
    response.cookies.set('sb_oauth_state', state, cookieOptions)
    response.cookies.set('sb_oauth_project_id', projectId, cookieOptions)

    return response
  } catch (error) {
    console.error('OAuth start error:', error)
    return NextResponse.redirect(buildWorkspaceRedirect(url.origin, projectId, 'oauth_setup_failed'))
  }
}
