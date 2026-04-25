import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { deleteGithubProjectsByInstallation } from '@/lib/github-projects-db'

function verifySignature(payload: Buffer, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const expected = `sha256=${hash}`
  
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error('[GitHub Webhook] GITHUB_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const signature = req.headers.get('x-hub-signature-256')
  const event = req.headers.get('x-github-event')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const payload = await req.arrayBuffer()
  const buffer = Buffer.from(payload)

  if (!verifySignature(buffer, signature, secret)) {
    console.warn('[GitHub Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const data = JSON.parse(new TextDecoder().decode(buffer))

    // Only handle installation events
    if (event === 'installation' && data.action === 'deleted' && data.installation?.id) {
      const installationId = data.installation.id
      console.log('[GitHub Webhook] Processing installation deletion:', installationId)

      const affectedCount = await deleteGithubProjectsByInstallation({ installationId })

      return NextResponse.json({
        received: true,
        action: 'deleted',
        affectedProjects: affectedCount,
      })
    }

    // Acknowledge other events
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[GitHub Webhook] Error:', error)
    return NextResponse.json({ received: true })
  }
}
