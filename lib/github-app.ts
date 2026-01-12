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
  // Remove all newlines and whitespace first
  const cleaned = pem.replace(/\\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim()

  // Extract the PEM header, body, and footer
  const beginMatch = cleaned.match(/-----BEGIN [^-]+-----/)
  const endMatch = cleaned.match(/-----END [^-]+-----/)

  if (!beginMatch || !endMatch) {
    console.error('[GitHub App] Invalid PEM format - missing headers')
    return pem
  }

  const header = beginMatch[0]
  const footer = endMatch[0]

  // Extract the base64 content between header and footer
  const startIdx = cleaned.indexOf(header) + header.length
  const endIdx = cleaned.indexOf(footer)
  const base64Content = cleaned.substring(startIdx, endIdx)

  // Split base64 into 64-character lines (standard PEM format)
  const lines = [header]
  for (let i = 0; i < base64Content.length; i += 64) {
    lines.push(base64Content.substring(i, i + 64))
  }
  lines.push(footer)

  return lines.join('\n')
}

function parseGithubPrivateKey(pem: string): KeyObject {
  // Check for placeholder values
  if (pem.includes('REPLACE_ENV') || pem === 'REPLACE_ENV.GITHUB_PRIVATE_KEY') {
    throw new Error(
      'GITHUB_PRIVATE_KEY is set to a placeholder value. Please set it to your actual GitHub App private key from https://github.com/settings/apps/thinksoft-bot/private-keys'
    )
  }

  // Check if it looks like a PEM key
  if (!pem.includes('BEGIN') || !pem.includes('END')) {
    throw new Error(
      'GITHUB_PRIVATE_KEY does not appear to be a valid PEM-formatted key. It should contain "BEGIN" and "END" markers and be the complete RSA private key from GitHub.'
    )
  }

  const normalizedPem = normalizePem(pem)

  try {
    return createPrivateKey({
      key: normalizedPem,
      format: 'pem',
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[GitHub App] Private key parsing failed:', errorMsg)
    throw new Error(
      `Failed to parse GitHub App private key: ${errorMsg}. Make sure you have the complete private key from https://github.com/settings/apps/thinksoft-bot/private-keys`
    )
  }
}

export async function createGithubAppJwt(): Promise<string> {
  try {
    const appId = getRequiredEnv('GITHUB_APP_ID')
    const rawPem = getRequiredEnv('GITHUB_PRIVATE_KEY')

    const now = Math.floor(Date.now() / 1000)

    const key = parseGithubPrivateKey(rawPem)

    return new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + 9 * 60)
      .setIssuer(appId)
      .sign(key)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[GitHub App] JWT creation failed:', errorMsg)
    throw error
  }
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
