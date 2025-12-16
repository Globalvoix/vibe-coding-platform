import { z } from 'zod'

const platformBaseUrlSchema = z
  .string()
  .url()
  .transform((v) => v.replace(/\/$/, ''))

export function getSupabasePlatformBaseUrl(): string {
  const fromEnv = process.env.SUPABASE_PLATFORM_URL
  const base = fromEnv?.trim() ? fromEnv.trim() : 'https://api.supabase.com'
  return platformBaseUrlSchema.parse(base)
}

export function getSupabaseOAuthAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scope?: string
}): string {
  const base = getSupabasePlatformBaseUrl()
  const url = new URL('/v1/oauth/authorize', base)

  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', params.state)

  const scope = params.scope?.trim()
  if (scope) {
    url.searchParams.set('scope', scope)
  }

  return url.toString()
}

export function getSupabaseOAuthTokenUrl(): string {
  const base = getSupabasePlatformBaseUrl()
  return new URL('/v1/oauth/token', base).toString()
}

export function getSupabaseProjectsListUrl(): string {
  const base = getSupabasePlatformBaseUrl()
  return new URL('/v1/projects', base).toString()
}

export function getSupabaseDatabaseQueryUrl(projectRef: string): string {
  const base = getSupabasePlatformBaseUrl()
  return new URL(`/v1/projects/${encodeURIComponent(projectRef)}/database/query`, base).toString()
}
