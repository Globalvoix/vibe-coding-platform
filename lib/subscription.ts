import { pool } from './supabase-db'

export type PlanId = 'free' | 'pro' | 'business' | 'enterprise'
export type SubscriptionStatus = 'active' | 'pending' | 'trialing' | 'past_due' | 'cancelled'

export function isPaidSubscription(subscription: Subscription | null | undefined): boolean {
  if (!subscription) return false
  if (subscription.plan_id === 'free') return false
  return subscription.status === 'active' || subscription.status === 'trialing'
}

const BILLING_PERIOD_DAYS = 30

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function getDefaultBillingPeriod(now: Date = new Date()): { start: string; end: string } {
  return { start: now.toISOString(), end: addDays(now, BILLING_PERIOD_DAYS).toISOString() }
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export interface Subscription {
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

async function updateSubscriptionPeriodIfMissing(
  subscription: Subscription
): Promise<Subscription> {
  const hasPeriodStart = !!parseDate(subscription.current_period_start)
  const hasPeriodEnd = !!parseDate(subscription.current_period_end)

  if (hasPeriodStart && hasPeriodEnd) {
    return subscription
  }

  const now = new Date()
  const defaultPeriod = getDefaultBillingPeriod(now)

  const start = subscription.current_period_start ?? defaultPeriod.start
  const end = subscription.current_period_end ?? defaultPeriod.end

  const updated = await pool.query<Subscription>(
    `UPDATE subscriptions
     SET current_period_start = $1,
         current_period_end = $2,
         updated_at = NOW()
     WHERE user_id = $3
     RETURNING *`,
    [start, end, subscription.user_id]
  )

  return updated.rows[0] ?? subscription
}

async function rollFreePlanPeriodIfNeeded(subscription: Subscription): Promise<Subscription> {
  if (subscription.plan_id !== 'free') {
    return subscription
  }

  const periodEnd = parseDate(subscription.current_period_end)
  if (!periodEnd) {
    return updateSubscriptionPeriodIfMissing(subscription)
  }

  const now = new Date()
  if (now < periodEnd) {
    return subscription
  }

  const start = periodEnd.toISOString()
  const end = addDays(periodEnd, BILLING_PERIOD_DAYS).toISOString()

  const updated = await pool.query<Subscription>(
    `UPDATE subscriptions
     SET current_period_start = $1,
         current_period_end = $2,
         status = $3,
         updated_at = NOW()
     WHERE user_id = $4
     RETURNING *`,
    [start, end, 'active', subscription.user_id]
  )

  return updated.rows[0] ?? subscription
}

async function downgradeToFree(subscription: Subscription): Promise<Subscription> {
  const { start, end } = getDefaultBillingPeriod(new Date())

  const updated = await pool.query<Subscription>(
    `UPDATE subscriptions
     SET plan_id = $1,
         status = $2,
         current_period_start = $3,
         current_period_end = $4,
         updated_at = NOW()
     WHERE user_id = $5
     RETURNING *`,
    ['free', 'active', start, end, subscription.user_id]
  )

  return updated.rows[0] ?? subscription
}

async function normalizeSubscription(subscription: Subscription): Promise<Subscription> {
  const withPeriod = await updateSubscriptionPeriodIfMissing(subscription)

  const periodEnd = parseDate(withPeriod.current_period_end)
  if (!periodEnd) {
    return withPeriod
  }

  const now = new Date()

  if (withPeriod.plan_id !== 'free' && now >= periodEnd) {
    return downgradeToFree(withPeriod)
  }

  if (withPeriod.plan_id === 'free') {
    return rollFreePlanPeriodIfNeeded(withPeriod)
  }

  return withPeriod
}

export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    await ensureSubscriptionsTable()
    const result = await pool.query<Subscription>(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [userId]
    )

    const subscription = result.rows[0]

    if (!subscription) {
      const created = await initializeFreeSubscription(userId)
      return created ? normalizeSubscription(created) : null
    }

    return normalizeSubscription(subscription)
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
    const { start, end } = getDefaultBillingPeriod(new Date())

    const result = await pool.query<Subscription>(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId, 'free', 'active', start, end]
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
      free: { credits: 20, apps: 5, dbs: 1 },
      pro: { credits: 200, apps: Infinity, dbs: 10 },
      business: { credits: 600, apps: Infinity, dbs: 30 },
      enterprise: { credits: 6000, apps: Infinity, dbs: Infinity },
    }
  return limits[planId] || limits.free
}

export function mapProductIdToPlanId(productId: string): PlanId {
  const productToPlan: Record<string, PlanId> = {
    [process.env.LEMON_SQUEEZY_PRO_PRODUCT_ID || '716722']: 'pro',
    [process.env.LEMON_SQUEEZY_BUSINESS_PRODUCT_ID || '717067']: 'business',
    [process.env.LEMON_SQUEEZY_ENTERPRISE_PRODUCT_ID || '717080']: 'enterprise',
  }

  return productToPlan[productId] || 'free'
}
