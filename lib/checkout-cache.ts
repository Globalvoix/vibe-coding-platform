// Temporary in-memory cache for checkout sessions
// Maps checkout URLs to user IDs for webhook matching
const checkoutCache = new Map<string, { userId: string; createdAt: number }>()

// Cache TTL: 1 hour
const CACHE_TTL = 60 * 60 * 1000

export function storeCheckoutSession(checkoutUrl: string, userId: string): void {
  checkoutCache.set(checkoutUrl, {
    userId,
    createdAt: Date.now(),
  })

  // Cleanup: Remove expired entries
  cleanupExpiredEntries()
}

export function getCheckoutSession(checkoutUrl: string): string | null {
  const session = checkoutCache.get(checkoutUrl)

  if (!session) {
    return null
  }

  // Check if expired
  if (Date.now() - session.createdAt > CACHE_TTL) {
    checkoutCache.delete(checkoutUrl)
    return null
  }

  return session.userId
}

export function getUserIdByProductAndTime(
  productId: string,
  withinSeconds: number = 120
): string | null {
  // Find a checkout session for this product within the time window
  // This is a fallback if custom field isn't available
  const now = Date.now()
  const timeWindow = withinSeconds * 1000

  for (const [, session] of checkoutCache) {
    if (now - session.createdAt < timeWindow) {
      return session.userId
    }
  }

  return null
}

function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, session] of checkoutCache) {
    if (now - session.createdAt > CACHE_TTL) {
      checkoutCache.delete(key)
    }
  }
}
