import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENV_VAR_ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  throw new Error(
    'ENV_VAR_ENCRYPTION_KEY is not set. Generate a 32-byte key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  )
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex')

if (key.length !== 32) {
  throw new Error('ENV_VAR_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)')
}

export function encryptEnvVar(value: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptEnvVar(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':')

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
