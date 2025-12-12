'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
}

export function ComingSoonModal({
  isOpen,
  onClose,
  title = 'Coming Soon',
  description = 'This feature will be available soon. Stay tuned!',
}: ComingSoonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-2">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} variant="default">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
