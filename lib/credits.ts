import { pool } from './supabase-db'
import { Models } from '@/ai/constants'
import { getPlanLimits, getUserSubscription, type PlanId } from './subscription'

export type CreditReason =
  | 'initial_allocation'
  | 'plan_period_reset'
  | 'ai_usage'
  | 'manual_adjustment'

export interface UsageSnapshot {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export interface UserCreditInfo {
  balance: number
  planId: PlanId | null
}

interface UserCreditsRow {
  user_id: string
  balance: number
  last_reset_at: string | null
}

interface CreditEstimation {
  costUsd: number
  credits: number
}

const CREDITS_PER_DOLLAR = 20

const MODEL_PRICING_PER_1K: Record<string, { inputUsd: number; outputUsd: number }> = {
  [Models.AnthropicClaude45Sonnet]: { inputUsd: 0.003, outputUsd: 0.015 },
  [Models.AnthropicClaude4Sonnet]: { inputUsd: 0.003, outputUsd: 0.015 },
  [Models.AnthropicClaude35Haiku]: { inputUsd: 0.0008, outputUsd: 0.004 },
  [Models.AnthropicClaude3Haiku]: { inputUsd: 0.0008, outputUsd: 0.004 },
  [Models.GoogleGeminiFlash]: { inputUsd: 0.00035, outputUsd: 0.00053 },
  [Models.OpenAIGPT5]: { inputUsd: 0.005, outputUsd: 0.015 },
}

const DEFAULT_MODEL_PRICING = { inputUsd: 0.002, outputUsd: 0.004 }

let ensureCreditsTablesPromise: Promise<void> | null = null

async function ensureCreditsTables(): Promise<void> {
  if (!ensureCreditsTablesPromise) {
    ensureCreditsTablesPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_credits (
          user_id VARCHAR(255) PRIMARY KEY,
          balance INTEGER NOT NULL DEFAULT 0,
          last_reset_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS credit_transactions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          change INTEGER NOT NULL,
          reason VARCHAR(50) NOT NULL,
          reference VARCHAR(255),
          metadata JSONB,
          balance_after INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)

      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at ON credit_transactions(user_id, created_at DESC);`
      )
    })()
  }

  return ensureCreditsTablesPromise
}

function estimateCostAndCredits(modelId: string, usage: UsageSnapshot | undefined): CreditEstimation {
  if (!usage) {
    return { costUsd: 0, credits: 0 }
  }

  const pricing = MODEL_PRICING_PER_1K[modelId] ?? DEFAULT_MODEL_PRICING
  const promptTokens = usage.promptTokens ?? 0
  const completionTokens = usage.completionTokens ?? 0

  const promptCost = (promptTokens / 1000) * pricing.inputUsd
  const completionCost = (completionTokens / 1000) * pricing.outputUsd
  const costUsd = promptCost + completionCost

  if (costUsd <= 0) {
    return { costUsd: 0, credits: 0 }
  }

  const credits = Math.max(1, Math.ceil(costUsd * CREDITS_PER_DOLLAR))

  return { costUsd, credits }
}

async function hydrateUserCreditsRow(userId: string): Promise<{ row: UserCreditsRow; planId: PlanId | null }> {
  await ensureCreditsTables()

  const subscription = await getUserSubscription(userId)
  const planId: PlanId | null = subscription?.plan_id ?? 'free'
  const periodStart = subscription?.current_period_start

  const result = await pool.query<UserCreditsRow>(
    'SELECT user_id, balance, last_reset_at FROM user_credits WHERE user_id = $1',
    [userId]
  )

  if (result.rowCount === 0) {
    const limits = await getPlanLimits(planId)
    const startingBalance = limits.credits
    const lastResetAt = periodStart || new Date().toISOString()

    const insert = await pool.query<UserCreditsRow>(
      `INSERT INTO user_credits (user_id, balance, last_reset_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         balance = EXCLUDED.balance,
         last_reset_at = EXCLUDED.last_reset_at,
         updated_at = NOW()
       RETURNING user_id, balance, last_reset_at`,
      [userId, startingBalance, lastResetAt]
    )

    await pool.query(
      `INSERT INTO credit_transactions (user_id, change, reason, reference, metadata, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        startingBalance,
        'initial_allocation',
        null,
        { planId, periodStart: lastResetAt },
        startingBalance,
      ]
    )

    return { row: insert.rows[0], planId }
  }

  const existing = result.rows[0]

  if (!periodStart) {
    return { row: existing, planId }
  }

  const lastResetAt = existing.last_reset_at ? new Date(existing.last_reset_at) : null
  const periodStartDate = new Date(periodStart)

  if (lastResetAt && periodStartDate <= lastResetAt) {
    return { row: existing, planId }
  }

  const limits = await getPlanLimits(planId)
  const newBalance = limits.credits

  const update = await pool.query<UserCreditsRow>(
    `UPDATE user_credits
     SET balance = $1,
         last_reset_at = $2,
         updated_at = NOW()
     WHERE user_id = $3
     RETURNING user_id, balance, last_reset_at`,
    [newBalance, periodStart, userId]
  )

  const change = newBalance - existing.balance

  await pool.query(
    `INSERT INTO credit_transactions (user_id, change, reason, reference, metadata, balance_after)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      change,
      'plan_period_reset',
      null,
      { planId, previousBalance: existing.balance, periodStart },
      newBalance,
    ]
  )

  return { row: update.rows[0], planId }
}

export async function getUserCredits(userId: string): Promise<UserCreditInfo> {
  const { row, planId } = await hydrateUserCreditsRow(userId)
  return {
    balance: row.balance,
    planId,
  }
}

export async function addPlanCreditsForPurchase(params: {
  userId: string
  planId: PlanId
  reference?: string
  metadata?: Record<string, unknown>
}): Promise<{ added: number; balance: number } | null> {
  const { userId, planId, reference, metadata } = params

  await hydrateUserCreditsRow(userId)
  await ensureCreditsTables()

  const limits = await getPlanLimits(planId)
  const amountToAdd = limits.credits

  if (!Number.isFinite(amountToAdd) || amountToAdd <= 0) {
    return null
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query<UserCreditsRow>(
      'SELECT user_id, balance, last_reset_at FROM user_credits WHERE user_id = $1 FOR UPDATE',
      [userId]
    )

    if (currentResult.rowCount === 0) {
      throw new Error('User credits row missing during top-up')
    }

    const current = currentResult.rows[0]
    const newBalance = current.balance + amountToAdd

    await client.query(
      `UPDATE user_credits
       SET balance = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newBalance, userId]
    )

    await client.query(
      `INSERT INTO credit_transactions (user_id, change, reason, reference, metadata, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        amountToAdd,
        'manual_adjustment',
        reference ?? null,
        { ...(metadata || {}), planId, type: 'plan_top_up' },
        newBalance,
      ]
    )

    await client.query('COMMIT')

    return { added: amountToAdd, balance: newBalance }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error adding plan credits for purchase', error)
    return null
  } finally {
    client.release()
  }
}

export async function recordUsageAndDeductCredits(params: {
  userId: string
  modelId: string
  usage?: UsageSnapshot
  reference?: string
  metadata?: Record<string, unknown>
}): Promise<{ deducted: number; remaining: number; costUsd: number } | null> {
  const { userId, modelId, usage, reference, metadata } = params

  const { costUsd, credits } = estimateCostAndCredits(modelId, usage)

  if (credits <= 0) {
    return null
  }

  await hydrateUserCreditsRow(userId)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query<UserCreditsRow>(
      'SELECT user_id, balance, last_reset_at FROM user_credits WHERE user_id = $1 FOR UPDATE',
      [userId]
    )

    if (currentResult.rowCount === 0) {
      throw new Error('User credits row missing during deduction')
    }

    const current = currentResult.rows[0]
    const available = current.balance
    const deducted = Math.min(available, credits)
    const newBalance = available - deducted

    await client.query(
      `UPDATE user_credits
       SET balance = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [newBalance, userId]
    )

    await client.query(
      `INSERT INTO credit_transactions (user_id, change, reason, reference, metadata, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        -deducted,
        'ai_usage',
        reference ?? null,
        {
          ...(metadata || {}),
          modelId,
          usage: usage ?? null,
          estimatedCredits: credits,
          estimatedCostUsd: costUsd,
        },
        newBalance,
      ]
    )

    await client.query('COMMIT')

    return { deducted, remaining: newBalance, costUsd }
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error deducting credits for usage', error)
    return null
  } finally {
    client.release()
  }
}
