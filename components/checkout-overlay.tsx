'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CheckoutOverlayProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  planName: string
}

export function CheckoutOverlay({
  isOpen,
  onOpenChange,
  planId,
  planName,
}: CheckoutOverlayProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && !checkoutUrl && !isLoading) {
      initializeCheckout()
    }
  }, [isOpen])

  const initializeCheckout = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to initialize checkout')
        setIsLoading(false)
        return
      }

      const data = await response.json()
      setCheckoutUrl(data.checkoutUrl)
      openCheckoutModal(data.checkoutUrl)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Checkout error:', err)
      setIsLoading(false)
    }
  }

  const openCheckoutModal = (url: string) => {
    try {
      // Open Lemon Squeezy checkout in a new window
      window.open(url, 'lemon-squeezy-checkout', 'width=800,height=600')
      setIsLoading(false)
      setIsWaitingForPayment(true)
      startPaymentPolling()
    } catch (err) {
      setError('Failed to open checkout. Please try again.')
      setIsLoading(false)
      console.error('Error opening checkout:', err)
    }
  }

  const startPaymentPolling = () => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // Poll subscription status every 2 seconds for up to 5 minutes
    let pollCount = 0
    const maxPolls = 150 // 150 * 2 seconds = 300 seconds (5 minutes)

    pollIntervalRef.current = setInterval(async () => {
      pollCount++

      if (pollCount > maxPolls) {
        clearInterval(pollIntervalRef.current!)
        setIsWaitingForPayment(false)
        setError('Payment detection timeout. Please close and try again, or check your email for payment confirmation.')
        return
      }

      try {
        const response = await fetch('/api/subscription')
        if (response.ok) {
          const data = await response.json()
          console.log('Subscription status:', data.subscription?.status, 'Poll count:', pollCount)

          // Check if subscription is now pending activation (payment received)
          if (
            data.subscription &&
            (data.subscription.status === 'pending_activation' ||
             data.subscription.status === 'active')
          ) {
            clearInterval(pollIntervalRef.current!)
            setIsWaitingForPayment(false)

            // If already active, just close and redirect
            if (data.subscription.status === 'active') {
              onOpenChange(false)
              setCheckoutUrl(null)
              router.push('/home')
            } else {
              // Otherwise activate it
              activateSubscription()
            }
          }
        } else {
          console.error('Subscription fetch error:', response.status)
        }
      } catch (err) {
        console.error('Error polling subscription:', err)
      }
    }, 2000)
  }

  const activateSubscription = async () => {
    try {
      const response = await fetch('/api/activate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Subscription activated successfully
        onOpenChange(false)
        setCheckoutUrl(null)
        router.push('/home')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to activate subscription')
      }
    } catch (err) {
      setError('Failed to activate subscription. Please try again.')
      console.error('Activation error:', err)
    }
  }

  const handleClose = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    onOpenChange(false)
    setCheckoutUrl(null)
    setError(null)
    setIsWaitingForPayment(false)
  }

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            Upgrade to {planName} plan to access premium features
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-600">Loading checkout...</p>
          </div>
        ) : isWaitingForPayment ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-600">Processing payment...</p>
            <p className="text-xs text-gray-500">
              Please complete payment in the checkout window
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={initializeCheckout} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                The checkout window should have opened. If it didn&apos;t, click
                below:
              </p>
              <Button
                onClick={() => checkoutUrl && openCheckoutModal(checkoutUrl)}
                className="w-full"
              >
                Open Checkout
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Payment will be processed securely by Lemon Squeezy
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface LemonSqueezyConfig {
  eventHandler?: (event: CheckoutEvent) => void
}

interface CheckoutEvent {
  event: string
  [key: string]: unknown
}

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (config: LemonSqueezyConfig) => void
      Url?: {
        Open: (url: string) => void
      }
    }
  }
}
