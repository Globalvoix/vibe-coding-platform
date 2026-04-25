'use client'

import { Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface SubscriptionRequiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SubscriptionRequiredModal({
  isOpen,
  onClose,
}: SubscriptionRequiredModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onClose()
    router.push('/pricing')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <DialogTitle>Subscription Required</DialogTitle>
              <DialogDescription className="mt-2 space-y-2">
                <p>We&apos;re currently in <span className="font-semibold">beta</span> and offering paid plans only due to high demand.</p>
                <p>To use ThinkSoft AI, please select a subscription plan that works for you.</p>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleUpgrade} variant="default" className="bg-blue-600 hover:bg-blue-700">
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
