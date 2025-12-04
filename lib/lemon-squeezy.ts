export type PlanId = 'free' | 'pro' | 'business' | 'enterprise'

const PRODUCT_IDS: Record<Exclude<PlanId, 'free'>, string> = {
  pro: process.env.LEMON_SQUEEZY_PRO_PRODUCT_ID || '716722',
  business: process.env.LEMON_SQUEEZY_BUSINESS_PRODUCT_ID || '717067',
  enterprise: process.env.LEMON_SQUEEZY_ENTERPRISE_PRODUCT_ID || '717080',
}

/**
 * Generate Lemon Squeezy checkout URL for a specific plan
 * @param planId The plan to generate checkout for
 * @param email Optional email to pre-fill checkout
 * @param returnUrl URL to redirect to after successful payment
 * @returns The Lemon Squeezy checkout URL
 */
export function getLemonSqueezyCheckoutUrl(
  planId: Exclude<PlanId, 'free'>,
  email?: string,
  returnUrl?: string
): string {
  const productId = PRODUCT_IDS[planId]
  if (!productId) {
    throw new Error(`Invalid plan ID: ${planId}`)
  }

  const params = new URLSearchParams()
  params.append('checkout[product_id]', productId)
  if (email) {
    params.append('checkout[email]', email)
  }
  if (returnUrl) {
    params.append('checkout[return_url]', returnUrl)
  }

  return `https://thinksoft.lemonsqueezy.com/checkout/buy/${productId}?${params.toString()}`
}

/**
 * Get the Lemon Squeezy store domain
 */
export function getLemonSqueezyStoreDomain(): string {
  return 'https://thinksoft.lemonsqueezy.com'
}
