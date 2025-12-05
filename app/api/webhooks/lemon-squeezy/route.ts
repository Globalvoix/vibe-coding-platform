import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  updateSubscriptionFromWebhook,
  mapProductIdToPlanId,
} from '@/lib/subscription'
import { pool } from '@/lib/supabase-db'

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
      customUserId: payload.data.attributes.custom?.user_id,
      customerId: payload.data.attributes.customer_id,
    })

    // Handle different webhook events
    switch (payload.meta.event_name) {
      case 'subscription_created':
        console.log('✅ Processing subscription_created')
        await handleSubscriptionCreated(payload)
        break

      case 'subscription_payment_success':
        console.log('💰 Payment success - activating subscription')
        await handlePaymentSuccess(payload)
        break

      case 'subscription_updated':
        console.log('📝 Processing subscription_updated')
        await handleSubscriptionUpdated(payload)
        break

      case 'subscription_cancelled':
        console.log('❌ Processing subscription_cancelled')
        await handleSubscriptionCancelled(payload)
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

/**
 * subscription_created: User completed checkout, subscription created (not yet paid)
 * Set status to 'pending' and wait for subscription_payment_success
 */
async function handleSubscriptionCreated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, starts_at, renews_at, order_id } = data.attributes

  const planId = mapProductIdToPlanId(product_id)
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_created - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
  })

  if (!userId) {
    console.error(
      '❌ No custom user_id in webhook payload. Cannot create subscription.'
    )
    return
  }

  try {
    const periodStart = starts_at || new Date().toISOString()
    const periodEnd = renews_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Create subscription with 'pending' status (awaiting payment)
    await updateSubscriptionFromWebhook(
      data.id,
      userId,
      planId,
      'pending',
      periodStart,
      periodEnd,
      order_id
    )

    console.log(
      `✅ Subscription created (pending payment): userId=${userId}, plan=${planId}`
    )
  } catch (error) {
    console.error('❌ Error creating subscription:', error)
  }
}

/**
 * subscription_payment_success: Payment confirmed
 * Set status to 'active' to grant immediate access
 */
async function handlePaymentSuccess(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, starts_at, renews_at, ends_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_payment_success - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
  })

  if (!userId) {
    console.error(
      '❌ No custom user_id in webhook payload. Cannot activate subscription.'
    )
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
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Update subscription to 'active' status (grant immediate access)
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

/**
 * subscription_updated: Subscription details changed (e.g., plan upgrade, renewal)
 * Update period dates and other details
 */
async function handleSubscriptionUpdated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const { product_id, starts_at, renews_at, ends_at, order_id } =
    data.attributes

  const planId = mapProductIdToPlanId(product_id)
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_updated - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
  })

  if (!userId) {
    console.error(
      '❌ No custom user_id in webhook payload. Cannot update subscription.'
    )
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
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Update subscription details (keep current status)
    await updateSubscriptionFromWebhook(
      data.id,
      userId,
      planId,
      'active', // Assume already active if being updated
      periodStart,
      periodEnd,
      order_id
    )

    console.log(
      `📝 Subscription updated: userId=${userId}, plan=${planId}`
    )
  } catch (error) {
    console.error('❌ Error updating subscription:', error)
  }
}

/**
 * subscription_cancelled: User cancelled subscription
 * Set status to 'cancelled'
 */
async function handleSubscriptionCancelled(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const userId = data.attributes.custom?.user_id

  console.log('🔍 subscription_cancelled - User lookup:', {
    hasCustomUserId: !!userId,
    customUserId: userId,
  })

  if (!userId) {
    console.error(
      '❌ No custom user_id in webhook payload. Cannot cancel subscription.'
    )
    return
  }

  try {
    // Update subscription status to 'cancelled'
    await pool.query(
      `UPDATE subscriptions 
       SET status = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, plan_id, status`,
      ['cancelled', userId]
    )

    console.log(
      `❌ Subscription cancelled: userId=${userId}`
    )
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error)
  }
}
