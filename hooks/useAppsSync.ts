import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useAuth } from '@clerk/nextjs'

type App = Database['public']['Tables']['apps']['Row']

export function useAppsSync(limit?: number) {
  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { userId } = useAuth()

  useEffect(() => {
    if (!userId) {
      setApps([])
      setIsLoading(false)
      return
    }

    let isMounted = true

    const fetchApps = async () => {
      try {
        setIsLoading(true)
        let query = supabase
          .from('apps')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })

        if (limit) {
          query = query.limit(limit)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        if (isMounted) {
          setApps(data || [])
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch apps'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchApps()

    const subscription = supabase
      .channel(`apps-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apps',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMounted) return

          if (payload.eventType === 'INSERT') {
            setApps((prev) => [payload.new as App, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setApps((prev) =>
              prev.map((app) => (app.id === payload.new.id ? (payload.new as App) : app))
            )
          } else if (payload.eventType === 'DELETE') {
            setApps((prev) => prev.filter((app) => app.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [userId, limit])

  return { apps, isLoading, error }
}
