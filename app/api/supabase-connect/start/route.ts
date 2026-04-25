import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSupabaseOAuthAuthorizeUrl } from '@/lib/supabase-platform'

function getRequestOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost ?? req.headers.get('host')

  if (host) {
    const proto = forwardedProto ?? new URL(req.url).protocol.replace(':', '')
    return `${proto}://${host}`
  }

  return new URL(req.url).origin
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const appProjectId = url.searchParams.get('appProjectId')

  if (!appProjectId) {
    return NextResponse.json(
      { error: 'Missing appProjectId' },
      { status: 400 }
    )
  }

  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID

  if (!oauthClientId) {
    return NextResponse.json(
      { error: 'Supabase OAuth not configured' },
      { status: 500 }
    )
  }

  const redirectUrl =
    process.env.SUPABASE_OAUTH_REDIRECT_URL ||
    `${getRequestOrigin(req)}/api/supabase-connect/callback`

  const codeVerifier = base64UrlEncode(crypto.randomBytes(32))
  const codeChallenge = base64UrlEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  )
  const state = base64UrlEncode(crypto.randomBytes(16))

  const scope = process.env.SUPABASE_OAUTH_SCOPES

  const authorizeUrl = getSupabaseOAuthAuthorizeUrl({
    clientId: oauthClientId,
    redirectUri: redirectUrl,
    codeChallenge,
    state,
    scope,
  })

  const response = NextResponse.redirect(authorizeUrl)

  const isProd = process.env.NODE_ENV === 'production'
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60,
  }

  response.cookies.set('sb_cv', codeVerifier, cookieOptions)
  response.cookies.set('sb_state', state, cookieOptions)
  response.cookies.set('sb_app_project', appProjectId, cookieOptions)

  return response
}
