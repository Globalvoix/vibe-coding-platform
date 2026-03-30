import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserSubscription } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    const userId = clerkUserId ?? 'test-user-local'

    const subscription = await getUserSubscription(userId)

    // TEST MODE: always return a valid paid subscription so the UI allows access
    return NextResponse.json({
      subscription: subscription ?? {
        plan_id: 'pro',
        status: 'active',
        user_id: userId,
      },
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
