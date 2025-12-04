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

      // Load and open Lemon Squeezy checkout
      if (!window.LemonSqueezy) {
        const script = document.createElement('script')
        script.src = 'https://assets.lemonsqueezy.com/lemon.js'
        script.async = true
        script.onload = () => {
          if (window.LemonSqueezy) {
            window.LemonSqueezy.Setup({ eventHandler: handleCheckoutEvent })
            openCheckoutModal(data.checkoutUrl)
          }
        }
        script.onerror = () => {
          setError('Failed to load checkout. Please try again.')
          setIsLoading(false)
        }
        document.body.appendChild(script)
      } else {
        window.LemonSqueezy.Setup({ eventHandler: handleCheckoutEvent })
        openCheckoutModal(data.checkoutUrl)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Checkout error:', err)
      setIsLoading(false)
    }
  }

  const openCheckoutModal = (url: string) => {
    if (window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(url)
      setIsLoading(false)
    } else {
      setError('Checkout modal unavailable. Please try again.')
      setIsLoading(false)
    }
  }

  const handleCheckoutEvent = (event: any) => {
    if (event.event === 'Checkout.Success') {
      // Payment was successful, activate subscription
      activateSubscription()
    } else if (event.event === 'Checkout.Close') {
      // User closed the checkout modal
      onOpenChange(false)
      setCheckoutUrl(null)
    }
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
    onOpenChange(false)
    setCheckoutUrl(null)
    setError(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (config: any) => void
      Url?: {
        Open: (url: string) => void
      }
    }
  }
}
