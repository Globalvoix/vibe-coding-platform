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
  product_id?: string
  status?: string
  customer_id?: string
  starts_at?: string
  ends_at?: string
  renews_at?: string
  order_id?: string
  custom?: {
    user_id?: string
  }
  // For order_created events
  first_order_item?: {
    product_id: string
  }
}

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string
    custom_data?: {
      user_id?: string
    }
  }
  data: {
    type: string
    id: string
    attributes: LemonSqueezyWebhookAttributes
  }
}

/**
 * Extract user_id from either meta.custom_data or data.attributes.custom
 * Different events store it in different places
 */
function extractUserId(payload: LemonSqueezyWebhookPayload): string | undefined {
  // Try meta.custom_data first (order_created, subscription_created)
  if (payload.meta.custom_data?.user_id) {
    return payload.meta.custom_data.user_id
  }
  // Try data.attributes.custom (subscription_* events)
  if (payload.data.attributes.custom?.user_id) {
    return payload.data.attributes.custom.user_id
  }
  return undefined
}

/**
 * Extract product_id from either data.attributes or first_order_item
 */
function extractProductId(payload: LemonSqueezyWebhookPayload): string | undefined {
  // Try data.attributes.product_id first
  if (payload.data.attributes.product_id) {
    return payload.data.attributes.product_id
  }
  // Try first_order_item.product_id (order_created)
  if (payload.data.attributes.first_order_item?.product_id) {
    return payload.data.attributes.first_order_item.product_id
  }
  return undefined
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

    const userId = extractUserId(payload)
    const productId = extractProductId(payload)

    console.log('🔔 Lemon Squeezy Webhook:', {
      event: payload.meta.event_name,
      dataId: payload.data.id,
      productId,
      userId,
      customerId: payload.data.attributes.customer_id,
    })

    // Handle different webhook events
    switch (payload.meta.event_name) {
      case 'order_created':
        console.log('📦 Processing order_created')
        await handleOrderCreated(payload)
        break

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
 * order_created: User completed checkout on Lemon Squeezy
 * Create subscription with 'pending' status, waiting for payment_success
 */
async function handleOrderCreated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const userId = extractUserId(payload)
  const productId = extractProductId(payload)

  console.log('🔍 order_created - User lookup:', {
    hasUserId: !!userId,
    userId,
    productId,
  })

  if (!userId || !productId) {
    console.error(
      '❌ Missing user_id or product_id in order_created webhook'
    )
    return
  }

  try {
    const planId = mapProductIdToPlanId(productId)
    const now = new Date().toISOString()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    console.log('📝 Calling updateSubscriptionFromWebhook with:', {
      lemonSqueezySubscriptionId: data.id,
      userId,
      planId,
      status: 'pending',
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDaysFromNow,
    })

    // Create/activate subscription immediately when order is successfully created
    const result = await updateSubscriptionFromWebhook(
      data.id,
      userId,
      planId,
      'active',
      now,
      thirtyDaysFromNow,
      data.id
    )

    console.log(
      `✅ Subscription ACTIVATED from order_created:`,
      {
        userId,
        plan: planId,
        result: result ? `Row ID: ${result.id}` : 'No result returned',
      }
    )
  } catch (error) {
    console.error('❌ Error creating subscription in order_created:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}

/**
 * subscription_created: Subscription created on Lemon Squeezy
 * Update subscription with more details (usually happens after order_created)
 */
async function handleSubscriptionCreated(
  payload: LemonSqueezyWebhookPayload
): Promise<void> {
  const { data } = payload
  const userId = extractUserId(payload)
  const productId = extractProductId(payload)
  const { starts_at, renews_at, order_id } = data.attributes

  console.log('🔍 subscription_created - User lookup:', {
    hasUserId: !!userId,
    userId,
  })

  if (!userId || !productId) {
    console.error(
      '❌ Missing user_id or product_id in subscription_created webhook'
    )
    return
  }

  try {
    const planId = mapProductIdToPlanId(productId)
    const periodStart = starts_at || new Date().toISOString()
    const periodEnd = renews_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Update subscription with Lemon Squeezy details (keep 'pending' status)
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
      `✅ Subscription details updated: userId=${userId}, plan=${planId}`
    )
  } catch (error) {
    console.error('❌ Error updating subscription:', error)
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
  const userId = extractUserId(payload)
  const productId = extractProductId(payload)
  const { starts_at, renews_at, ends_at, order_id } = data.attributes

  console.log('🔍 subscription_payment_success - User lookup:', {
    hasUserId: !!userId,
    userId,
  })

  if (!userId || !productId) {
    console.error(
      '❌ Missing user_id or product_id in payment_success webhook. Cannot activate subscription.'
    )
    return
  }

  try {
    const planId = mapProductIdToPlanId(productId)
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
  const userId = extractUserId(payload)
  const productId = extractProductId(payload)
  const { starts_at, renews_at, ends_at, order_id } = data.attributes

  console.log('🔍 subscription_updated - User lookup:', {
    hasUserId: !!userId,
    userId,
  })

  if (!userId || !productId) {
    console.error(
      '❌ Missing user_id or product_id in subscription_updated webhook'
    )
    return
  }

  try {
    const planId = mapProductIdToPlanId(productId)
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
  const userId = extractUserId(payload)

  console.log('🔍 subscription_cancelled - User lookup:', {
    hasUserId: !!userId,
    userId,
  })

  if (!userId) {
    console.error(
      '❌ No user_id in webhook payload. Cannot cancel subscription.'
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
