import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = getRequestOrigin(req)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('sb_cv')?.value
  const state = cookieStore.get('sb_state')?.value
  const appProjectId = cookieStore.get('sb_app_project')?.value
  const receivedState = url.searchParams.get('state')

  if (error) {
    console.error('Supabase OAuth error:', error, errorDescription)
    const clearCookies = new Response(null, { status: 303 })
    clearCookies.headers.set(
      'Set-Cookie',
      'sb_cv=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly'
    )
    return clearCookies
  }

  if (!code || !codeVerifier || !state || state !== receivedState || !appProjectId) {
    console.error('OAuth validation failed', {
      hasCode: !!code,
      hasVerifier: !!codeVerifier,
      stateMatch: state === receivedState,
      hasAppProject: !!appProjectId,
    })
    const response = NextResponse.redirect(`${origin}/workspace?projectId=${appProjectId}`)
    response.cookies.set('sb_cv', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_app_project', '', { maxAge: 0, path: '/' })
    return response
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
  const oauthClientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET

  if (!supabaseUrl || !oauthClientId || !oauthClientSecret) {
    console.error('Supabase OAuth not configured')
    const response = NextResponse.redirect(`${origin}/workspace?projectId=${appProjectId}`)
    response.cookies.set('sb_cv', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_app_project', '', { maxAge: 0, path: '/' })
    return response
  }

  const redirectUrl =
    process.env.SUPABASE_OAUTH_REDIRECT_URL ||
    `${origin}/api/supabase-connect/callback`

  try {
    const tokenResponse = await fetch(
      new URL('/auth/v1/oauth/token', supabaseUrl).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: oauthClientId,
          client_secret: oauthClientSecret,
          redirect_uri: redirectUrl,
          code_verifier: codeVerifier,
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      const response = NextResponse.redirect(
        `${origin}/workspace?projectId=${appProjectId}`
      )
      response.cookies.set('sb_cv', '', { maxAge: 0, path: '/' })
      response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
      response.cookies.set('sb_app_project', '', { maxAge: 0, path: '/' })
      return response
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    const { userId } = await auth()

    if (!userId) {
      console.error('User not authenticated')
      const response = NextResponse.redirect(`${origin}/`)
      response.cookies.set('sb_cv', '', { maxAge: 0, path: '/' })
      response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
      response.cookies.set('sb_app_project', '', { maxAge: 0, path: '/' })
      return response
    }

    const response = NextResponse.redirect(
      `${origin}/supabase-select-project?appProjectId=${appProjectId}&token=${encodeURIComponent(
        tokenData.access_token
      )}&refreshToken=${encodeURIComponent(tokenData.refresh_token || '')}&expiresIn=${
        tokenData.expires_in || ''
      }`
    )

    response.cookies.set('sb_cv', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_app_project', '', { maxAge: 0, path: '/' })

    response.cookies.set('sb_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: (tokenData.expires_in || 3600) - 60,
    })

    if (tokenData.refresh_token) {
      response.cookies.set('sb_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      })
    }

    return response
  } catch (error) {
    console.error('Supabase OAuth error:', error)
    const response = NextResponse.redirect(
      `${origin}/workspace?projectId=${appProjectId}`
    )
    response.cookies.set('sb_cv', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
    response.cookies.set('sb_app_project', '', { maxAge: 0, path: '/' })
    return response
  }
}
