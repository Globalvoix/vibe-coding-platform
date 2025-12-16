'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectVersion } from '@/lib/projects-db'

interface HistoryPanelProps {
  projectId: string | null | undefined
  onClose: () => void
  onVersionSelect: (version: ProjectVersion) => void
  onRevert: (version: ProjectVersion) => Promise<void>
  selectedVersionId?: string | null
  isLatestVersion?: boolean
}

export function HistoryPanel({
  projectId,
  onClose,
  onVersionSelect,
  onRevert,
  selectedVersionId,
  isLatestVersion = true,
}: HistoryPanelProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reverting, setReverting] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return

    const fetchVersions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/projects/${projectId}/versions`)
        if (!response.ok) {
          throw new Error('Failed to load versions')
        }
        const data = (await response.json()) as ProjectVersion[]
        setVersions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVersions()
  }, [projectId])

  const handleRevert = async (version: ProjectVersion) => {
    try {
      setReverting(version.id)
      await onRevert(version)
    } finally {
      setReverting(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) {
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
      const ampm = date.getHours() >= 12 ? 'PM' : 'AM'
      return `${timeStr} ${ampm}`
    } else if (isYesterday) {
      return 'Yesterday'
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Version History</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Close history"
          aria-label="Close history"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Loading versions...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center flex-1 text-destructive text-sm p-4 text-center">
          {error}
        </div>
      )}

      {!isLoading && !error && versions.length === 0 && (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm p-4 text-center">
          No versions yet. Changes will be saved as versions.
        </div>
      )}

      {!isLoading && !error && versions.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {isLatestVersion && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Latest</p>
            </div>
          )}

          <div className="space-y-1 p-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={cn(
                  'group relative px-3 py-3 rounded cursor-pointer transition-colors',
                  selectedVersionId === version.id
                    ? 'bg-blue-100 dark:bg-blue-950'
                    : 'hover:bg-secondary'
                )}
                onClick={() => onVersionSelect(version)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {version.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(version.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRevert(version)
                    }}
                    disabled={reverting === version.id}
                    className={cn(
                      'flex-shrink-0 p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100',
                      reverting === version.id
                        ? 'bg-secondary cursor-not-allowed'
                        : 'hover:bg-blue-600 hover:text-white'
                    )}
                    title="Revert to this version"
                    aria-label={`Revert to ${version.name}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
