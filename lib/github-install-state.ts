import crypto from 'node:crypto'

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const normalized = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

function getStateSecret() {
  return (
    process.env.GITHUB_STATE_SECRET ||
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY ||
    process.env.ENV_VAR_ENCRYPTION_KEY ||
    'development-insecure-secret'
  )
}

export function createGithubInstallState(params: {
  userId: string
  projectId: string
  mode?: 'import' | 'sync' | string
}) {
  const payload = {
    userId: params.userId,
    projectId: params.projectId,
    mode: params.mode,
    nonce: crypto.randomUUID(),
    ts: Date.now(),
  }

  const encodedPayload = base64url(JSON.stringify(payload))
  const sig = crypto
    .createHmac('sha256', getStateSecret())
    .update(encodedPayload)
    .digest('hex')

  return `${encodedPayload}.${sig}`
}

export function verifyGithubInstallState(state: string) {
  const [encodedPayload, sig] = state.split('.')
  if (!encodedPayload || !sig) return null

  const expected = crypto
    .createHmac('sha256', getStateSecret())
    .update(encodedPayload)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null

  try {
    const decoded = JSON.parse(base64urlDecode(encodedPayload)) as {
      userId: string
      projectId: string
      mode?: string
      nonce: string
      ts: number
    }

    if (!decoded?.userId || !decoded?.projectId) return null

    const ageMs = Date.now() - decoded.ts
    if (ageMs < 0 || ageMs > 1000 * 60 * 30) return null

    return { userId: decoded.userId, projectId: decoded.projectId }
  } catch {
    return null
  }
}
