import { SignJWT } from 'jose'

const GITHUB_API_BASE = 'https://api.github.com'

export type GithubAccountType = 'User' | 'Organization'

export interface GithubInstallationAccount {
  login: string
  type: GithubAccountType
  avatar_url?: string
}

export interface GithubInstallationResponse {
  id: number
  account: GithubInstallationAccount
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export async function createGithubAppJwt(): Promise<string> {
  const appId = getRequiredEnv('GITHUB_APP_ID')
  const rawPem = getRequiredEnv('GITHUB_PRIVATE_KEY').replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)

  const key = createPrivateKey({
    key: rawPem,
    format: 'pem',
  })

  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key as any)
}

export async function githubAppRequest<T>(params: {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  jwt: string
  body?: unknown
}): Promise<T> {
  const res = await fetch(`${GITHUB_API_BASE}${params.path}`, {
    method: params.method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${params.jwt}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(params.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub App request failed (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as T
}

export async function githubInstallationRequest<T>(params: {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  installationToken: string
  body?: unknown
}): Promise<T> {
  const res = await fetch(`${GITHUB_API_BASE}${params.path}`, {
    method: params.method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${params.installationToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(params.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub installation request failed (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as T
}

export async function getInstallation(installationId: number): Promise<GithubInstallationResponse> {
  const jwt = await createGithubAppJwt()
  return githubAppRequest<GithubInstallationResponse>({
    method: 'GET',
    path: `/app/installations/${installationId}`,
    jwt,
  })
}

export async function createInstallationToken(installationId: number): Promise<string> {
  const jwt = await createGithubAppJwt()

  const result = await githubAppRequest<{ token: string }>({
    method: 'POST',
    path: `/app/installations/${installationId}/access_tokens`,
    jwt,
    body: {},
  })

  return result.token
}

export function getGithubAppSlug(): string {
  const slug = process.env.GITHUB_APP_SLUG
  if (!slug) {
    throw new Error('GITHUB_APP_SLUG is not set')
  }
  return slug
}
