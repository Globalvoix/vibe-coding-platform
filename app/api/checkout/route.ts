import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  initializeFreeSubscription,
} from '@/lib/subscription'
import { getLemonSqueezyCheckoutUrl } from '@/lib/lemon-squeezy'

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

    // Get the return URL (where user comes back after payment)
    const returnUrl = request.headers.get('origin') || 'https://thinksoft.dev'

    // Generate Lemon Squeezy checkout URL that redirects to activation page
    const checkoutUrl = getLemonSqueezyCheckoutUrl(
      planId,
      `${returnUrl}/home/activate`
    )

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
