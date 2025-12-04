import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { pool } from '@/lib/db'

const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_ATTEMPTS = 5

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false
  }

  entry.count += 1
  return true
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Too many activation attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Check if user has a pending_activation subscription
    const result = await pool.query(
      `SELECT id, plan_id, status, current_period_end 
       FROM subscriptions 
       WHERE user_id = $1 AND status = $2`,
      [userId, 'pending_activation']
    )

    const subscription = result.rows[0]

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            'No pending activation found. Payment may not have been processed yet.',
        },
        { status: 400 }
      )
    }

    // Check if the pending activation is recent (within last 24 hours)
    const createdAt = new Date(subscription.created_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      return NextResponse.json(
        { error: 'Pending activation expired. Please contact support.' },
        { status: 400 }
      )
    }

    // Calculate the new period end date (30 days from now)
    const newPeriodEnd = new Date()
    newPeriodEnd.setDate(newPeriodEnd.getDate() + 30)

    // Update status to active (idempotent operation)
    await pool.query(
      `UPDATE subscriptions 
       SET status = $1, current_period_end = $2, updated_at = NOW()
       WHERE user_id = $3 AND status = $4
       RETURNING id, plan_id, status`,
      [
        'active',
        newPeriodEnd.toISOString(),
        userId,
        'pending_activation',
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully!',
      planId: subscription.plan_id,
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
