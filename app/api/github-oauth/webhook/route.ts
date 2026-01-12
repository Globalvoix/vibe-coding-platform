import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { deleteGithubProjectsByInstallation } from '@/lib/github-projects-db'

/**
 * Verify GitHub webhook signature
 * GitHub sends the X-Hub-Signature-256 header with format: sha256=<signature>
 */
function verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const expectedSignature = `sha256=${hash}`

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  )
}

interface GithubWebhookPayload {
  action?: string
  installation?: {
    id: number
    account: {
      login: string
      type: 'User' | 'Organization'
    }
  }
  sender?: {
    login: string
  }
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)

  console.log(`[GitHub Webhook:${requestId}] Received webhook request`)

  // Get webhook secret from environment
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error(`[GitHub Webhook:${requestId}] GITHUB_WEBHOOK_SECRET not configured`)
    return NextResponse.json(
      {
        error: 'Webhook secret not configured',
        requestId,
      },
      { status: 500 }
    )
  }

  // Get signature header
  const signature = req.headers.get('x-hub-signature-256')
  const gitHubEvent = req.headers.get('x-github-event')

  if (!signature) {
    console.warn(`[GitHub Webhook:${requestId}] Missing X-Hub-Signature-256 header`)
    return NextResponse.json(
      {
        error: 'Missing webhook signature',
        requestId,
      },
      { status: 401 }
    )
  }

  // Read and verify payload
  const payloadBuffer = await req.arrayBuffer()

  let isValid = false
  try {
    isValid = verifyWebhookSignature(Buffer.from(payloadBuffer), signature, webhookSecret)
  } catch (error) {
    console.error(`[GitHub Webhook:${requestId}] Signature verification threw an error`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Signature verification failed',
        requestId,
      },
      { status: 401 }
    )
  }

  if (!isValid) {
    console.warn(`[GitHub Webhook:${requestId}] Invalid webhook signature`)
    return NextResponse.json(
      {
        error: 'Invalid webhook signature',
        requestId,
      },
      { status: 401 }
    )
  }

  console.log(`[GitHub Webhook:${requestId}] Signature verified`, {
    event: gitHubEvent,
  })

  // Parse payload
  let payload: GithubWebhookPayload
  try {
    const text = new TextDecoder().decode(payloadBuffer)
    payload = JSON.parse(text) as GithubWebhookPayload
  } catch (error) {
    console.error(`[GitHub Webhook:${requestId}] Failed to parse webhook payload`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Invalid payload',
        requestId,
      },
      { status: 400 }
    )
  }

  // Only process installation events
  if (gitHubEvent !== 'installation') {
    console.log(`[GitHub Webhook:${requestId}] Ignoring non-installation event`, {
      event: gitHubEvent,
    })
    return NextResponse.json(
      {
        received: true,
        ignored: true,
        reason: 'Not an installation event',
        requestId,
      },
      { status: 200 }
    )
  }

  const action = payload.action
  const installation = payload.installation
  const sender = payload.sender

  console.log(`[GitHub Webhook:${requestId}] Processing installation event`, {
    action,
    installationId: installation?.id,
    accountLogin: installation?.account.login,
    accountType: installation?.account.type,
    sender: sender?.login,
  })

  // Handle different installation actions
  if (action === 'deleted' && installation) {
    // Uninstall event: delete all projects linked to this installation
    console.log(`[GitHub Webhook:${requestId}] Processing installation deletion`, {
      installationId: installation.id,
      accountLogin: installation.account.login,
    })

    try {
      const affectedProjectCount = await deleteGithubProjectsByInstallation({
        installationId: installation.id,
      })

      console.log(`[GitHub Webhook:${requestId}] Installation deletion completed`, {
        installationId: installation.id,
        affectedProjects: affectedProjectCount,
      })

      return NextResponse.json(
        {
          received: true,
          processed: true,
          action: 'deleted',
          installationId: installation.id,
          affectedProjects: affectedProjectCount,
          message: `Installation deleted. ${affectedProjectCount} project(s) disconnected from GitHub.`,
          requestId,
        },
        { status: 200 }
      )
    } catch (error) {
      console.error(`[GitHub Webhook:${requestId}] Error handling installation deletion`, {
        error: error instanceof Error ? error.message : String(error),
        installationId: installation.id,
      })
      return NextResponse.json(
        {
          received: true,
          processed: false,
          error: 'Failed to process installation deletion',
          requestId,
        },
        { status: 500 }
      )
    }
  }

  if (action === 'created' && installation) {
    // Install event: just acknowledge it
    // Repo creation will happen during the OAuth callback flow
    console.log(`[GitHub Webhook:${requestId}] Installation created event acknowledged`, {
      installationId: installation.id,
      accountLogin: installation.account.login,
    })

    return NextResponse.json(
      {
        received: true,
        processed: true,
        action: 'created',
        installationId: installation.id,
        message: 'Installation creation acknowledged. Repository creation will happen during OAuth callback.',
        requestId,
      },
      { status: 200 }
    )
  }

  if (action === 'unsuspend' && installation) {
    // Unsuspend event: just acknowledge it
    console.log(`[GitHub Webhook:${requestId}] Installation unsuspended`, {
      installationId: installation.id,
    })

    return NextResponse.json(
      {
        received: true,
        processed: true,
        action: 'unsuspend',
        installationId: installation.id,
        requestId,
      },
      { status: 200 }
    )
  }

  // Unknown action
  console.log(`[GitHub Webhook:${requestId}] Unknown installation action`, {
    action,
  })

  return NextResponse.json(
    {
      received: true,
      processed: false,
      reason: `Unknown action: ${action}`,
      requestId,
    },
    { status: 200 }
  )
}
