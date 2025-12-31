'use client'

import { useState, useEffect } from 'react'
import { Loader, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const SupabaseLogo = ({ className }: { className?: string }) => (
  <img
    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F78ab58fa65ca497c8a79a60452a29c7a?format=webp&width=80"
    alt="Supabase"
    className={className}
  />
)

interface SupabaseConnectionStatus {
  connected: boolean
  projectName?: string
  projectRef?: string
  organizationId?: string
  accessToken?: string
  expiresAt?: string
}

interface Props {
  projectId?: string
  onConnectionChange?: (connected: boolean, status?: SupabaseConnectionStatus) => void
  compact?: boolean
}

export function SupabaseOAuthButton({ projectId, onConnectionChange, compact = false }: Props) {
  const [connecting, setConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus>({
    connected: false,
  })
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  // Check connection status on mount and when projectId changes
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
          `/api/supabase-oauth/status?projectId=${encodeURIComponent(projectId)}`
        )

        if (!response.ok) {
          throw new Error('Failed to check status')
        }

        const status = (await response.json()) as SupabaseConnectionStatus
        if (!cancelled) {
          setConnectionStatus(status)
          onConnectionChange?.(status.connected, status)
        }
      } catch (error) {
        console.error('Error checking Supabase connection status:', error)
        if (!cancelled) {
          setConnectionStatus({ connected: false })
        }
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
    const startUrl = `/api/supabase-oauth/start?appProjectId=${encodeURIComponent(projectId)}`
    window.location.href = startUrl
  }

  const handleDisconnect = async () => {
    if (!projectId || connecting) return

    try {
      setConnecting(true)
      const response = await fetch('/api/supabase-oauth/disconnect', {
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
      toast.success('Supabase disconnected')
    } catch (error) {
      console.error('Error disconnecting Supabase:', error)
      toast.error('Failed to disconnect Supabase')
    } finally {
      setConnecting(false)
    }
  }

  const handleReconnect = () => {
    setShowMenu(false)
    handleConnect()
  }

  if (isLoadingStatus) {
    if (compact) {
      return (
        <Button
          type="button"
          size="icon"
          disabled
          className="w-8 h-8 bg-[#F7F4ED] border border-black/[0.06] text-[#3ECF8E] rounded-md shadow-sm"
        >
          <Loader className="w-4 h-4 animate-spin" />
        </Button>
      )
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className="gap-2 text-xs"
      >
        <Loader className="w-4 h-4 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    )
  }

  if (connectionStatus.connected) {
    if (compact) {
      return (
        <div className="relative">
          <Button
            type="button"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 bg-[#F7F4ED] border border-black/[0.06] text-[#3ECF8E] hover:bg-black/[0.02] rounded-md transition-colors shadow-sm"
            title="Supabase connected"
          >
            <SupabaseLogo className="w-4 h-4" />
          </Button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground">
                  {connectionStatus.projectName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ref: {connectionStatus.projectRef}
                </p>
                {connectionStatus.expiresAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Expires: {new Date(connectionStatus.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReconnect}
                disabled={connecting}
                className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {connecting ? 'Reconnecting...' : 'Reconnect'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={connecting}
                className="w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 border-t border-border"
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
      <div className="relative">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowMenu(!showMenu)}
          className="gap-2 text-xs bg-[#3ECF8E]/10 dark:bg-[#3ECF8E]/5 border-[#3ECF8E]/30 text-[#3ECF8E] hover:bg-[#3ECF8E]/20"
        title="Supabase connected"
      >
        <SupabaseLogo className="w-4 h-4" />
        <span className="hidden sm:inline truncate max-w-[120px]">
          {connectionStatus.projectName || 'Connected'}
        </span>
      </Button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">
                {connectionStatus.projectName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ref: {connectionStatus.projectRef}
              </p>
              {connectionStatus.expiresAt && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Expires: {new Date(connectionStatus.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleReconnect}
              disabled={connecting}
              className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {connecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={connecting}
              className="w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 border-t border-border"
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

  if (compact) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={handleConnect}
        disabled={!projectId || connecting}
        className="w-8 h-8 bg-[#F7F4ED] border border-black/[0.06] text-[#3ECF8E] hover:bg-black/[0.02] rounded-md transition-colors shadow-sm"
        title="Connect Supabase project"
      >
        {connecting ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <SupabaseLogo className="w-4 h-4" />
        )}
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
      className="gap-2 text-xs hover:bg-[#3ECF8E]/10 border-[#3ECF8E]/20"
      title="Connect Supabase project"
    >
      {connecting ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">Connecting...</span>
        </>
      ) : (
        <>
          <SupabaseLogo className="w-4 h-4" />
          <span className="hidden sm:inline">Supabase</span>
        </>
      )}
    </Button>
  )
}
