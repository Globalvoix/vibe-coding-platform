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
      <Popover open={showMenu} onOpenChange={setShowMenu}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
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
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-0 bg-background border border-border rounded-lg shadow-lg">
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
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={showMenu} onOpenChange={setShowMenu}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
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
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-6 bg-white border border-black/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-[20px] font-bold text-[#111827] tracking-tight">GitHub</h3>
            <p className="text-[15px] text-[#111827]/60 leading-[1.45]">
              Sync your project 2-way with GitHub to collaborate at source.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button className="text-[#111827]/40 hover:text-[#111827]/70 transition-colors">
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-[#111827] hover:bg-[#111827]/90 text-white px-5 py-2.5 rounded-xl flex items-center gap-2.5 h-11 text-[14px] font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              <GithubIcon className="w-4 h-4 text-white" />
              {connecting ? 'Connecting...' : 'Connect GitHub'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
