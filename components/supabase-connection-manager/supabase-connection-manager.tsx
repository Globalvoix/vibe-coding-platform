'use client'

/**
 * Supabase Connection Manager Component
 *
 * This component displays the connection status and management interface for Supabase projects.
 * It replaces the old DatabaseViewer to provide a more integrated experience similar to Lovable.
 *
 * Features:
 * - Display Supabase connection status with project information
 * - Quick links to Supabase features (Manage Users, SQL Editor, Edge Functions, Manage Secrets)
 * - Enable/Disable Supabase connection for the current project
 * - Manage Organizations link
 *
 * When Supabase is connected:
 * - AI can use the createRealtimeBackend tool to create tables, functions, and enable real-time subscriptions
 * - Frontend code can automatically subscribe to real-time database changes
 * - Backend functions can be created for complex business logic
 *
 * Integration:
 * - OAuth flow stores Supabase project reference (ref) for generating correct dashboard links
 * - Real-time schema management is handled through /api/projects/[id]/supabase-schema endpoint
 * - Connection status is fetched from /api/projects/[id]/supabase-connection endpoint
 */

import { useEffect, useState } from 'react'
import { Cloud, AlertCircle, Loader, ExternalLink, LogOut } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/panels/panels'
import { Button } from '@/components/ui/button'

interface SupabaseConnection {
  connected: boolean
  projectRef?: string
  projectName?: string
  orgId?: string
}

interface Props {
  className?: string
  projectId?: string
}

export function SupabaseConnectionManager({ className, projectId }: Props) {
  const [connection, setConnection] = useState<SupabaseConnection | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enablingCloud, setEnablingCloud] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const fetchConnection = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/supabase-connection`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch connection')
        }

        const data = (await response.json()) as SupabaseConnection
        setConnection(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setConnection(null)
      } finally {
        setLoading(false)
      }
    }

    fetchConnection()

    const pollInterval = setInterval(fetchConnection, 3000)

    return () => clearInterval(pollInterval)
  }, [projectId])

  const getSupabaseUrl = (path: string) => {
    if (!connection?.projectRef) return null
    const baseUrl = 'https://app.supabase.com'
    return `${baseUrl}${path}`
  }

  const handleDisconnect = async () => {
    if (!projectId || disconnecting) return

    setDisconnecting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/supabase-disconnect`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setConnection({ connected: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  const links = [
    {
      label: 'Manage Users',
      icon: '👥',
      path: `/project/${connection?.projectRef}/auth/users`,
    },
    {
      label: 'SQL Editor',
      icon: '📝',
      path: `/project/${connection?.projectRef}/sql`,
    },
    {
      label: 'Edge Functions',
      icon: '⚡',
      path: `/project/${connection?.projectRef}/functions`,
    },
    {
      label: 'Manage Secrets',
      icon: '🔐',
      path: `/project/${connection?.projectRef}/settings/secrets`,
    },
  ]

  if (loading) {
    return (
      <Panel className={className}>
        <PanelHeader className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <span>Thinksoft Cloud</span>
        </PanelHeader>
        <div className="flex items-center justify-center h-32">
          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Panel>
    )
  }

  return (
    <Panel className={className}>
      <PanelHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <span>Thinksoft Cloud</span>
        </div>
      </PanelHeader>

      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        ) : !connection?.connected ? (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-3">
            <Cloud className="w-8 h-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                No Supabase database connected yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Click below to connect your Supabase project and enable real-time database capabilities.
              </p>
            </div>
            {projectId && (
              <Button
                type="button"
                size="sm"
                className="mt-2"
                disabled={enablingCloud || loading}
                onClick={() => {
                  if (!projectId || enablingCloud || loading) return
                  setEnablingCloud(true)
                  setError(null)

                  const startUrl = `/api/supabase/oauth/start?projectId=${encodeURIComponent(
                    projectId
                  )}`
                  window.location.href = startUrl
                }}
              >
                {enablingCloud ? (
                  <>
                    <span className="inline-block w-3 h-3 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting to Supabase…
                  </>
                ) : (
                  'Enable Supabase'
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">Supabase</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-950/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    Connected
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Manage your Supabase project
              </p>
            </div>

            <div className="space-y-2">
              <div className="px-3 py-2 rounded-md bg-secondary/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span>🌱</span>
                  <span>{connection?.projectName || 'Supabase Project'}</span>
                </div>
                {connection?.projectRef && (
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    Ref: {connection.projectRef}
                  </div>
                )}
              </div>

              {links.map((link) => (
                <a
                  key={link.label}
                  href={
                    getSupabaseUrl(link.path)
                      ? getSupabaseUrl(link.path)!
                      : '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{link.icon}</span>
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {link.label}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (connection?.orgId) {
                    window.open(`https://app.supabase.com/account/organizations`, '_blank')
                  }
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <span>ℹ️</span>
                  Manage Organizations
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                disabled={disconnecting}
                onClick={handleDisconnect}
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
