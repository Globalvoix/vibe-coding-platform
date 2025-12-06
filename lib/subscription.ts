import { pool } from './supabase-db'

export type PlanId = 'free' | 'pro' | 'business' | 'enterprise'
export type SubscriptionStatus = 'active' | 'pending' | 'trialing' | 'past_due' | 'cancelled'

interface Subscription {
  id: number
  user_id: string
  plan_id: PlanId
  status: SubscriptionStatus
  lemon_squeezy_order_id: string | null
  lemon_squeezy_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

let ensureTablePromise: Promise<void> | null = null

async function ensureSubscriptionsTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS subscriptions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL UNIQUE,
            plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            lemon_squeezy_order_id VARCHAR(255),
            lemon_squeezy_subscription_id VARCHAR(255) UNIQUE,
            current_period_start TIMESTAMPTZ,
            current_period_end TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `)

        await pool.query(
          `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);`
        )

        await pool.query(
          `CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_squeezy_id ON subscriptions(lemon_squeezy_subscription_id);`
        )
      } catch (error) {
        console.error('Error ensuring subscriptions table exists:', error)
        throw error
      }
    })()
  }

  return ensureTablePromise
}

export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    await ensureSubscriptionsTable()
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [userId]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

export async function initializeFreeSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    await ensureSubscriptionsTable()
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId, 'free', 'active']
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error initializing free subscription:', error)
    return null
  }
}

export async function updateSubscriptionFromWebhook(
  lemonSqueezySubscriptionId: string,
  userId: string,
  planId: PlanId,
  status: SubscriptionStatus,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  orderIdOrProductId?: string
): Promise<Subscription | null> {
  try {
    await ensureSubscriptionsTable()
    console.log('📊 updateSubscriptionFromWebhook - DB Query:', {
      userId,
      planId,
      status,
      lemonSqueezySubscriptionId,
      orderIdOrProductId,
    })

    const result = await pool.query(
      `INSERT INTO subscriptions (
        user_id,
        plan_id,
        status,
        lemon_squeezy_subscription_id,
        lemon_squeezy_order_id,
        current_period_start,
        current_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        lemon_squeezy_subscription_id = EXCLUDED.lemon_squeezy_subscription_id,
        lemon_squeezy_order_id = EXCLUDED.lemon_squeezy_order_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        planId,
        status,
        lemonSqueezySubscriptionId,
        orderIdOrProductId || null,
        currentPeriodStart,
        currentPeriodEnd,
      ]
    )

    console.log('✅ Query succeeded, rows affected:', result.rowCount)
    console.log('📋 Returned subscription:', result.rows[0])

    return result.rows[0] || null
  } catch (error) {
    console.error('❌ Error updating subscription:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      planId,
      status,
    })
    return null
  }
}

export async function getPlanLimits(planId: PlanId) {
  const limits: Record<PlanId, { credits: number; apps: number; dbs: number }> =
    {
      free: { credits: 20, apps: 3, dbs: 1 },
      pro: { credits: 200, apps: 10, dbs: 10 },
      business: { credits: 1000, apps: 30, dbs: 30 },
      enterprise: { credits: 10000, apps: Infinity, dbs: Infinity },
    }
  return limits[planId] || limits.free
}

export function mapProductIdToPlanId(productId: string): PlanId {
  const productToPlan: Record<string, PlanId> = {
    [process.env.LEMON_SQUEEZY_PRO_PRODUCT_ID || '716722']: 'pro',
    [process.env.LEMON_SQUEEZY_BUSINESS_PRODUCT_ID || '717067']: 'business',
    [process.env.LEMON_SQUEEZY_ENTERPRISE_PRODUCT_ID || '717080']: 'enterprise',
    // Explicit fallback for current Business product in Lemon Squeezy dashboard
    '717099': 'business',
  }
  return productToPlan[productId] || 'free'
}
