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

interface LemonSqueezyWebhookAttributes {
  product_id: string
  status: string
  customer_id: string
  starts_at: string
  ends_at: string
  renews_at: string
  order_id: string
  custom?: {
    user_id?: string
  }
}

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string
  }
  data: {
    type: string
    id: string
    attributes: LemonSqueezyWebhookAttributes
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-signature') || ''

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload = JSON.parse(body) as LemonSqueezyWebhookPayload

    console.log('🔔 Lemon Squeezy Webhook:', {
      event: payload.meta.event_name,
      dataId: payload.data.id,
      productId: payload.data.attributes.product_id,
      status: payload.data.attributes.status,
      customUserId: payload.data.attributes.custom?.user_id,
      customerId: payload.data.attributes.customer_id,
    })

    // Handle different webhook events
    switch (payload.meta.event_name) {
      case 'order_created':
        console.log('📦 Order created event')
        // Orders are created before subscription, we handle activation on payment_success
        break

      case 'subscription_created':
        console.log('✅ Processing subscription_created')
        await handleSubscriptionCreated(payload)
        break

      case 'subscription_updated':
        console.log('✅ Processing subscription_updated')
        await handleSubscriptionUpdated(payload)
        break

      case 'subscription_payment_success':
        console.log('💰 Payment success - activating subscription')
        await handlePaymentSuccess(payload)
        break

      default:
        console.log(`⚠️ Unhandled webhook event: ${payload.meta.event_name}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, customer_id, starts_at, renews_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)

  // Get user_id from custom checkout data
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_created - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
    customerId: customer_id,
  })

  if (!userId) {
    console.error('❌ No custom user_id in webhook payload')
    return
  }

  // Create subscription with pending_activation status (user can activate once payment confirms)
  await updateSubscriptionFromWebhook(
    data.id,
    userId,
    planId,
    'pending_activation', // Wait for payment_success to activate
    starts_at,
    renews_at,
    order_id
  )

  console.log(`✅ Subscription created: userId=${userId}, plan=${planId}, status=pending_activation`)
}

async function handleSubscriptionUpdated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, customer_id, starts_at, renews_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)

  // Get user_id from custom checkout data
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_updated - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
    customerId: customer_id,
  })

  if (!userId) {
    console.error('❌ No custom user_id in webhook payload')
    return
  }

  // Just log the update - actual activation happens on payment_success
  console.log(`📝 Subscription updated: userId=${userId}, plan=${planId}`)
}

async function handlePaymentSuccess(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, customer_id, starts_at, renews_at, ends_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)

  // Get user_id from custom checkout data
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_payment_success - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
    customerId: customer_id,
  })

  if (!userId) {
    console.error('❌ No custom user_id in webhook payload. Cannot activate subscription.')
    return
  }

  try {
    const periodStart = starts_at || new Date().toISOString()
    let periodEnd: string

    if (renews_at) {
      periodEnd = renews_at
    } else if (ends_at) {
      periodEnd = ends_at
    } else {
      const fallbackEnd = new Date()
      fallbackEnd.setDate(fallbackEnd.getDate() + 30)
      periodEnd = fallbackEnd.toISOString()
    }

    await updateSubscriptionFromWebhook(
      data.id,
      userId,
      planId,
      'active',
      periodStart,
      periodEnd,
      order_id
    )

    console.log(
      `✅ Subscription ACTIVATED: userId=${userId}, plan=${planId}, status=active`
    )
  } catch (error) {
    console.error('❌ Error activating subscription:', error)
  }
}
