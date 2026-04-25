export type PlanId = 'free' | 'pro' | 'business' | 'enterprise'

const CHECKOUT_URLS: Record<Exclude<PlanId, 'free'>, string> = {
  pro: 'https://thinksoft.lemonsqueezy.com/buy/5c4b6ae1-8fcf-4a2f-8c64-4f8d2a866262?discount=0',
  business: 'https://thinksoft.lemonsqueezy.com/buy/0476f9d8-cc5e-4c77-8916-e918e815a141?discount=0',
  enterprise: 'https://thinksoft.lemonsqueezy.com/buy/1988f037-ac3e-4434-9a34-85ee271d18b5?discount=0',
}

/**
 * Get Lemon Squeezy checkout URL for a specific plan
 * @param planId The plan to generate checkout for
 * @param userId The Clerk user ID to associate with this checkout
 * @param returnUrl URL to redirect to after successful payment
 * @returns The Lemon Squeezy checkout URL
 */
export function getLemonSqueezyCheckoutUrl(
  planId: Exclude<PlanId, 'free'>,
  userId?: string,
  returnUrl?: string
): string {
  const baseUrl = CHECKOUT_URLS[planId]
  if (!baseUrl) {
    throw new Error(`Invalid plan ID: ${planId}`)
  }

  const url = new URL(baseUrl)

  // Pass userId as custom field so webhook can match it to our database
  if (userId) {
    url.searchParams.append('checkout[custom][user_id]', userId)
  }

  if (returnUrl) {
    url.searchParams.append('checkout[success_url]', returnUrl)
  }

  return url.toString()
}

/**
 * Get the Lemon Squeezy store domain
 */
export function getLemonSqueezyStoreDomain(): string {
  return 'https://thinksoft.lemonsqueezy.com'
}
