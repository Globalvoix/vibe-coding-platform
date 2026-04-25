import crypto from 'node:crypto'

export interface GithubOAuthTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} environment variable is required`)
  return value
}

export function createGithubOAuthAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scope: string
}): string {
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('state', params.state)
  url.searchParams.set('scope', params.scope)
  url.searchParams.set('allow_signup', 'true')

  return url.toString()
}

export async function exchangeGithubOAuthCode(params: {
  code: string
  redirectUri: string
}): Promise<GithubOAuthTokenResponse> {
  const clientId = getEnv('GITHUB_OAUTH_CLIENT_ID')
  const clientSecret = getEnv('GITHUB_OAUTH_CLIENT_SECRET')

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId))

  const data: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(`GitHub OAuth token exchange failed (${res.status}): ${JSON.stringify(data)}`)
  }

  if (!data || typeof data !== 'object') {
    throw new Error('GitHub OAuth token exchange returned an invalid response')
  }

  const accessToken = (data as { access_token?: unknown }).access_token
  const tokenType = (data as { token_type?: unknown }).token_type
  const scope = (data as { scope?: unknown }).scope
  const error = (data as { error?: unknown }).error

  if (typeof error === 'string' && error.length > 0) {
    const desc = (data as { error_description?: unknown }).error_description
    throw new Error(
      `GitHub OAuth token exchange error: ${error}${typeof desc === 'string' ? ` (${desc})` : ''}`
    )
  }

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('GitHub OAuth token exchange did not return an access_token')
  }

  return {
    access_token: accessToken,
    token_type: typeof tokenType === 'string' ? tokenType : 'bearer',
    scope: typeof scope === 'string' ? scope : '',
  }
}

export function generateOauthNonce(): string {
  return crypto.randomUUID()
}
