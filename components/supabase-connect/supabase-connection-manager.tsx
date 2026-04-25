'use client'

import { useState, useEffect } from 'react'
import {
  Database,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SupabaseConnectionInfo {
  connected: boolean
  projectRef?: string
  projectName?: string
  organizationId?: string
  expiresAt?: string
  connectedAt?: string
  lastUpdated?: string
}

interface Props {
  projectId: string
}

export function SupabaseConnectionManager({ projectId }: Props) {
  const [connectionInfo, setConnectionInfo] = useState<SupabaseConnectionInfo | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Fetch connection info on mount
  useEffect(() => {
    let cancelled = false

    async function fetchConnectionInfo() {
      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/supabase-oauth/status?projectId=${encodeURIComponent(projectId)}`
        )

        if (!response.ok) {
          console.error('Failed to fetch connection info')
          return
        }

        const data = (await response.json()) as SupabaseConnectionInfo
        if (!cancelled) {
          setConnectionInfo(data)
        }
      } catch (error) {
        console.error('Error fetching connection info:', error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchConnectionInfo()

    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleRefreshToken = async () => {
    if (!connectionInfo?.connected) return

    try {
      setIsRefreshing(true)
      const response = await fetch(
        `/api/supabase-oauth/status?projectId=${encodeURIComponent(projectId)}`
      )

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = (await response.json()) as SupabaseConnectionInfo
      setConnectionInfo(data)
      toast.success('Token refreshed successfully')
    } catch (error) {
      console.error('Error refreshing token:', error)
      toast.error('Failed to refresh token')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!connectionInfo?.connected) return

    if (!window.confirm('Are you sure you want to disconnect Supabase?')) {
      return
    }

    try {
      setIsDisconnecting(true)
      const response = await fetch('/api/supabase-oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setConnectionInfo(null)
      toast.success('Supabase disconnected')
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Failed to disconnect Supabase')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 border border-border rounded-lg bg-secondary/30">
        <p className="text-sm text-muted-foreground">Loading connection status...</p>
      </div>
    )
  }

  if (!connectionInfo?.connected) {
    return null
  }

  const expiresAt = connectionInfo.expiresAt
    ? new Date(connectionInfo.expiresAt)
    : null
  const isExpired = expiresAt ? expiresAt <= new Date() : false
  const expiresIn = expiresAt
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="p-4 border border-border rounded-lg bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900">
      <div className="flex items-start gap-3 mb-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
            Supabase Connected
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-200 mt-1">
            {connectionInfo.projectName || 'Project'}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference:</span>
          <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded">
            {connectionInfo.projectRef}
          </code>
        </div>

        {isExpired && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Token expired</span>
          </div>
        )}

        {expiresIn !== null && !isExpired && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}</span>
          </div>
        )}

        {connectionInfo.connectedAt && (
          <div className="text-xs text-muted-foreground">
            Connected: {new Date(connectionInfo.connectedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRefreshToken}
          disabled={isRefreshing || isDisconnecting}
          className="gap-2 flex-1"
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh Token</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={handleDisconnect}
          disabled={isDisconnecting || isRefreshing}
          className="gap-2"
        >
          {isDisconnecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Disconnecting...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Disconnect</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
