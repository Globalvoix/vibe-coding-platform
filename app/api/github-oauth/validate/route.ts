import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { githubAppClient } from '@/lib/github-api-client'

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        authenticated: false,
      },
      { status: 401 }
    )
  }

  console.log('[GitHub Validate] Starting GitHub App configuration validation')

  try {
    const result = await githubAppClient.validateConfiguration()

    const statusCode = result.valid ? 200 : 400

    console.log('[GitHub Validate] Validation complete', {
      valid: result.valid,
      errorCount: result.errors.length,
    })

    return NextResponse.json(
      {
        valid: result.valid,
        errors: result.errors,
        details: result.details,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    )
  } catch (error) {
    console.error('[GitHub Validate] Validation threw an exception', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        valid: false,
        errors: [
          `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        details: {},
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
