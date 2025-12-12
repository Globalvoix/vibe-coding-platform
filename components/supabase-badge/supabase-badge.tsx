'use client'

import { useEffect, useState } from 'react'
import { Database, CheckCircle2, Loader } from 'lucide-react'

interface Props {
  projectId?: string
  className?: string
}

interface ConnectionStatus {
  connected: boolean
  projectName?: string
  projectRef?: string
}

export function SupabaseBadge({ projectId, className }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const fetchStatus = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/supabase-connect/status?projectId=${projectId}`
        )
        if (response.ok) {
          const data = (await response.json()) as ConnectionStatus
          setStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch Supabase status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [projectId])

  if (!status?.connected) {
    return null
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg ${className}`}
    >
      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      <div>
        <p className="text-xs font-semibold text-green-700 dark:text-green-400">
          Supabase Connected
        </p>
        {status.projectName && (
          <p className="text-xs text-green-600 dark:text-green-500">
            {status.projectName}
          </p>
        )}
      </div>
    </div>
  )
}
