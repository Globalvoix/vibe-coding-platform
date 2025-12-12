'use client'

import { useState } from 'react'
import { Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  projectId?: string
  isConnected?: boolean
}

export function SupabaseButton({ projectId, isConnected }: Props) {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = () => {
    if (!projectId || connecting) return

    setConnecting(true)

    const startUrl = `/api/supabase-connect/start?appProjectId=${encodeURIComponent(
      projectId
    )}`
    window.location.href = startUrl
  }

  if (isConnected) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className="gap-2 text-xs bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400"
        title="Supabase connected"
      >
        <Database className="w-4 h-4" />
        <span className="hidden sm:inline">Connected</span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleConnect}
      disabled={!projectId || connecting}
      className="gap-2 text-xs"
      title="Connect Supabase project"
    >
      {connecting ? (
        <>
          <span className="inline-block w-2 h-2 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="hidden sm:inline">Connecting...</span>
        </>
      ) : (
        <>
          <Database className="w-4 h-4" />
          <span className="hidden sm:inline">Supabase</span>
        </>
      )}
    </Button>
  )
}
