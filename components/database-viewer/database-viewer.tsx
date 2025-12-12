'use client'

import { useEffect, useState } from 'react'
import { Cloud, AlertCircle, Loader } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/panels/panels'
import { Button } from '@/components/ui/button'

interface DatabaseInfo {
  tableName: string
  rowCount: number
  columns: string[]
}

interface Props {
  className?: string
  projectId?: string
}

export function DatabaseViewer({ className, projectId }: Props) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enablingCloud, setEnablingCloud] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const fetchDatabases = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/projects/${projectId}/database`)
        if (!response.ok) {
          if (response.status === 404) {
            setDatabases([])
            setError(null)
            return
          }
          throw new Error('Failed to fetch database info')
        }

        const data = await response.json()
        setDatabases(data.tables || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setDatabases([])
      } finally {
        setLoading(false)
      }
    }

    fetchDatabases()
  }, [projectId])

  return (
    <Panel className={className}>
      <PanelHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          <span>Thinksoft Cloud</span>
        </div>
      </PanelHeader>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        ) : databases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-3">
            <Cloud className="w-8 h-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                No Supabase database created yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Click below to enable Supabase and provision a managed Postgres database with Thinksoft Cloud.
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
          <div className="space-y-3">
            {databases.map((db, idx) => (
              <div
                key={idx}
                className="border border-border rounded-lg p-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="font-mono text-xs font-semibold text-foreground mb-2">
                  {db.tableName}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Rows:</span> {db.rowCount}
                  </div>
                  <div>
                    <span className="font-medium">Columns:</span>{' '}
                    {db.columns.length}
                  </div>
                  {db.columns.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Fields:</div>
                      <div className="pl-2 space-y-0.5">
                        {db.columns.map((col) => (
                          <div key={col} className="text-muted-foreground/70">
                            • {col}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}
