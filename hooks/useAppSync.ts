import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useAppStore, App } from '@/lib/app-store'

interface AppDataFromApi {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface UseAppSyncReturn {
  isSyncing: boolean
  syncError: string | null
  lastSyncTime: number | null
  refreshApps: () => Promise<void>
}

const SYNC_INTERVAL_MS = 5000

export function useAppSync(): UseAppSyncReturn {
  const { isSignedIn } = useAuth()
  const { setApps } = useAppStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const refreshApps = async () => {
    if (!isSignedIn) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      const response = await fetch('/api/apps')

      if (!response.ok) {
        throw new Error('Failed to fetch apps')
      }

      const data = (await response.json()) as { apps: AppDataFromApi[] }

      if (!isMountedRef.current) return

      const mappedApps: App[] = data.apps.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ownerId: null,
        chatMessages: [],
        files: null,
      }))

      setApps(mappedApps)
      setLastSyncTime(Date.now())
      setSyncError(null)
    } catch (error) {
      if (!isMountedRef.current) return

      const errorMessage = error instanceof Error ? error.message : 'Network error'
      setSyncError(errorMessage)
      console.error('App sync error:', error)
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    if (!isSignedIn) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      return
    }

    const setupSync = async () => {
      await refreshApps()

      syncIntervalRef.current = setInterval(() => {
        void refreshApps()
      }, SYNC_INTERVAL_MS)
    }

    void setupSync()

    return () => {
      isMountedRef.current = false
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [isSignedIn, setApps])

  return {
    isSyncing,
    syncError,
    lastSyncTime,
    refreshApps,
  }
}
