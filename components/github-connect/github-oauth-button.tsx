'use client'

import { useState, useEffect } from 'react'
import { Loader, Github, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { GithubIcon } from '@/components/icons/github'

interface GithubConnectionStatus {
  connected: boolean
  username?: string
  avatarUrl?: string
  installationId?: string
}

interface Props {
  projectId?: string
  onConnectionChange?: (connected: boolean, status?: GithubConnectionStatus) => void
  compact?: boolean
}

export function GithubOAuthButton({ projectId, onConnectionChange, compact = false }: Props) {
  const [connecting, setConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<GithubConnectionStatus>({
    connected: false,
  })
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      if (!projectId) {
        setIsLoadingStatus(false)
        return
      }

      try {
        setIsLoadingStatus(true)
        const response = await fetch(
          `/api/github-oauth/status?projectId=${encodeURIComponent(projectId)}`
        )

        if (response.ok) {
          const status = (await response.json()) as GithubConnectionStatus
          if (!cancelled) {
            setConnectionStatus(status)
            onConnectionChange?.(status.connected, status)
          }
        }
      } catch (error) {
        console.error('Error checking GitHub connection status:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false)
        }
      }
    }

    checkStatus()

    return () => {
      cancelled = true
    }
  }, [projectId, onConnectionChange])

  const handleConnect = () => {
    if (!projectId || connecting) return

    setConnecting(true)
    const startUrl = `/api/github-oauth/start?projectId=${encodeURIComponent(projectId)}`
    window.location.href = startUrl
  }

  const handleDisconnect = async () => {
    if (!projectId || connecting) return

    try {
      setConnecting(true)
      const response = await fetch('/api/github-oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setConnectionStatus({ connected: false })
      setShowMenu(false)
      onConnectionChange?.(false)
      toast.success('GitHub disconnected')
    } catch (error) {
      console.error('Error disconnecting GitHub:', error)
      toast.error('Failed to disconnect GitHub')
    } finally {
      setConnecting(false)
    }
  }

  if (isLoadingStatus) {
    return (
      <Button
        type="button"
        size="icon"
        disabled
        className={cn(
          "bg-transparent border border-black/[0.06] text-foreground rounded-md shadow-sm",
          compact ? "w-8 h-8" : "h-9 w-9"
        )}
      >
        <Loader className="w-4 h-4 animate-spin" />
      </Button>
    )
  }

  if (connectionStatus.connected) {
    return (
      <div className="relative">
        <Button
          type="button"
          size="icon"
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            "bg-transparent border border-black/[0.06] hover:bg-black/[0.02] rounded-md transition-colors shadow-sm",
            compact ? "w-8 h-8" : "h-9 w-9"
          )}
          title={`GitHub connected as ${connectionStatus.username}`}
        >
          {connectionStatus.avatarUrl ? (
            <img 
              src={connectionStatus.avatarUrl} 
              alt={connectionStatus.username} 
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <GithubIcon className="w-4 h-4" />
          )}
        </Button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">
                {connectionStatus.username}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Connected to GitHub
              </p>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={connecting}
              className="w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {connecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        )}

        {showMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    )
  }

  return (
    <Button
      type="button"
      size="icon"
      onClick={handleConnect}
      disabled={!projectId || connecting}
      className={cn(
        "bg-transparent border border-black/[0.06] hover:bg-black/[0.02] rounded-md transition-colors shadow-sm",
        compact ? "w-8 h-8" : "h-9 w-9"
      )}
      title="Connect GitHub"
    >
      {connecting ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <GithubIcon className="w-4 h-4" />
      )}
    </Button>
  )
}
