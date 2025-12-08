'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSandboxStore } from '@/app/state'
import { useEffect } from 'react'
import useSWR from 'swr'

export function SandboxState() {
  const { sandboxId, status, setStatus } = useSandboxStore()
  if (status === 'stopped') {
    return (
      <Dialog open>
        <DialogHeader className="sr-only">
          <DialogTitle className="sr-only">
            Sandbox max. duration reached
          </DialogTitle>
          <DialogDescription className="sr-only">
            The Vercel Sandbox is already stopped. You can start a new session
            by clicking the button below.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <p className="mb-2 text-sm text-foreground">
            The build computer for this preview has been running for a long time and was
            automatically stopped, but your projects and code are safely saved.
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Start a new session to keep building from where you left off.
          </p>
          <Button onClick={() => window.location.reload()}>
            Start a new session
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return sandboxId ? (
    <DirtyChecker sandboxId={sandboxId} setStatus={setStatus} />
  ) : null
}

interface DirtyCheckerProps {
  sandboxId: string
  setStatus: (status: 'running' | 'stopped') => void
}

function DirtyChecker({ sandboxId, setStatus }: DirtyCheckerProps) {
  const content = useSWR<'ok' | 'stopped'>(
    `/api/sandboxes/${sandboxId}`,
    async (pathname: string, init: RequestInit) => {
      const response = await fetch(pathname, init)
      const { status } = await response.json()
      return status
    },
    { refreshInterval: 1000 }
  )

  useEffect(() => {
    if (content.data === 'stopped') {
      setStatus('stopped')
    }
  }, [setStatus, content.data])

  return null
}
