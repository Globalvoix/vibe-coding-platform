'use client'

import { useAuth, useClerk, SignInButton } from '@clerk/nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { Navbar } from '@/components/ui/mini-navbar'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/ui-store'

export default function ActivatePage() {
  const { isSignedIn } = useAuth()
  const { openSignIn } = useClerk()
  const router = useRouter()
  const { sidebarOpen } = useUIStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleActivate = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Activation failed')
        return
      }

      const data = await response.json()
      setSuccess(true)

      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Activation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <AppSidebar />
      <div
        className={cn(
          'transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-64' : 'translate-x-0'
        )}
      >
        <Navbar />
        <main className="min-h-screen flex items-center justify-center px-4 pt-24">
          <div className="max-w-md w-full">
            {!isSignedIn ? (
              <div className="text-center space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Activate Subscription
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Sign in to activate your subscription
                  </p>
                </div>

                <SignInButton mode="modal">
                  <button className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            ) : success ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Subscription Activated!
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Your subscription is now active. Redirecting to home...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    Activate Subscription
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Click the button below to activate your subscription after
                    payment
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleActivate}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Activating...' : 'Activate Subscription'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  If you haven&apos;t completed payment yet, please do so first and
                  then return to this page.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
