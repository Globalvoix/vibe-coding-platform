import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserCredits } from '@/lib/credits'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const credits = await getUserCredits(userId)

    return NextResponse.json({
      credits: credits.balance,
      planId: credits.planId,
    })
  } catch (error) {
    console.error('Error fetching user credits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
