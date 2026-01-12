import { SignJWT } from 'jose'
import { createPrivateKey } from 'node:crypto'
import type { GithubInstallation } from '@/lib/github-types'

const GITHUB_API_BASE = 'https://api.github.com'

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15_000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}


function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} environment variable is required`)
  return value
}

export async function createGithubAppJwt(): Promise<string> {
  try {
    const appId = getEnv('GITHUB_APP_ID')
    const privateKeyPem = getEnv('GITHUB_PRIVATE_KEY')

    const key = createPrivateKey({
      key: privateKeyPem,
      format: 'pem',
    })

    const now = Math.floor(Date.now() / 1000)
    const exp = now + 9 * 60

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setIssuer(appId)
      .sign(key)

    return jwt
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create GitHub App JWT: ${msg}`)
  }
}

export async function getInstallation(installationId: number): Promise<GithubInstallation> {
  try {
    const jwt = await createGithubAppJwt()

    const res = await fetchWithTimeout(`${GITHUB_API_BASE}/app/installations/${installationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub API error (${res.status}): ${text}`)
    }

    return (await res.json()) as GithubInstallation
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get installation ${installationId}: ${msg}`)
  }
}

export async function createInstallationToken(installationId: number): Promise<string> {
  try {
    const jwt = await createGithubAppJwt()

    const res = await fetchWithTimeout(`${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({}),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub API error (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { token: string }
    return data.token
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create installation token for ${installationId}: ${msg}`)
  }
}

export async function githubRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: Record<string, unknown>
): Promise<T> {
  try {
    const res = await fetchWithTimeout(`${GITHUB_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub API error (${res.status}): ${text}`)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return (await res.json()) as T
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`GitHub API request failed: ${msg}`)
  }
}

export async function githubRequestNoContent(
  method: 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetchWithTimeout(`${GITHUB_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub API error (${res.status}): ${text}`)
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`GitHub API request failed: ${msg}`)
  }
}
