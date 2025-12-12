'use client'

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
  }, [projectId])

  const getSupabaseUrl = (path: string) => {
    if (!connection?.projectRef) return null
    const baseUrl = 'https://app.supabase.com'
    return `${baseUrl}${path}`
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
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Cloud className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No Supabase database connected yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Enable Supabase for this project to access managed Postgres database with real-time capabilities.
            </p>
            {projectId && (
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={enablingCloud}
                onClick={() => {
                  if (!projectId || enablingCloud) return
                  setEnablingCloud(true)
                  setError(null)

                  const startUrl = `/api/supabase/oauth/start?projectId=${encodeURIComponent(
                    projectId
                  )}`
                  window.location.href = startUrl
                }}
              >
                {enablingCloud ? 'Enabling…' : 'Enable Supabase'}
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
                  <span>Thinksoft</span>
                </div>
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
              <Button variant="ghost" size="sm" className="text-xs">
                <span className="inline-flex items-center gap-1">
                  <span>ℹ️</span>
                  Manage Organizations
                </span>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
