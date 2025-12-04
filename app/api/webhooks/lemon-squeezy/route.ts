import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  updateSubscriptionFromWebhook,
  mapProductIdToPlanId,
} from '@/lib/subscription'

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''

function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('hex')

  return hash === signature
}

interface LemonSqueezySubscriptionData {
  id: string
  attributes: {
    status: string
    product_id: string
    starts_at: string
    ends_at: string
    renews_at: string
    customer_id: string
  }
}

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string
  }
  data: {
    type: string
    id: string
    attributes: {
      product_id: string
      status: string
      customer_id: string
      starts_at: string
      ends_at: string
      renews_at: string
      order_id: string
    }
  }
}

async function handleSubscriptionCreated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, status, customer_id, starts_at, renews_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)

  // Get the user_id from custom checkout data (passed during checkout creation)
  // The custom field is available in the webhook payload
  const customData = (data.attributes as any).custom
  const userId = customData?.user_id || customer_id

  if (!userId) {
    console.error('No user_id found in webhook payload')
    return
  }

  // Set status to pending_activation for paid plans (awaiting manual activation)
  // Keep 'active' only for free plans
  const activationStatus = planId === 'free' ? 'active' : 'pending_activation'

  await updateSubscriptionFromWebhook(
    data.id,
    userId,
    planId,
    activationStatus,
    starts_at,
    renews_at,
    order_id
  )

  console.log(
    `Subscription created for user ${userId} with plan ${planId} (status: ${activationStatus})`
  )
}

async function handleSubscriptionUpdated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, status, customer_id, starts_at, renews_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)
  const userId = customer_id

  // Set status to pending_activation for paid plans, active for free plans
  const activationStatus = planId === 'free' ? 'active' : 'pending_activation'

  await updateSubscriptionFromWebhook(
    data.id,
    userId,
    planId,
    activationStatus,
    starts_at,
    renews_at,
    order_id
  )

  console.log(
    `Subscription updated for user ${userId} with plan ${planId} (status: ${activationStatus})`
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the raw body for signature verification
    const body = await request.text()

    // Get the signature from headers
    const signature = request.headers.get('x-signature') || ''

    // Verify the webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the payload
    const payload = JSON.parse(body) as LemonSqueezyWebhookPayload

    // Handle different webhook events
    switch (payload.meta.event_name) {
      case 'subscription.created':
        await handleSubscriptionCreated(payload)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(payload)
        break
      default:
        console.log(`Unhandled webhook event: ${payload.meta.event_name}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
