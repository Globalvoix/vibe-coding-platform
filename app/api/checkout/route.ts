import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const checkoutLinks: Record<string, string> = {
  pro: 'https://thinksoft.lemonsqueezy.com/buy/5c4b6ae1-8fcf-4a2f-8c64-4f8d2a866262',
  business: 'https://thinksoft.lemonsqueezy.com/buy/0476f9d8-cc5e-4c77-8916-e918e815a141?discount=0',
  enterprise: 'https://thinksoft.lemonsqueezy.com/buy/1988f037-ac3e-4434-9a34-85ee271d18b5?discount=0',
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

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

    // Get checkout URL
    const baseUrl = checkoutLinks[planId as keyof typeof checkoutLinks]
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Checkout URL not found' },
        { status: 400 }
      )
    }

    // Add user ID as custom field
    const url = new URL(baseUrl)
    url.searchParams.append('checkout[custom][user_id]', userId)

    return NextResponse.json({ checkoutUrl: url.toString() })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
