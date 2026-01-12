import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createGithubAppJwt } from '@/lib/github-app'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const errors: string[] = []
  const details: Record<string, unknown> = {}

  // Check environment variables
  if (!process.env.GITHUB_APP_ID) {
    errors.push('GITHUB_APP_ID is not set')
  } else {
    details.appId = process.env.GITHUB_APP_ID
  }

  if (!process.env.GITHUB_PRIVATE_KEY) {
    errors.push('GITHUB_PRIVATE_KEY is not set')
  } else {
    const key = process.env.GITHUB_PRIVATE_KEY
    if (key.includes('REPLACE_ENV')) {
      errors.push('GITHUB_PRIVATE_KEY is still a placeholder - set your actual private key')
    } else if (!key.includes('BEGIN') || !key.includes('END')) {
      errors.push('GITHUB_PRIVATE_KEY does not look like a valid PEM key')
    } else {
      details.hasPrivateKey = true
    }
  }

  if (!process.env.GITHUB_APP_SLUG) {
    errors.push('GITHUB_APP_SLUG is not set')
  } else {
    details.appSlug = process.env.GITHUB_APP_SLUG
  }

  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    errors.push('GITHUB_WEBHOOK_SECRET is not set')
  }

  // Try to create JWT
  try {
    await createGithubAppJwt()
    details.jwtWorks = true
  } catch (error) {
    errors.push(`JWT creation failed: ${error instanceof Error ? error.message : String(error)}`)
    details.jwtWorks = false
  }

  const valid = errors.length === 0

  return NextResponse.json(
    {
      valid,
      errors,
      details,
    },
    { status: valid ? 200 : 400 }
  )
}
