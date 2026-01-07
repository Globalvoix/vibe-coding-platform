import { SignJWT } from 'jose'
import { createPrivateKey, KeyObject } from 'node:crypto'

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

function normalizePem(pem: string): string {
  // Handle both literal \n escape sequences and actual newlines
  let normalized = pem.replace(/\\n/g, '\n').trim()

  // Split into lines and remove empty lines
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Reconstruct with proper line endings
  return lines.join('\n')
}

function parseGithubPrivateKey(pem: string): KeyObject {
  const normalizedPem = normalizePem(pem)

  try {
    // Try creating the private key with the normalized PEM
    return createPrivateKey({
      key: normalizedPem,
      format: 'pem',
      encoding: 'utf8' as any,
    })
  } catch (error) {
    // Provide more detailed error information
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[GitHub App] Private key parsing failed:', {
      error: errorMsg,
      keyLength: normalizedPem.length,
      keyStart: normalizedPem.substring(0, 50),
      keyEnd: normalizedPem.substring(Math.max(0, normalizedPem.length - 50)),
    })
    throw new Error(`Failed to parse GitHub App private key: ${errorMsg}`)
  }
}

export async function createGithubAppJwt(): Promise<string> {
  const appId = getRequiredEnv('GITHUB_APP_ID')
  const rawPem = normalizePem(getRequiredEnv('GITHUB_PRIVATE_KEY'))

  const now = Math.floor(Date.now() / 1000)

  const key = parseGithubPrivateKey(rawPem)

  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 9 * 60)
    .setIssuer(appId)
    .sign(key)
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
