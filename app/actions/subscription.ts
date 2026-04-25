'use server'

import { auth } from '@clerk/nextjs/server'
import {
  getUserSubscription,
  initializeFreeSubscription,
} from '@/lib/subscription'

/**
 * Ensure user has a subscription initialized (Free plan by default)
 * Call this when user logs in or accesses protected areas
 */
export async function ensureUserSubscription() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    // Check if user has a subscription
    let subscription = await getUserSubscription(userId)

    // If not, initialize with free plan
    if (!subscription) {
      subscription = await initializeFreeSubscription(userId)
    }

    return subscription
  } catch (error) {
    console.error('Error ensuring user subscription:', error)
    return null
  }
}
