import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  initializeFreeSubscription,
} from '@/lib/subscription'
import { getLemonSqueezyCheckoutUrl } from '@/lib/lemon-squeezy'
import { storeCheckoutSession } from '@/lib/checkout-cache'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    // If user is not logged in, return error
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const { planId } = await request.json()

    // Validate plan ID
    if (!['pro', 'business', 'enterprise'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    // Check if user has a subscription, if not create free one
    let subscription = await getUserSubscription(userId)
    if (!subscription) {
      subscription = await initializeFreeSubscription(userId)
    }

    // Generate Lemon Squeezy checkout URL with userId for webhook mapping
    const checkoutUrl = getLemonSqueezyCheckoutUrl(planId, userId)

    // Store in cache as fallback if custom field not in webhook
    storeCheckoutSession(checkoutUrl, userId)

    console.log('📝 Checkout session stored:', { userId, planId, checkoutUrl: checkoutUrl.substring(0, 80) })

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
