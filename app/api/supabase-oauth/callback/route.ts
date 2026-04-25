import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { getSupabaseOAuthTokenUrl } from '@/lib/supabase-platform'

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

function clearAuthCookies(response: NextResponse) {
  response.cookies.set('sb_code_verifier', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_state', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_app_project_id', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb_user_id', '', { maxAge: 0, path: '/' })
  return response
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = getRequestOrigin(req)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const receivedState = url.searchParams.get('state')

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('sb_code_verifier')?.value
  const state = cookieStore.get('sb_state')?.value
  const appProjectId = cookieStore.get('sb_app_project_id')?.value
  const cookieUserId = cookieStore.get('sb_user_id')?.value

  // Handle OAuth errors from Supabase
  if (error) {
    console.error('Supabase OAuth error', {
      error,
      errorDescription,
      timestamp: new Date().toISOString(),
    })
    const response = NextResponse.redirect(
      `${origin}/home?error=supabase_oauth_failed`
    )
    return clearAuthCookies(response)
  }

  // Validate all required parameters
  if (!code || !codeVerifier || !state || !receivedState || !appProjectId) {
    console.error('OAuth validation failed', {
      hasCode: !!code,
      hasCodeVerifier: !!codeVerifier,
      hasState: !!state,
      hasReceivedState: !!receivedState,
      hasAppProjectId: !!appProjectId,
    })
    const response = NextResponse.redirect(
      `${origin}/home?error=oauth_validation_failed`
    )
    return clearAuthCookies(response)
  }

  // Validate state matches
  if (state !== receivedState) {
    console.error('State mismatch', {
      expected: state,
      received: receivedState,
    })
    const response = NextResponse.redirect(
      `${origin}/home?error=state_mismatch`
    )
    return clearAuthCookies(response)
  }

  // Get current user for verification
  const { userId } = await auth()
  if (!userId || userId !== cookieUserId) {
    console.error('User ID mismatch', {
      currentUserId: userId,
      cookieUserId,
    })
    const response = NextResponse.redirect(
      `${origin}/home?error=user_mismatch`
    )
    return clearAuthCookies(response)
  }

  const oauthClientId =
    process.env.SUPABASE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID
  const oauthClientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET

  if (!oauthClientId || !oauthClientSecret) {
    console.error('Supabase OAuth config missing', {
      hasClientId: !!oauthClientId,
      hasSecret: !!oauthClientSecret,
    })
    const response = NextResponse.redirect(
      `${origin}/home?error=server_config_missing`
    )
    return clearAuthCookies(response)
  }

  const redirectUrl =
    process.env.SUPABASE_OAUTH_REDIRECT_URL ||
    `${origin}/api/supabase-oauth/callback`

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(getSupabaseOAuthTokenUrl(), {
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
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed', {
        status: tokenResponse.status,
        error: errorText,
      })
      const response = NextResponse.redirect(
        `${origin}/home?error=token_exchange_failed`
      )
      return clearAuthCookies(response)
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      token_type?: string
    }

    // Validate token response
    if (!tokenData.access_token) {
      console.error('Token response missing access_token')
      const response = NextResponse.redirect(
        `${origin}/home?error=invalid_token_response`
      )
      return clearAuthCookies(response)
    }

    // Calculate token expiration
    const expiresIn = tokenData.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // Redirect to project selection page
    const selectUrl = new URL('/supabase-oauth-select', origin)
    selectUrl.searchParams.set('appProjectId', appProjectId)
    selectUrl.searchParams.set('accessToken', tokenData.access_token)
    if (tokenData.refresh_token) {
      selectUrl.searchParams.set('refreshToken', tokenData.refresh_token)
    }
    selectUrl.searchParams.set('expiresIn', expiresIn.toString())

    const response = NextResponse.redirect(selectUrl.toString())

    // Store tokens in secure httpOnly cookies
    const isProd = process.env.NODE_ENV === 'production'
    const tokenCookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: expiresIn - 60, // Slightly less than actual expiry
    }

    const refreshCookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    }

    response.cookies.set('sb_access_token', tokenData.access_token, tokenCookieOptions)
    if (tokenData.refresh_token) {
      response.cookies.set('sb_refresh_token', tokenData.refresh_token, refreshCookieOptions)
    }
    response.cookies.set('sb_token_expires_at', expiresAt.toISOString(), tokenCookieOptions)

    // Clear temporary auth cookies
    return clearAuthCookies(response)
  } catch (error) {
    console.error('Supabase OAuth callback error', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
    const response = NextResponse.redirect(
      `${origin}/home?error=oauth_callback_error`
    )
    return clearAuthCookies(response)
  }
}
