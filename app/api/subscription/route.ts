import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserSubscription } from '@/lib/subscription'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return NextResponse.json({ planId: 'free', status: 'inactive' })
    }

    return NextResponse.json({
      planId: subscription.plan_id,
      status: subscription.status,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
