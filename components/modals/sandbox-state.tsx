'use client'

import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useSandboxStore } from '@/app/state'

export function SandboxState() {
  const {
    sandboxId,
    status,
    setStatus,
    currentProjectId,
    applySandboxState,
  } = useSandboxStore()

  const reviveInFlight = useRef(false)

  useEffect(() => {
    if (status !== 'stopped') return
    if (!currentProjectId) return
    if (reviveInFlight.current) return

    reviveInFlight.current = true

    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${currentProjectId}/sandbox/revive`, {
          method: 'POST',
        })

        if (!res.ok) return

        const data = (await res.json()) as {
          sandbox_state: {
            sandboxId?: string
            paths?: string[]
            url?: string
            urlUUID?: string
          } | null
        }

        if (data.sandbox_state) {
          applySandboxState(data.sandbox_state)
          setStatus('running')
        }
      } finally {
        reviveInFlight.current = false
      }
    })()
  }, [applySandboxState, currentProjectId, setStatus, status])

  if (!sandboxId || status === 'stopped') return null

  return <DirtyChecker sandboxId={sandboxId} setStatus={setStatus} />
}

interface DirtyCheckerProps {
  sandboxId: string
  setStatus: (status: 'running' | 'stopped') => void
}

function DirtyChecker({ sandboxId, setStatus }: DirtyCheckerProps) {
  const content = useSWR<'running' | 'stopped'>(
    `/api/sandboxes/${sandboxId}`,
    async (pathname: string, init: RequestInit) => {
      const response = await fetch(pathname, init)
      const { status } = (await response.json()) as { status: 'running' | 'stopped' }
      return status
    },
    {
      refreshInterval: 5000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      dedupingInterval: 1500,
    }
  )

  useEffect(() => {
    if (content.data === 'stopped') {
      setStatus('stopped')
    }
  }, [setStatus, content.data])

  return null
}
