import { clerkMiddleware } from '@clerk/nextjs/server'

// TEST MODE: All routes are public — no sign-in required
export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)'],
}
